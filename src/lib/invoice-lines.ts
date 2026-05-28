import type { InternalInvoiceLine } from "@/types/invoice";
import type { CakeOrder, OrderExtra } from "@/types/order";

function createLineId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

export function buildInvoiceLines(order: CakeOrder): InternalInvoiceLine[] {
  const cakeTotal =
    order.basePrice +
    order.fillingExtraPrice +
    order.coverExtraPrice +
    order.modelExtraPrice;
  const hasCake = cakeTotal > 0 && Boolean(order.portionsLabel || order.flavorName || order.modelName);
  const cakeDescription = [
    order.portionsLabel ? `Torta personalizada ${order.portionsLabel}` : "Torta personalizada",
    order.flavorName ? `sabor ${order.flavorName}` : "",
    order.fillingName ? `relleno ${order.fillingName}` : "",
    order.coverName ? `cobertura ${order.coverName}` : "",
    order.modelName ? `modelo ${order.modelName}` : "",
  ].filter(Boolean).join(", ");

  const extras: OrderExtra[] = order.extras ?? [];

  return [
    ...(hasCake
      ? [{
          id: createLineId("line", 0),
          description: cakeDescription,
          quantity: 1,
          unitPrice: cakeTotal,
          total: cakeTotal,
        }]
      : []),
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
