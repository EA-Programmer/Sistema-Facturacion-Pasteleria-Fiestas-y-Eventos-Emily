"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { getCakeOrders } from "@/lib/orders-db";
import { prisma } from "@/lib/prisma";
import { settingsId } from "@/lib/settings-db";
import { failValidation, isPastDateInput, roundMoney } from "@/lib/validation";
import type { CakeOrder, CakeOrderStatus } from "@/types/order";

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

export async function saveOrder(order: CakeOrder) {
  await requireAdminSession();

  if (!order.customerId) failValidation("Selecciona un cliente para el pedido.");
  if (!order.deliveryDate) failValidation("Selecciona la fecha de entrega.");
  if (isPastDateInput(order.deliveryDate)) failValidation("La fecha de entrega no puede ser anterior a hoy.");

  const [customer, portion, flavor, filling, cover, model, settings] = await Promise.all([
    prisma.customer.findFirst({ where: { id: order.customerId, active: true } }),
    prisma.cakePortion.findFirst({ where: { id: order.portionsId, active: true } }),
    prisma.cakeFlavor.findFirst({ where: { id: order.flavorId, active: true } }),
    prisma.cakeFilling.findFirst({ where: { id: order.fillingId, active: true } }),
    prisma.cakeCover.findFirst({ where: { id: order.coverId, active: true } }),
    prisma.cakeModel.findFirst({ where: { id: order.modelId, active: true } }),
    prisma.businessSettings.findUnique({
      where: { id: settingsId },
      select: { taxRate: true },
    }),
  ]);

  if (!customer) failValidation("El cliente seleccionado no existe o esta inactivo.");
  if (!portion) failValidation("Selecciona una porcion activa del catalogo.");
  if (!flavor) failValidation("Selecciona un sabor activo del catalogo.");
  if (!filling) failValidation("Selecciona un relleno activo del catalogo.");
  if (!cover) failValidation("Selecciona una cobertura activa del catalogo.");
  if (!model) failValidation("Selecciona un modelo activo del catalogo.");

  const extras = order.extras.map((extra) => {
    const name = extra.name.trim();
    const price = Number(extra.price);
    const quantity = Number(extra.quantity);

    if (!name) failValidation("Cada extra debe tener nombre.");
    if (!Number.isFinite(price) || price < 0) failValidation("El precio de cada extra debe ser mayor o igual a cero.");
    if (!Number.isInteger(quantity) || quantity <= 0) failValidation("La cantidad de cada extra debe ser un numero entero mayor a cero.");

    return {
      id: extra.id,
      name,
      price: roundMoney(price),
      quantity,
    };
  });

  const productIds = order.productItems.map((item) => item.productId).filter(Boolean);
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
      id: item.id,
      productId: product.id,
      name: product.name,
      category: product.category,
      quantity,
      unitPrice,
      total: roundMoney(unitPrice * quantity),
    };
  });

  const extrasTotal = extras.reduce((total, extra) => total + extra.price * extra.quantity, 0);
  const productsTotal = productItems.reduce((total, item) => total + item.total, 0);
  const subtotal = roundMoney(
    Number(portion.price) +
      Number(filling.extraPrice) +
      Number(cover.extraPrice) +
      Number(model.extraPrice) +
      extrasTotal +
      productsTotal,
  );
  const taxRate = Number(settings?.taxRate ?? 15) / 100;
  const tax = roundMoney(subtotal * taxRate);
  const total = roundMoney(subtotal + tax);

  const payload: CakeOrder = {
    ...order,
    customerId: customer.id,
    customerName: customer.name,
    customerDocument: customer.document,
    customerEmail: customer.email ?? "",
    portionsId: portion.id,
    portionsLabel: `${portion.portions} porciones`,
    basePrice: Number(portion.price),
    flavorId: flavor.id,
    flavorName: flavor.name,
    fillingId: filling.id,
    fillingName: filling.name,
    fillingExtraPrice: Number(filling.extraPrice),
    coverId: cover.id,
    coverName: cover.name,
    coverExtraPrice: Number(cover.extraPrice),
    modelId: model.id,
    modelName: model.name,
    modelExtraPrice: Number(model.extraPrice),
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
        deliveryAddress: payload.deliveryAddress.trim() || null,
        dedication: payload.dedication.trim() || null,
        referenceImageNote: payload.referenceImageNote.trim() || null,
        notes: payload.notes.trim() || null,
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
        deliveryAddress: payload.deliveryAddress.trim() || null,
        dedication: payload.dedication.trim() || null,
        referenceImageNote: payload.referenceImageNote.trim() || null,
        notes: payload.notes.trim() || null,
        subtotal: payload.subtotal,
        tax: payload.tax,
        total: payload.total,
      },
    });

    await tx.orderItem.deleteMany({ where: { orderId: payload.id } });
    await tx.orderItem.create({
      data: {
        orderId: payload.id,
        name: "Torta personalizada",
        quantity: 1,
        unitPrice: payload.subtotal,
        total: payload.subtotal,
        customization: buildCustomization(payload),
      },
    });

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
  await requireAdminSession();

  try {
    await prisma.order.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      await prisma.order.update({
        where: { id },
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
  await requireAdminSession();

  await prisma.order.update({
    where: { id },
    data: { status },
  });

  return refreshOrders();
}
