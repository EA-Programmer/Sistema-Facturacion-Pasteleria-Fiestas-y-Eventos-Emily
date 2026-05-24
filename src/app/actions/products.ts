"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSameOriginRequest } from "@/lib/action-security";
import { requireAdminSession } from "@/lib/auth";
import { getGeneralProducts } from "@/lib/products-db";
import { prisma } from "@/lib/prisma";
import { assertAllowedValue, assertBooleanValue, assertSafeId, cleanText, failValidation, roundMoney } from "@/lib/validation";
import type { GeneralProduct, GeneralProductCategory } from "@/types/product-config";

const productCategories = [
  "BOCADITOS_SAL",
  "BOCADITOS_DULCE",
  "CUPCAKES",
  "GALLETAS",
  "POSTRES",
  "VELAS",
  "EXTRAS",
] as const satisfies readonly GeneralProductCategory[];

function cleanProduct(product: GeneralProduct) {
  const name = cleanText(product.name, "El nombre del producto", 120, true);
  const description = cleanText(product.description, "La descripcion del producto", 500);
  const basePrice = roundMoney(Number(product.basePrice));
  const category = assertAllowedValue(product.category, productCategories, "La categoria del producto");

  if (!name) failValidation("Ingresa el nombre del producto.");
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    failValidation("El precio del producto debe ser mayor o igual a cero.");
  }

  return {
    id: assertSafeId(product.id, "identificador del producto"),
    name,
    description: description || null,
    category,
    basePrice,
    pricingMode: "FIJO" as const,
    active: assertBooleanValue(product.active, "El estado del producto"),
  };
}

async function refreshProducts() {
  revalidatePath("/productos");
  revalidatePath("/pedidos");
  return getGeneralProducts();
}

export async function saveGeneralProduct(product: GeneralProduct) {
  await requireSameOriginRequest();
  await requireAdminSession();

  const payload = cleanProduct(product);
  const duplicated = await prisma.product.findFirst({
    where: {
      id: { not: payload.id },
      name: { equals: payload.name, mode: "insensitive" },
      category: payload.category,
    },
    select: { id: true },
  });

  if (duplicated) {
    failValidation("Ya existe un producto con ese nombre en la misma categoria.");
  }

  await prisma.product.upsert({
    where: { id: payload.id },
    update: payload,
    create: payload,
  });

  return refreshProducts();
}

export async function deleteGeneralProduct(id: string) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const productId = assertSafeId(id, "identificador del producto");

  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      await prisma.product.update({
        where: { id: productId },
        data: { active: false },
      });
    } else if (
      !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
    ) {
      throw error;
    }
  }

  return refreshProducts();
}

export async function toggleGeneralProductStatus(id: string, active: boolean) {
  await requireSameOriginRequest();
  await requireAdminSession();
  const productId = assertSafeId(id, "identificador del producto");
  const nextActive = assertBooleanValue(active, "El estado del producto");

  await prisma.product.update({
    where: { id: productId },
    data: { active: nextActive },
  });

  return refreshProducts();
}
