"use server";

import { revalidatePath } from "next/cache";
import { requireSameOriginRequest } from "@/lib/action-security";
import { requireAdminSession } from "@/lib/auth";
import { initialCakeCatalog } from "@/lib/cake-catalog";
import { prisma } from "@/lib/prisma";
import { assertAllowedValue, assertBooleanValue, assertSafeId, cleanText, failValidation, roundMoney } from "@/lib/validation";
import type {
  CakeCatalog,
  CakeCover,
  CakeFilling,
  CakeFlavor,
  CakeModel,
  CakePortion,
} from "@/types/product-config";

type SectionKey = keyof CakeCatalog;
const sectionKeys = ["portions", "flavors", "fillings", "covers", "models"] as const satisfies readonly SectionKey[];

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
  await requireSameOriginRequest();
  await requireAdminSession();
  const safeSection = assertAllowedValue(section, sectionKeys, "La seccion del catalogo");
  if (!Array.isArray(items)) failValidation("Los items del catalogo no son validos.");

  if (safeSection === "portions") {
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
          id: assertSafeId(item.id, "identificador de la porcion"),
          portions: item.portions,
          price: roundMoney(item.price),
          active: assertBooleanValue(item.active, "El estado de la porcion"),
        })),
      }),
    ]);
  }

  if (safeSection === "flavors") {
    const sectionItems = items as CakeFlavor[];
    if (!sectionItems.length) failValidation("Debe existir al menos un sabor.");
    ensureUnique(sectionItems.map((item) => cleanText(item.name, "El nombre del sabor", 80, true)), "Los sabores");
    await prisma.$transaction([
      prisma.cakeFlavor.deleteMany(),
      prisma.cakeFlavor.createMany({
        data: sectionItems.map((item) => ({
          id: assertSafeId(item.id, "identificador del sabor"),
          name: cleanText(item.name, "El nombre del sabor", 80, true),
          specialty: Boolean(item.specialty),
          active: assertBooleanValue(item.active, "El estado del sabor"),
        })),
      }),
    ]);
  }

  if (safeSection === "fillings") {
    const sectionItems = items as CakeFilling[];
    if (!sectionItems.length) failValidation("Debe existir al menos un relleno.");
    ensureUnique(sectionItems.map((item) => cleanText(item.name, "El nombre del relleno", 80, true)), "Los rellenos");
    sectionItems.forEach((item) => {
      if (!Number.isFinite(item.extraPrice) || item.extraPrice < 0) {
        failValidation("El extra de relleno no puede ser negativo.");
      }
    });
    await prisma.$transaction([
      prisma.cakeFilling.deleteMany(),
      prisma.cakeFilling.createMany({
        data: sectionItems.map((item) => ({
          id: assertSafeId(item.id, "identificador del relleno"),
          name: cleanText(item.name, "El nombre del relleno", 80, true),
          extraPrice: roundMoney(item.extraPrice),
          active: assertBooleanValue(item.active, "El estado del relleno"),
        })),
      }),
    ]);
  }

  if (safeSection === "covers") {
    const sectionItems = items as CakeCover[];
    if (!sectionItems.length) failValidation("Debe existir al menos una cobertura.");
    ensureUnique(sectionItems.map((item) => cleanText(item.name, "El nombre de la cobertura", 80, true)), "Las coberturas");
    sectionItems.forEach((item) => {
      if (!Number.isFinite(item.extraPrice) || item.extraPrice < 0) {
        failValidation("El extra de cobertura no puede ser negativo.");
      }
    });
    await prisma.$transaction([
      prisma.cakeCover.deleteMany(),
      prisma.cakeCover.createMany({
        data: sectionItems.map((item) => ({
          id: assertSafeId(item.id, "identificador de la cobertura"),
          name: cleanText(item.name, "El nombre de la cobertura", 80, true),
          extraPrice: roundMoney(item.extraPrice),
          active: assertBooleanValue(item.active, "El estado de la cobertura"),
        })),
      }),
    ]);
  }

  if (safeSection === "models") {
    const sectionItems = items as CakeModel[];
    if (!sectionItems.length) failValidation("Debe existir al menos un modelo.");
    ensureUnique(sectionItems.map((item) => cleanText(item.name, "El nombre del modelo", 80, true)), "Los modelos");
    sectionItems.forEach((item) => {
      if (!Number.isFinite(item.extraPrice) || item.extraPrice < 0) {
        failValidation("El extra de modelo no puede ser negativo.");
      }
    });
    await prisma.$transaction([
      prisma.cakeModel.deleteMany(),
      prisma.cakeModel.createMany({
        data: sectionItems.map((item) => ({
          id: assertSafeId(item.id, "identificador del modelo"),
          name: cleanText(item.name, "El nombre del modelo", 80, true),
          customizable: true,
          extraPrice: roundMoney(item.extraPrice),
          active: assertBooleanValue(item.active, "El estado del modelo"),
        })),
      }),
    ]);
  }

  revalidatePath("/productos");
}

export async function resetCakeCatalog() {
  await requireSameOriginRequest();
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
