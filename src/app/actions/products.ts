"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { getGeneralProducts } from "@/lib/products-db";
import { prisma } from "@/lib/prisma";
import { failValidation, roundMoney } from "@/lib/validation";
import type { GeneralProduct } from "@/types/product-config";

function cleanProduct(product: GeneralProduct) {
  const name = product.name.trim();
  const description = product.description.trim();
  const basePrice = roundMoney(Number(product.basePrice));

  if (!name) failValidation("Ingresa el nombre del producto.");
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    failValidation("El precio del producto debe ser mayor o igual a cero.");
  }

  return {
    id: product.id,
    name,
    description: description || null,
    category: product.category,
    basePrice,
    pricingMode: "FIJO" as const,
    active: product.active,
  };
}

async function refreshProducts() {
  revalidatePath("/productos");
  revalidatePath("/pedidos");
  return getGeneralProducts();
}

export async function saveGeneralProduct(product: GeneralProduct) {
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
  await requireAdminSession();

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      await prisma.product.update({
        where: { id },
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
  await requireAdminSession();

  await prisma.product.update({
    where: { id },
    data: { active },
  });

  return refreshProducts();
}
