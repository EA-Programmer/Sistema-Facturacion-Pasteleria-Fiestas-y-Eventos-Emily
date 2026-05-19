import type { InternalInvoiceLine } from "@/types/invoice";
import type { CakeOrder, OrderExtra } from "@/types/order";

function createLineId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

export function buildInvoiceLines(order: CakeOrder): InternalInvoiceLine[] {
  const cakeDescription = [
    `Torta personalizada ${order.portionsLabel}`,
    `sabor ${order.flavorName}`,
    `relleno ${order.fillingName}`,
    `cobertura ${order.coverName}`,
    `modelo ${order.modelName}`,
  ].join(", ");

  const cakeTotal =
    order.basePrice +
    order.fillingExtraPrice +
    order.coverExtraPrice +
    order.modelExtraPrice;

  const extras: OrderExtra[] = order.extras ?? [];

  return [
    {
      id: createLineId("line", 0),
      description: cakeDescription,
      quantity: 1,
      unitPrice: cakeTotal,
      total: cakeTotal,
    },
    ...extras.map((extra, index) => ({
      id: extra.id || createLineId("extra", index),
      description: extra.name,
      quantity: extra.quantity,
      unitPrice: extra.price,
      total: extra.price * extra.quantity,
    })),
    ...(order.productItems ?? []).map((item, index) => ({
      id: item.id || createLineId("product", index),
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
  ];
}
