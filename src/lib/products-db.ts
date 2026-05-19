import { prisma } from "@/lib/prisma";
import type { GeneralProduct, GeneralProductCategory } from "@/types/product-config";

const generalProductCategories = [
  "BOCADITOS_SAL",
  "BOCADITOS_DULCE",
  "CUPCAKES",
  "GALLETAS",
  "POSTRES",
  "VELAS",
  "EXTRAS",
] as const;

export async function getGeneralProducts(): Promise<GeneralProduct[]> {
  const products = await prisma.product.findMany({
    where: {
      category: { in: [...generalProductCategories] },
    },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
  });

  return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      category: product.category as GeneralProductCategory,
    basePrice: Number(product.basePrice),
    active: product.active,
  }));
}
