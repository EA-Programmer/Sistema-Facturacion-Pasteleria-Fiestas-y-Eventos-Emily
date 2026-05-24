"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { initialCustomers } from "@/lib/customers-catalog";
import { getBillingCustomers } from "@/lib/customers-db";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/action-security";
import { requireAdminSession } from "@/lib/auth";
import {
  assertAllowedValue,
  assertBooleanValue,
  assertSafeId,
  cleanText,
  failValidation,
  normalizeCustomerDocument,
  validateCustomerFields,
} from "@/lib/validation";
import type { BillingCustomer } from "@/types/customer";

const customerDocumentTypes = ["CEDULA", "RUC", "PASAPORTE", "CONSUMIDOR_FINAL"] as const;

function cleanCustomer(customer: BillingCustomer) {
  const documentType = assertAllowedValue(customer.documentType, customerDocumentTypes, "El tipo de documento");
  const sanitizedCustomer = {
    ...customer,
    name: cleanText(customer.name, "El nombre del cliente", 160, true),
    email: cleanText(customer.email, "El correo del cliente", 160),
    phone: cleanText(customer.phone, "El telefono del cliente", 30),
    address: cleanText(customer.address, "La direccion del cliente", 220, documentType !== "CONSUMIDOR_FINAL"),
    city: cleanText(customer.city, "La ciudad del cliente", 80),
    province: cleanText(customer.province, "La provincia del cliente", 80),
    notes: cleanText(customer.notes, "Las notas del cliente", 500),
  };
  validateCustomerFields({ ...sanitizedCustomer, documentType });

  return {
    id: assertSafeId(customer.id, "identificador del cliente"),
    name: sanitizedCustomer.name,
    documentType,
    document: normalizeCustomerDocument(documentType, customer.document),
    email: sanitizedCustomer.email || null,
    phone: sanitizedCustomer.phone || null,
    address: sanitizedCustomer.address || null,
    city: sanitizedCustomer.city || null,
    province: sanitizedCustomer.province || null,
    notes: sanitizedCustomer.notes || null,
    active: assertBooleanValue(customer.active, "El estado del cliente"),
  };
}

async function refreshCustomers() {
  revalidatePath("/clientes");
  return getBillingCustomers();
}

export async function saveCustomer(customer: BillingCustomer) {
  await requireSameOriginRequest();
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
  await requireSameOriginRequest();
  await requireAdminSession();
  const customerId = assertSafeId(id, "identificador del cliente");

  try {
    await prisma.customer.delete({ where: { id: customerId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      await prisma.customer.update({
        where: { id: customerId },
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
  await requireSameOriginRequest();
  await requireAdminSession();
  const customerId = assertSafeId(id, "identificador del cliente");
  const nextActive = assertBooleanValue(active, "El estado del cliente");

  await prisma.customer.update({
    where: { id: customerId },
    data: { active: nextActive },
  });

  return refreshCustomers();
}

export async function resetCustomers() {
  await requireSameOriginRequest();
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
