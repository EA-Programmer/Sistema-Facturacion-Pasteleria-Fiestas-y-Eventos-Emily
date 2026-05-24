"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSameOriginRequest } from "@/lib/action-security";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProformas, statusToPrisma } from "@/lib/proformas-db";
import { settingsId } from "@/lib/settings-db";
import {
  assertAllowedValue,
  assertSafeId,
  cleanText,
  failValidation,
  isPastDateInput,
  roundMoney,
} from "@/lib/validation";
import type { Proforma, ProformaItem, ProformaStatus } from "@/types/proforma";

const proformaStatuses = [
  "BORRADOR",
  "ENVIADA",
  "ACEPTADA",
  "RECHAZADA",
  "VENCIDA",
  "CONVERTIDA",
] as const satisfies readonly ProformaStatus[];

const itemTypes = ["TORTA", "PRODUCTO", "MANUAL"] as const;

function parseDateInput(value: string) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}

async function createNextProformaNumber() {
  const latest = await prisma.proforma.findFirst({
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const currentNumber = Number(latest?.number.replace(/\D/g, "") || "0");
  return `PRO-${String(currentNumber + 1).padStart(6, "0")}`;
}

async function refreshProformas() {
  revalidatePath("/proformas");
  revalidatePath("/");
  return getProformas();
}

function validateItem(item: ProformaItem, activeProductIds: Set<string>) {
  const type = assertAllowedValue(item.type, itemTypes, "El tipo de item");
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  const productId = item.productId ? assertSafeId(item.productId, "identificador del producto") : "";

  if (!Number.isInteger(quantity) || quantity <= 0) {
    failValidation("La cantidad de cada detalle debe ser un entero mayor a cero.");
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    failValidation("El precio unitario de cada detalle debe ser mayor o igual a cero.");
  }
  if (type === "PRODUCTO" && (!productId || !activeProductIds.has(productId))) {
    failValidation("Uno de los productos seleccionados no existe o esta inactivo.");
  }

  const cleanedQuantity = quantity;
  const cleanedUnitPrice = roundMoney(unitPrice);

  return {
    id: assertSafeId(item.id, "identificador del detalle"),
    productId: productId || null,
    type,
    name: cleanText(item.name, "El nombre del detalle", 160, true),
    description: cleanText(item.description, "La descripcion del detalle", 900),
    quantity: cleanedQuantity,
    unitPrice: cleanedUnitPrice,
    total: roundMoney(cleanedQuantity * cleanedUnitPrice),
    customization: item.customization && typeof item.customization === "object"
      ? (item.customization as Prisma.InputJsonObject)
      : undefined,
  };
}

export async function saveProforma(proforma: Proforma) {
  await requireSameOriginRequest();
  await requireAdminSession();

  const proformaId = assertSafeId(proforma.id, "identificador de la proforma");
  const customerId = assertSafeId(proforma.customerId, "identificador del cliente");
  const status = assertAllowedValue(proforma.status, proformaStatuses, "El estado de la proforma");

  if (!proforma.items.length) failValidation("Agrega al menos un producto o detalle a la proforma.");
  if (proforma.validUntil && isPastDateInput(proforma.validUntil)) {
    failValidation("La fecha de validez no puede ser anterior a hoy.");
  }

  const [customer, products, settings] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, active: true } }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true },
    }),
    prisma.businessSettings.findUnique({
      where: { id: settingsId },
      select: { taxRate: true },
    }),
  ]);

  if (!customer) failValidation("Selecciona un cliente activo para la proforma.");

  const activeProductIds = new Set(products.map((product) => product.id));
  const items = proforma.items.map((item) => validateItem(item, activeProductIds));
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0));
  const discount = roundMoney(Number(proforma.discount || 0));
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
    failValidation("El descuento no puede ser negativo ni mayor al subtotal.");
  }

  const taxRate = Number(settings?.taxRate ?? 15) / 100;
  const taxableBase = roundMoney(subtotal - discount);
  const tax = roundMoney(taxableBase * taxRate);
  const total = roundMoney(taxableBase + tax);

  const existing = await prisma.proforma.findUnique({
    where: { id: proformaId },
    select: { number: true },
  });
  const number = existing?.number ?? (proforma.number || (await createNextProformaNumber()));

  await prisma.$transaction(async (tx) => {
    await tx.proforma.upsert({
      where: { id: proformaId },
      update: {
        customerId,
        status: statusToPrisma[status],
        validUntil: parseDateInput(proforma.validUntil),
        deliveryDate: parseDateInput(proforma.deliveryDate),
        deliveryTime: cleanText(proforma.deliveryTime, "La hora de entrega", 20) || null,
        deliveryAddress: cleanText(proforma.deliveryAddress, "La direccion de entrega", 220) || null,
        notes: cleanText(proforma.notes, "Las notas de la proforma", 900) || null,
        terms: cleanText(proforma.terms, "Las condiciones de la proforma", 900) || null,
        subtotal,
        tax,
        discount,
        total,
      },
      create: {
        id: proformaId,
        number,
        customerId,
        status: statusToPrisma[status],
        validUntil: parseDateInput(proforma.validUntil),
        deliveryDate: parseDateInput(proforma.deliveryDate),
        deliveryTime: cleanText(proforma.deliveryTime, "La hora de entrega", 20) || null,
        deliveryAddress: cleanText(proforma.deliveryAddress, "La direccion de entrega", 220) || null,
        notes: cleanText(proforma.notes, "Las notas de la proforma", 900) || null,
        terms: cleanText(proforma.terms, "Las condiciones de la proforma", 900) || null,
        subtotal,
        tax,
        discount,
        total,
      },
    });

    await tx.proformaItem.deleteMany({ where: { proformaId } });
    await tx.proformaItem.createMany({
      data: items.map((item) => ({
        proformaId,
        productId: item.productId,
        type: item.type,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        customization: item.customization,
      })),
    });
  });

  return refreshProformas();
}

export async function deleteProforma(id: string) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const proformaId = assertSafeId(id, "identificador de la proforma");

  try {
    await prisma.proforma.delete({ where: { id: proformaId } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")) {
      throw error;
    }
  }

  return refreshProformas();
}

export async function updateProformaStatus(id: string, status: ProformaStatus) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const proformaId = assertSafeId(id, "identificador de la proforma");
  const nextStatus = assertAllowedValue(status, proformaStatuses, "El estado de la proforma");

  await prisma.proforma.update({
    where: { id: proformaId },
    data: { status: statusToPrisma[nextStatus] },
  });

  return refreshProformas();
}
