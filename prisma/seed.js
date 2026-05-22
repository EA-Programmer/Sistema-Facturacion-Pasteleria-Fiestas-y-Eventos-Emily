const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@emily.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";
  const resetAdminPassword = process.env.RESET_ADMIN_PASSWORD === "true";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: resetAdminPassword
      ? {
          name: "Admin",
          passwordHash: hashPassword(adminPassword),
          role: "ADMIN",
        }
      : {
          name: "Admin",
          role: "ADMIN",
        },
    create: {
      name: "Admin",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "ADMIN",
    },
  });

  await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "Fiestas & Eventos Emily",
      tradeName: "Emily",
      ruc: "PENDIENTE",
      address: "Direccion pendiente",
      city: "",
      province: "",
      phone: "",
      email: "",
      logoPath: "/brand/logo-emily.png",
      establishmentCode: "001",
      emissionPointCode: "001",
      invoiceSequence: 1,
      taxRate: 15,
      currency: "USD",
      emailFromName: "Fiestas & Eventos Emily",
      emailFromAddress: "",
      emailReplyTo: "",
      sriEnvironment: "PRUEBAS",
      sriEnabled: false,
    },
  });

  const portions = [
    { portions: 5, price: 10 },
    { portions: 10, price: 15 },
    { portions: 15, price: 20 },
    { portions: 20, price: 25 },
    { portions: 25, price: 30 },
  ];

  for (const item of portions) {
    await prisma.cakePortion.upsert({
      where: { portions: item.portions },
      update: { price: item.price, active: true },
      create: { portions: item.portions, price: item.price, active: true },
    });
  }

  const flavors = [
    { name: "Vainilla", specialty: false },
    { name: "Chocolate", specialty: false },
    { name: "Mixta", specialty: false },
    { name: "Zanahoria", specialty: false },
    { name: "Oreo", specialty: false },
    { name: "Frutos secos", specialty: true },
  ];

  for (const item of flavors) {
    await prisma.cakeFlavor.upsert({
      where: { name: item.name },
      update: { specialty: item.specialty, active: true },
      create: { ...item, active: true },
    });
  }

  const fillings = [
    { name: "Manjar", extraPrice: 0 },
    { name: "Crema de avellana", extraPrice: 2 },
    { name: "Crema pastelera", extraPrice: 1.5 },
    { name: "Mermelada de frutas", extraPrice: 1.5 },
  ];

  for (const item of fillings) {
    await prisma.cakeFilling.upsert({
      where: { name: item.name },
      update: { extraPrice: item.extraPrice, active: true },
      create: { ...item, active: true },
    });
  }

  const covers = [
    { name: "Chantilly", extraPrice: 0 },
    { name: "Mantequilla", extraPrice: 2 },
  ];

  for (const item of covers) {
    await prisma.cakeCover.upsert({
      where: { name: item.name },
      update: { extraPrice: item.extraPrice, active: true },
      create: { ...item, active: true },
    });
  }

  const models = [
    { name: "Modelo personalizado", extraPrice: 0 },
    { name: "Modelo tematico", extraPrice: 5 },
    { name: "Modelo para eventos", extraPrice: 8 },
  ];

  for (const item of models) {
    await prisma.cakeModel.upsert({
      where: { name: item.name },
      update: { extraPrice: item.extraPrice, customizable: true, active: true },
      create: { ...item, customizable: true, active: true },
    });
  }

  await prisma.customer.upsert({
    where: { id: "customer-final" },
    update: {},
    create: {
      id: "customer-final",
      name: "Consumidor final",
      documentType: "CONSUMIDOR_FINAL",
      document: "9999999999999",
      address: "Sin direccion",
      notes: "Cliente generico para ventas sin datos de facturacion.",
      active: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
