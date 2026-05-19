export type CakePortion = {
  id: string;
  portions: number;
  price: number;
  active: boolean;
};

export type CakeFlavor = {
  id: string;
  name: string;
  specialty?: boolean;
  active: boolean;
};

export type CakeFilling = {
  id: string;
  name: string;
  extraPrice: number;
  active: boolean;
};

export type CakeCover = {
  id: string;
  name: string;
  extraPrice: number;
  active: boolean;
};

export type CakeModel = {
  id: string;
  name: string;
  customizable: boolean;
  extraPrice: number;
  active: boolean;
};

export type CakeCatalog = {
  portions: CakePortion[];
  flavors: CakeFlavor[];
  fillings: CakeFilling[];
  covers: CakeCover[];
  models: CakeModel[];
};

export type GeneralProductCategory =
  | "BOCADITOS_SAL"
  | "BOCADITOS_DULCE"
  | "CUPCAKES"
  | "GALLETAS"
  | "POSTRES"
  | "VELAS"
  | "EXTRAS";

export type GeneralProduct = {
  id: string;
  name: string;
  description: string;
  category: GeneralProductCategory;
  basePrice: number;
  active: boolean;
};
