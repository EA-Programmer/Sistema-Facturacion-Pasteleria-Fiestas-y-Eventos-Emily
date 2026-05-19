import { prisma } from "@/lib/prisma";
import type { CakeCatalog } from "@/types/product-config";

export async function getCakeCatalog(): Promise<CakeCatalog> {
  const [portions, flavors, fillings, covers, models] = await Promise.all([
    prisma.cakePortion.findMany({ orderBy: { portions: "asc" } }),
    prisma.cakeFlavor.findMany({ orderBy: { name: "asc" } }),
    prisma.cakeFilling.findMany({ orderBy: { name: "asc" } }),
    prisma.cakeCover.findMany({ orderBy: { name: "asc" } }),
    prisma.cakeModel.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    portions: portions.map((item) => ({
      id: item.id,
      portions: item.portions,
      price: Number(item.price),
      active: item.active,
    })),
    flavors: flavors.map((item) => ({
      id: item.id,
      name: item.name,
      specialty: item.specialty,
      active: item.active,
    })),
    fillings: fillings.map((item) => ({
      id: item.id,
      name: item.name,
      extraPrice: Number(item.extraPrice),
      active: item.active,
    })),
    covers: covers.map((item) => ({
      id: item.id,
      name: item.name,
      extraPrice: Number(item.extraPrice),
      active: item.active,
    })),
    models: models.map((item) => ({
      id: item.id,
      name: item.name,
      customizable: item.customizable,
      extraPrice: Number(item.extraPrice),
      active: item.active,
    })),
  };
}
