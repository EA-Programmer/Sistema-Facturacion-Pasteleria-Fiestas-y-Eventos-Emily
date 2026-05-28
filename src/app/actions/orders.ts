"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSameOriginRequest } from "@/lib/action-security";
import { requireAdminSession } from "@/lib/auth";
import { getCakeOrders } from "@/lib/orders-db";
import { prisma } from "@/lib/prisma";
import { settingsId } from "@/lib/settings-db";
import { assertAllowedValue, assertSafeId, cleanText, failValidation, isPastDateInput, roundMoney } from "@/lib/validation";
import type { CakeOrder, CakeOrderStatus } from "@/types/order";

const orderStatuses = ["BORRADOR", "CONFIRMADO", "EN_PRODUCCION", "LISTO", "ENTREGADO", "CANCELADO"] as const satisfies readonly CakeOrderStatus[];

function parseDeliveryDate(value: string) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}

async function createNextOrderCode() {
  const latest = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const currentNumber = Number(latest?.code.replace(/\D/g, "") || "0");
  return `PED-${String(currentNumber + 1).padStart(4, "0")}`;
}

async function refreshOrders() {
  revalidatePath("/pedidos");
  revalidatePath("/facturas");
  revalidatePath("/");
  return getCakeOrders();
}

function buildCustomization(order: CakeOrder): Prisma.InputJsonObject {
  return {
    portionsId: order.portionsId,
    portionsLabel: order.portionsLabel,
    basePrice: order.basePrice,
    flavorId: order.flavorId,
    flavorName: order.flavorName,
    fillingId: order.fillingId,
    fillingName: order.fillingName,
    fillingExtraPrice: order.fillingExtraPrice,
    coverId: order.coverId,
    coverName: order.coverName,
    coverExtraPrice: order.coverExtraPrice,
    modelId: order.modelId,
    modelName: order.modelName,
    modelExtraPrice: order.modelExtraPrice,
    extras: order.extras.map((extra) => ({
      id: extra.id,
      name: extra.name,
      price: extra.price,
      quantity: extra.quantity,
    })),
  };
}

function hasCakeFields(order: CakeOrder) {
  return Boolean(
    order.portionsId ||
      order.flavorId ||
      order.fillingId ||
      order.coverId ||
      order.modelId,
  );
}

