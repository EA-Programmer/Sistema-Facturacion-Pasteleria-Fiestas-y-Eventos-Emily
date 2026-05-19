"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { initialCustomers } from "@/lib/customers-catalog";
import { getBillingCustomers } from "@/lib/customers-db";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import {
  failValidation,
  normalizeCustomerDocument,
  validateCustomerFields,
} from "@/lib/validation";
import type { BillingCustomer } from "@/types/customer";

function cleanCustomer(customer: BillingCustomer) {
  validateCustomerFields(customer);

  return {
    id: customer.id,
    name: customer.name.trim(),
    documentType: customer.documentType,
    document: normalizeCustomerDocument(customer.documentType, customer.document),
    email: customer.email.trim() || null,
    phone: customer.phone.trim() || null,
    address: customer.address.trim() || null,
    city: customer.city.trim() || null,
    province: customer.province.trim() || null,
    notes: customer.notes.trim() || null,
    active: customer.active,
  };
}

async function refreshCustomers() {
  revalidatePath("/clientes");
  revalidatePath("/pedidos");
  revalidatePath("/facturas");
  return getBillingCustomers();
}

export async function saveCustomer(customer: BillingCustomer) {
  await requireAdminSession();

  const payload = cleanCustomer(customer);
  const duplicatedDocument = await prisma.customer.findFirst({
    where: {
      documentType: payload.documentType,
      document: payload.document,
      id: { not: payload.id },
    },
    select: { id: true },
  });

  if (duplicatedDocument) {
    failValidation("Ya existe un cliente con ese tipo y numero de identificacion.");
  }

  await prisma.customer.upsert({
    where: { id: payload.id },
    update: payload,
    create: payload,
  });

  return refreshCustomers();
}

export async function deleteCustomer(id: string) {
  await requireAdminSession();

  try {
    await prisma.customer.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      await prisma.customer.update({
        where: { id },
        data: { active: false },
      });
    } else if (
      !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
    ) {
      throw error;
    }
  }

  return refreshCustomers();
}

export async function toggleCustomerStatus(id: string, active: boolean) {
  await requireAdminSession();

  await prisma.customer.update({
    where: { id },
    data: { active },
  });

  return refreshCustomers();
}

export async function resetCustomers() {
  await requireAdminSession();

  const initialIds = initialCustomers.map((customer) => customer.id);

  await prisma.customer.deleteMany({
    where: {
      id: { notIn: initialIds },
      invoices: { none: {} },
      orders: { none: {} },
    },
  });

  await prisma.customer.updateMany({
    where: {
      id: { notIn: initialIds },
    },
    data: { active: false },
  });

  for (const customer of initialCustomers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: cleanCustomer(customer),
      create: cleanCustomer(customer),
    });
  }

  return refreshCustomers();
}
