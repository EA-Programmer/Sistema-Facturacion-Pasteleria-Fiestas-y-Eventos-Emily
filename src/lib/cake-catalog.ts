import type { CakeCatalog } from "@/types/product-config";

export const initialCakeCatalog: CakeCatalog = {
  portions: [
    { id: "portion-5", portions: 5, price: 10, active: true },
    { id: "portion-10", portions: 10, price: 15, active: true },
    { id: "portion-15", portions: 15, price: 20, active: true },
    { id: "portion-20", portions: 20, price: 25, active: true },
    { id: "portion-25", portions: 25, price: 30, active: true },
  ],
  flavors: [
    { id: "flavor-vainilla", name: "Vainilla", active: true },
    { id: "flavor-chocolate", name: "Chocolate", active: true },
    { id: "flavor-mixta", name: "Mixta", active: true },
    { id: "flavor-zanahoria", name: "Zanahoria", active: true },
    { id: "flavor-oreo", name: "Oreo", active: true },
    { id: "flavor-frutos-secos", name: "Frutos secos", specialty: true, active: true },
  ],
  fillings: [
    { id: "filling-manjar", name: "Manjar", extraPrice: 0, active: true },
    { id: "filling-avellana", name: "Crema de avellana", extraPrice: 2, active: true },
    { id: "filling-crema-pastelera", name: "Crema pastelera", extraPrice: 1.5, active: true },
    { id: "filling-mermelada", name: "Mermelada de frutas", extraPrice: 1.5, active: true },
  ],
  covers: [
    { id: "cover-chantilly", name: "Chantilly", extraPrice: 0, active: true },
    { id: "cover-mantequilla", name: "Mantequilla", extraPrice: 2, active: true },
  ],
  models: [
    { id: "model-personalizado", name: "Modelo personalizado", customizable: true, extraPrice: 0, active: true },
    { id: "model-tematico", name: "Modelo tematico", customizable: true, extraPrice: 5, active: true },
    { id: "model-evento", name: "Modelo para eventos", customizable: true, extraPrice: 8, active: true },
  ],
};
