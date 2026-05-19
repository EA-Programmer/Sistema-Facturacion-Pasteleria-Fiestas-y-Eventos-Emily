export type CakeOrderStatus =
  | "BORRADOR"
  | "CONFIRMADO"
  | "EN_PRODUCCION"
  | "LISTO"
  | "ENTREGADO"
  | "CANCELADO";

export type OrderExtra = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type GeneralOrderItem = {
  id: string;
  productId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type CakeOrder = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerEmail: string;
  status: CakeOrderStatus;
  deliveryDate: string;
  deliveryTime: string;
  portionsId: string;
  portionsLabel: string;
  basePrice: number;
  flavorId: string;
  flavorName: string;
  fillingId: string;
  fillingName: string;
  fillingExtraPrice: number;
  coverId: string;
  coverName: string;
  coverExtraPrice: number;
  modelId: string;
  modelName: string;
  modelExtraPrice: number;
  dedication: string;
  referenceImageNote: string;
  deliveryAddress: string;
  notes: string;
  extras: OrderExtra[];
  productItems: GeneralOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
};

export type CakeOrderForm = {
  customerId: string;
  status: CakeOrderStatus;
  deliveryDate: string;
  deliveryTime: string;
  portionsId: string;
  flavorId: string;
  fillingId: string;
  coverId: string;
  modelId: string;
  dedication: string;
  referenceImageNote: string;
  deliveryAddress: string;
  notes: string;
  extras: OrderExtra[];
  productItems: GeneralOrderItem[];
};