export async function saveOrder(order: CakeOrder) {
  await requireSameOriginRequest();
  await requireAdminSession();

  const orderId = assertSafeId(order.id, "identificador del pedido");
  const status = assertAllowedValue(order.status, orderStatuses, "El estado del pedido");
  const customerId = assertSafeId(order.customerId, "identificador del cliente");
  const hasCake = hasCakeFields(order);
  const portionsId = hasCake ? assertSafeId(order.portionsId, "identificador de porciones") : "";
  const flavorId = hasCake ? assertSafeId(order.flavorId, "identificador de sabor") : "";
  const fillingId = hasCake ? assertSafeId(order.fillingId, "identificador de relleno") : "";
  const coverId = hasCake ? assertSafeId(order.coverId, "identificador de cobertura") : "";
  const modelId = hasCake ? assertSafeId(order.modelId, "identificador de modelo") : "";

  if (!order.customerId) failValidation("Selecciona un cliente para el pedido.");
  if (!order.deliveryDate) failValidation("Selecciona la fecha de entrega.");
  if (isPastDateInput(order.deliveryDate)) failValidation("La fecha de entrega no puede ser anterior a hoy.");

  const [customer, portion, flavor, filling, cover, model, settings] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, active: true } }),
    hasCake ? prisma.cakePortion.findFirst({ where: { id: portionsId, active: true } }) : null,
    hasCake ? prisma.cakeFlavor.findFirst({ where: { id: flavorId, active: true } }) : null,
    hasCake ? prisma.cakeFilling.findFirst({ where: { id: fillingId, active: true } }) : null,
    hasCake ? prisma.cakeCover.findFirst({ where: { id: coverId, active: true } }) : null,
    hasCake ? prisma.cakeModel.findFirst({ where: { id: modelId, active: true } }) : null,
    prisma.businessSettings.findUnique({
      where: { id: settingsId },
      select: { taxRate: true },
    }),
  ]);

  if (!customer) failValidation("El cliente seleccionado no existe o esta inactivo.");
  if (hasCake && !portion) failValidation("Selecciona una porcion activa del catalogo.");
  if (hasCake && !flavor) failValidation("Selecciona un sabor activo del catalogo.");
  if (hasCake && !filling) failValidation("Selecciona un relleno activo del catalogo.");
  if (hasCake && !cover) failValidation("Selecciona una cobertura activa del catalogo.");
  if (hasCake && !model) failValidation("Selecciona un modelo activo del catalogo.");

  const extras = order.extras.map((extra) => {
    const name = cleanText(extra.name, "El nombre del extra", 120, true);
    const price = Number(extra.price);
    const quantity = Number(extra.quantity);

    if (!name) failValidation("Cada extra debe tener nombre.");
    if (!Number.isFinite(price) || price < 0) failValidation("El precio de cada extra debe ser mayor o igual a cero.");
    if (!Number.isInteger(quantity) || quantity <= 0) failValidation("La cantidad de cada extra debe ser un numero entero mayor a cero.");

    return {
      id: assertSafeId(extra.id, "identificador del extra"),
      name,
      price: roundMoney(price),
      quantity,
    };
  });

  const productIds = order.productItems.map((item) => item.productId).filter(Boolean);
  productIds.forEach((productId) => assertSafeId(productId, "identificador del producto"));
  const products = productIds.length
    ? await prisma.product.findMany({
        where: {
          id: { in: productIds },
          active: true,
        },
      })
    : [];
  const productsById = new Map(products.map((product) => [product.id, product]));

  const productItems = order.productItems.map((item) => {
    const product = productsById.get(item.productId);
    const quantity = Number(item.quantity);

    if (!product) failValidation("Uno de los productos agregados no existe o esta inactivo.");
    if (!Number.isInteger(quantity) || quantity <= 0) {
      failValidation("La cantidad de cada producto debe ser un entero mayor a cero.");
    }

    const unitPrice = roundMoney(Number(product.basePrice));
    return {
      id: assertSafeId(item.id, "identificador del item del pedido"),
      productId: product.id,
      name: product.name,
      category: product.category,
      quantity,
      unitPrice,
      total: roundMoney(unitPrice * quantity),
    };
  });

  const totalBocaditos = productItems
    .filter((item) => item.category === "BOCADITOS_SAL" || item.category === "BOCADITOS_DULCE")
    .reduce((sum, item) => sum + item.quantity, 0);

  if (totalBocaditos > 0 && totalBocaditos < 50) {
    failValidation(
      `El pedido mínimo de bocaditos es de 50 unidades en total. Actualmente has seleccionado ${totalBocaditos}.`
    );
  }

  const extrasTotal = extras.reduce((total, extra) => total + extra.price * extra.quantity, 0);
  const productsTotal = productItems.reduce((total, item) => total + item.total, 0);
  const cakeTotal = hasCake
    ? Number(portion?.price ?? 0) +
      Number(filling?.extraPrice ?? 0) +
      Number(cover?.extraPrice ?? 0) +
      Number(model?.extraPrice ?? 0)
    : 0;
  if (!hasCake && !extras.length && !productItems.length) {
    failValidation("Agrega una torta, un producto, un postre, bocaditos o un detalle adicional al pedido.");
  }

  const subtotal = roundMoney(
    cakeTotal +
      extrasTotal +
      productsTotal,
  );
  const taxRate = Number(settings?.taxRate ?? 15) / 100;
  const tax = roundMoney(subtotal * taxRate);
  const total = roundMoney(subtotal + tax);

  const payload: CakeOrder = {
    ...order,
    id: orderId,
    status,
    customerId: customer.id,
    customerName: customer.name,
    customerDocument: customer.document,
    customerEmail: customer.email ?? "",
    portionsId: portion?.id ?? "",
    portionsLabel: portion ? `${portion.portions} porciones` : "",
    basePrice: Number(portion?.price ?? 0),
    flavorId: flavor?.id ?? "",
    flavorName: flavor?.name ?? "",
    fillingId: filling?.id ?? "",
    fillingName: filling?.name ?? "",
    fillingExtraPrice: Number(filling?.extraPrice ?? 0),
    coverId: cover?.id ?? "",
    coverName: cover?.name ?? "",
    coverExtraPrice: Number(cover?.extraPrice ?? 0),
    modelId: model?.id ?? "",
    modelName: model?.name ?? "",
    modelExtraPrice: Number(model?.extraPrice ?? 0),
    deliveryTime: cleanText(order.deliveryTime, "La hora de entrega", 20),
    deliveryAddress: cleanText(order.deliveryAddress, "La direccion de entrega", 220),
    dedication: cleanText(order.dedication, "La dedicatoria", 160),
    referenceImageNote: cleanText(order.referenceImageNote, "La nota de referencia", 300),
    notes: cleanText(order.notes, "Las notas del pedido", 700),
    extras,
    productItems,
    subtotal,
    tax,
    total,
  };

  const existing = await prisma.order.findUnique({
    where: { id: payload.id },
    select: { code: true },
  });
  const code = existing?.code ?? (payload.code || (await createNextOrderCode()));

  await prisma.$transaction(async (tx) => {
    await tx.order.upsert({
      where: { id: payload.id },
      update: {
        code,
        customerId: payload.customerId,
        status: payload.status,
        deliveryDate: parseDeliveryDate(payload.deliveryDate),
        deliveryTime: payload.deliveryTime || null,
        deliveryAddress: payload.deliveryAddress || null,
        dedication: payload.dedication || null,
        referenceImageNote: payload.referenceImageNote || null,
        notes: payload.notes || null,
        subtotal: payload.subtotal,
        tax: payload.tax,
        total: payload.total,
      },
      create: {
        id: payload.id,
        code,
        customerId: payload.customerId,
        status: payload.status,
        deliveryDate: parseDeliveryDate(payload.deliveryDate),
        deliveryTime: payload.deliveryTime || null,
        deliveryAddress: payload.deliveryAddress || null,
        dedication: payload.dedication || null,
        referenceImageNote: payload.referenceImageNote || null,
        notes: payload.notes || null,
        subtotal: payload.subtotal,
        tax: payload.tax,
        total: payload.total,
      },
    });

    await tx.orderItem.deleteMany({ where: { orderId: payload.id } });
    if (hasCake || payload.extras.length) {
      await tx.orderItem.create({
        data: {
          orderId: payload.id,
          name: hasCake ? "Torta personalizada" : "Detalles adicionales",
          quantity: 1,
          unitPrice: roundMoney(cakeTotal + extrasTotal),
          total: roundMoney(cakeTotal + extrasTotal),
          customization: buildCustomization(payload),
        },
      });
    }

    if (payload.productItems.length) {
      await tx.orderItem.createMany({
        data: payload.productItems.map((item) => ({
          orderId: payload.id,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      });
    }
  });

  return refreshOrders();
}

export async function deleteOrder(id: string) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const orderId = assertSafeId(id, "identificador del pedido");

  try {
    await prisma.order.delete({ where: { id: orderId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELADO" },
      });
    } else if (
      !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
    ) {
      throw error;
    }
  }

  return refreshOrders();
}

export async function updateOrderStatus(id: string, status: CakeOrderStatus) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const orderId = assertSafeId(id, "identificador del pedido");
  const nextStatus = assertAllowedValue(status, orderStatuses, "El estado del pedido");

  await prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
  });

  return refreshOrders();
}
