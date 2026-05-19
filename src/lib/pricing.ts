export type CakeCustomization = {
  portions: 5 | 10 | 15 | 20 | 25;
  filling?: "manjar" | "crema_avellana" | "crema_pastelera" | "mermelada_frutas";
  cover?: "chantilly" | "mantequilla";
  themeLevel?: "simple" | "media" | "premium";
  extras?: Array<{ name: string; price: number; quantity: number }>;
};

const portionSurcharges: Record<CakeCustomization["portions"], number> = {
  5: 0,
  10: 5,
  15: 10,
  20: 15,
  25: 20,
};

const fillingSurcharges: Record<NonNullable<CakeCustomization["filling"]>, number> = {
  manjar: 0,
  crema_avellana: 2,
  crema_pastelera: 1.5,
  mermelada_frutas: 1.5,
};

const coverSurcharges: Record<NonNullable<CakeCustomization["cover"]>, number> = {
  chantilly: 0,
  mantequilla: 2,
};

const themeSurcharges: Record<NonNullable<CakeCustomization["themeLevel"]>, number> = {
  simple: 0,
  media: 8,
  premium: 18,
};

export function calculateCakePrice(basePrice: number, customization: CakeCustomization) {
  const extrasTotal =
    customization.extras?.reduce((total, extra) => total + extra.price * extra.quantity, 0) ?? 0;

  return (
    basePrice +
    portionSurcharges[customization.portions] +
    fillingSurcharges[customization.filling ?? "manjar"] +
    coverSurcharges[customization.cover ?? "chantilly"] +
    themeSurcharges[customization.themeLevel ?? "simple"] +
    extrasTotal
  );
}
