import { prisma } from "@/lib/prisma";
import type { CakeOrder, GeneralOrderItem, OrderExtra } from "@/types/order";

type CakeCustomization = {
  portionsId?: string;
  portionsLabel?: string;
  basePrice?: number;
  flavorId?: string;
  flavorName?: string;
  fillingId?: string;
  fillingName?: string;
  fillingExtraPrice?: number;
  coverId?: string;
  coverName?: string;
  coverExtraPrice?: number;
  modelId?: string;
  modelName?: string;
  modelExtraPrice?: number;
  extras?: OrderExtra[];
};

function asCustomization(value: unknown): CakeCustomization {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as CakeCustomization;
}

function toDateInput(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export async function getCakeOrders(): Promise<CakeOrder[]> {
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => {
    const item = order.items.find((orderItem) => !orderItem.productId) ?? order.items[0];
    const customization = asCustomization(item?.customization);

    return {
      id: order.id,
      code: order.code,
      customerId: order.customerId,
      customerName: order.customer.name,
      customerDocument: order.customer.document,
      customerEmail: order.customer.email ?? "",
      status: order.status,
      deliveryDate: toDateInput(order.deliveryDate),
      deliveryTime: order.deliveryTime ?? "",
      portionsId: customization.portionsId ?? "",
      portionsLabel: customization.portionsLabel ?? "",
      basePrice: customization.basePrice ?? Number(item?.unitPrice ?? order.subtotal),
      flavorId: customization.flavorId ?? "",
      flavorName: customization.flavorName ?? "",
      fillingId: customization.fillingId ?? "",
      fillingName: customization.fillingName ?? "",
      fillingExtraPrice: customization.fillingExtraPrice ?? 0,
      coverId: customization.coverId ?? "",
      coverName: customization.coverName ?? "",
      coverExtraPrice: customization.coverExtraPrice ?? 0,
      modelId: customization.modelId ?? "",
      modelName: customization.modelName ?? "",
      modelExtraPrice: customization.modelExtraPrice ?? 0,
      dedication: order.dedication ?? "",
      referenceImageNote: order.referenceImageNote ?? "",
      deliveryAddress: order.deliveryAddress ?? "",
      notes: order.notes ?? "",
      extras: customization.extras ?? [],
      productItems: order.items
        .filter((orderItem) => orderItem.productId)
        .map<GeneralOrderItem>((orderItem) => ({
          id: orderItem.id,
          productId: orderItem.productId ?? "",
          name: orderItem.name,
          category: orderItem.product?.category ?? "",
          quantity: orderItem.quantity,
          unitPrice: Number(orderItem.unitPrice),
          total: Number(orderItem.total),
        })),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
    };
  });
}
