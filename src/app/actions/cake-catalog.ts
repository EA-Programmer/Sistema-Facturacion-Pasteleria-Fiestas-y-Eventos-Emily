"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { initialCakeCatalog } from "@/lib/cake-catalog";
import { prisma } from "@/lib/prisma";
import { failValidation, roundMoney } from "@/lib/validation";
import type {
  CakeCatalog,
  CakeCover,
  CakeFilling,
  CakeFlavor,
  CakeModel,
  CakePortion,
} from "@/types/product-config";

type SectionKey = keyof CakeCatalog;

function ensureUnique(values: string[], label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key) failValidation(`${label} no puede quedar vacio.`);
    if (seen.has(key)) failValidation(`${label} no puede tener duplicados.`);
    seen.add(key);
  }
}

export async function replaceCakeCatalogSection<K extends SectionKey>(
  section: K,
  items: CakeCatalog[K],
) {
  await requireAdminSession();

  if (section === "portions") {
    const sectionItems = items as CakePortion[];
    if (!sectionItems.length) failValidation("Debe existir al menos una opcion de porciones.");
    ensureUnique(sectionItems.map((item) => String(item.portions)), "Las porciones");
    sectionItems.forEach((item) => {
      if (!Number.isInteger(item.portions) || item.portions <= 0) {
        failValidation("Las porciones deben ser numeros enteros mayores a cero.");
      }
      if (!Number.isFinite(item.price) || item.price < 0) {
        failValidation("El precio de las porciones no puede ser negativo.");
      }
    });
    await prisma.$transaction([
      prisma.cakePortion.deleteMany(),
      prisma.cakePortion.createMany({
        data: sectionItems.map((item) => ({
          id: item.id,
          portions: item.portions,
          price: roundMoney(item.price),
          active: item.active,
        })),
      }),
    ]);
  }

  if (section === "flavors") {
    const sectionItems = items as CakeFlavor[];
    if (!sectionItems.length) failValidation("Debe existir al menos un sabor.");
    ensureUnique(sectionItems.map((item) => item.name), "Los sabores");
    await prisma.$transaction([
      prisma.cakeFlavor.deleteMany(),
      prisma.cakeFlavor.createMany({
        data: sectionItems.map((item) => ({
          id: item.id,
          name: item.name.trim(),
          specialty: Boolean(item.specialty),
          active: item.active,
        })),
      }),
    ]);
  }

  if (section === "fillings") {
    const sectionItems = items as CakeFilling[];
    if (!sectionItems.length) failValidation("Debe existir al menos un relleno.");
    ensureUnique(sectionItems.map((item) => item.name), "Los rellenos");
    sectionItems.forEach((item) => {
      if (!Number.isFinite(item.extraPrice) || item.extraPrice < 0) {
        failValidation("El extra de relleno no puede ser negativo.");
      }
    });
    await prisma.$transaction([
      prisma.cakeFilling.deleteMany(),
      prisma.cakeFilling.createMany({
        data: sectionItems.map((item) => ({
          id: item.id,
          name: item.name.trim(),
          extraPrice: roundMoney(item.extraPrice),
          active: item.active,
        })),
      }),
    ]);
  }

  if (section === "covers") {
    const sectionItems = items as CakeCover[];
    if (!sectionItems.length) failValidation("Debe existir al menos una cobertura.");
    ensureUnique(sectionItems.map((item) => item.name), "Las coberturas");
    sectionItems.forEach((item) => {
      if (!Number.isFinite(item.extraPrice) || item.extraPrice < 0) {
        failValidation("El extra de cobertura no puede ser negativo.");
      }
    });
    await prisma.$transaction([
      prisma.cakeCover.deleteMany(),
      prisma.cakeCover.createMany({
        data: sectionItems.map((item) => ({
          id: item.id,
          name: item.name.trim(),
          extraPrice: roundMoney(item.extraPrice),
          active: item.active,
        })),
      }),
    ]);
  }

  if (section === "models") {
    const sectionItems = items as CakeModel[];
    if (!sectionItems.length) failValidation("Debe existir al menos un modelo.");
    ensureUnique(sectionItems.map((item) => item.name), "Los modelos");
    sectionItems.forEach((item) => {
      if (!Number.isFinite(item.extraPrice) || item.extraPrice < 0) {
        failValidation("El extra de modelo no puede ser negativo.");
      }
    });
    await prisma.$transaction([
      prisma.cakeModel.deleteMany(),
      prisma.cakeModel.createMany({
        data: sectionItems.map((item) => ({
          id: item.id,
          name: item.name.trim(),
          customizable: true,
          extraPrice: roundMoney(item.extraPrice),
          active: item.active,
        })),
      }),
    ]);
  }

  revalidatePath("/productos");
}

export async function resetCakeCatalog() {
  await requireAdminSession();

  await prisma.$transaction([
    prisma.cakePortion.deleteMany(),
    prisma.cakeFlavor.deleteMany(),
    prisma.cakeFilling.deleteMany(),
    prisma.cakeCover.deleteMany(),
    prisma.cakeModel.deleteMany(),
    prisma.cakePortion.createMany({ data: initialCakeCatalog.portions }),
    prisma.cakeFlavor.createMany({
      data: initialCakeCatalog.flavors.map((item) => ({
        ...item,
        specialty: Boolean(item.specialty),
      })),
    }),
    prisma.cakeFilling.createMany({ data: initialCakeCatalog.fillings }),
    prisma.cakeCover.createMany({ data: initialCakeCatalog.covers }),
    prisma.cakeModel.createMany({ data: initialCakeCatalog.models }),
  ]);

  revalidatePath("/productos");
  return initialCakeCatalog;
}
