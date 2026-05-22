import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { DocumentType, Prisma } from "@prisma/client";

type SriInvoice = {
  id: string;
  number: string;
  subtotal: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  issuedAt: Date | null;
  createdAt: Date;
  customer: {
    name: string;
    documentType: DocumentType;
    document: string;
    address: string | null;
  };
  order: {
    items: Array<{
      id: string;
      productId: string | null;
      name: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      total: Prisma.Decimal;
      customization: Prisma.JsonValue | null;
    }>;
  };
};

type SriSettings = {
  businessName: string;
  tradeName: string | null;
  ruc: string;
  address: string;
  establishmentCode: string;
  emissionPointCode: string;
  sriEnvironment: string;
  taxRate: Prisma.Decimal;
};

type XmlLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type CakeCustomization = {
  portionsLabel?: string;
  flavorName?: string;
  fillingName?: string;
  fillingExtraPrice?: number;
  coverName?: string;
  coverExtraPrice?: number;
  modelName?: string;
  modelExtraPrice?: number;
  basePrice?: number;
  extras?: Array<{ name: string; price: number; quantity: number }>;
};

const xmlStorageRoot = path.join(process.cwd(), "storage", "sri", "xml");

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function money(value: number | Prisma.Decimal) {
  return Number(value).toFixed(2);
}

function dateParts(date: Date) {
  return {
    ddmmyyyy: [
      String(date.getDate()).padStart(2, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getFullYear()),
    ].join(""),
    sriDate: [
      String(date.getDate()).padStart(2, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getFullYear()),
    ].join("/"),
  };
}

function modulo11(value: string) {
  let factor = 2;
  let total = 0;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    total += Number(value[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const digit = 11 - (total % 11);
  if (digit === 11) return "0";
  if (digit === 10) return "1";
  return String(digit);
}

function numericCode(seed: string) {
  const hash = createHash("sha256").update(seed).digest("hex");
  const number = parseInt(hash.slice(0, 10), 16) % 100000000;
  return String(number).padStart(8, "0");
}

function accessKey(invoice: SriInvoice, settings: SriSettings) {
  const issuedAt = invoice.issuedAt ?? invoice.createdAt;
  const { ddmmyyyy } = dateParts(issuedAt);
  const environment = settings.sriEnvironment === "PRODUCCION" ? "2" : "1";
  const sequential = invoice.number.split("-")[2] ?? "1";
  const base = [
    ddmmyyyy,
    "01",
    settings.ruc.replace(/\D/g, "").padStart(13, "0").slice(0, 13),
    environment,
    settings.establishmentCode.padStart(3, "0").slice(0, 3),
    settings.emissionPointCode.padStart(3, "0").slice(0, 3),
    sequential.replace(/\D/g, "").padStart(9, "0").slice(0, 9),
    numericCode(invoice.id),
    "1",
  ].join("");

  return `${base}${modulo11(base)}`;
}

function buyerDocumentCode(type: DocumentType) {
  if (type === "RUC") return "04";
  if (type === "CEDULA") return "05";
  if (type === "PASAPORTE") return "06";
  return "07";
}

function ivaPercentageCode(taxRate: number) {
  if (taxRate === 0) return "0";
  if (taxRate === 12) return "2";
  if (taxRate === 15) return "4";
  throw new Error("El XML SRI solo tiene configurado IVA 0%, 12% o 15%.");
}

function asCustomization(value: Prisma.JsonValue | null): CakeCustomization {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as CakeCustomization;
}

function invoiceLines(invoice: SriInvoice): XmlLine[] {
  const cakeItem = invoice.order.items.find((item) => !item.productId);
  const customization = asCustomization(cakeItem?.customization ?? null);
  const extras = customization.extras ?? [];
  const cakeDescription = [
    `Torta personalizada ${customization.portionsLabel ?? ""}`.trim(),
    customization.flavorName ? `sabor ${customization.flavorName}` : "",
    customization.fillingName ? `relleno ${customization.fillingName}` : "",
    customization.coverName ? `cobertura ${customization.coverName}` : "",
    customization.modelName ? `modelo ${customization.modelName}` : "",
  ].filter(Boolean).join(", ");

  const cakeTotal =
    Number(customization.basePrice ?? 0) +
    Number(customization.fillingExtraPrice ?? 0) +
    Number(customization.coverExtraPrice ?? 0) +
    Number(customization.modelExtraPrice ?? 0);

  const lines: XmlLine[] = [];

  if (cakeTotal > 0) {
    lines.push({
      description: cakeDescription || cakeItem?.name || "Torta personalizada",
      quantity: 1,
      unitPrice: cakeTotal,
      total: cakeTotal,
    });
  }

  for (const extra of extras) {
    lines.push({
      description: extra.name,
      quantity: extra.quantity,
      unitPrice: extra.price,
      total: extra.price * extra.quantity,
    });
  }

  for (const item of invoice.order.items.filter((orderItem) => orderItem.productId)) {
    lines.push({
      description: item.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    });
  }

  return lines;
}

export function buildSriInvoiceXml(invoice: SriInvoice, settings: SriSettings) {
  const issuedAt = invoice.issuedAt ?? invoice.createdAt;
  const { sriDate } = dateParts(issuedAt);
  const sequential = invoice.number.split("-")[2] ?? "1";
  const environment = settings.sriEnvironment === "PRODUCCION" ? "2" : "1";
  const taxRate = Number(settings.taxRate);
  const codigoPorcentaje = ivaPercentageCode(taxRate);
  const claveAcceso = accessKey(invoice, settings);
  const lines = invoiceLines(invoice);

  if (!lines.length) {
    throw new Error("La factura no tiene detalles suficientes para generar XML SRI.");
  }

  const detailsXml = lines.map((line) => {
    const taxValue = line.total * (taxRate / 100);
    return [
      "    <detalle>",
      `      <codigoPrincipal>${escapeXml(line.description.slice(0, 25) || "ITEM")}</codigoPrincipal>`,
      `      <descripcion>${escapeXml(line.description)}</descripcion>`,
      `      <cantidad>${line.quantity.toFixed(2)}</cantidad>`,
      `      <precioUnitario>${money(line.unitPrice)}</precioUnitario>`,
      "      <descuento>0.00</descuento>",
      `      <precioTotalSinImpuesto>${money(line.total)}</precioTotalSinImpuesto>`,
      "      <impuestos>",
      "        <impuesto>",
      "          <codigo>2</codigo>",
      `          <codigoPorcentaje>${codigoPorcentaje}</codigoPorcentaje>`,
      `          <tarifa>${taxRate.toFixed(2)}</tarifa>`,
      `          <baseImponible>${money(line.total)}</baseImponible>`,
      `          <valor>${money(taxValue)}</valor>`,
      "        </impuesto>",
      "      </impuestos>",
      "    </detalle>",
    ].join("\n");
  }).join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<factura id="comprobante" version="1.1.0">',
    "  <infoTributaria>",
    `    <ambiente>${environment}</ambiente>`,
    "    <tipoEmision>1</tipoEmision>",
    `    <razonSocial>${escapeXml(settings.businessName)}</razonSocial>`,
    settings.tradeName ? `    <nombreComercial>${escapeXml(settings.tradeName)}</nombreComercial>` : "",
    `    <ruc>${escapeXml(settings.ruc)}</ruc>`,
    `    <claveAcceso>${claveAcceso}</claveAcceso>`,
    "    <codDoc>01</codDoc>",
    `    <estab>${escapeXml(settings.establishmentCode)}</estab>`,
    `    <ptoEmi>${escapeXml(settings.emissionPointCode)}</ptoEmi>`,
    `    <secuencial>${escapeXml(sequential)}</secuencial>`,
    `    <dirMatriz>${escapeXml(settings.address)}</dirMatriz>`,
    "  </infoTributaria>",
    "  <infoFactura>",
    `    <fechaEmision>${sriDate}</fechaEmision>`,
    `    <dirEstablecimiento>${escapeXml(settings.address)}</dirEstablecimiento>`,
    "    <obligadoContabilidad>NO</obligadoContabilidad>",
    `    <tipoIdentificacionComprador>${buyerDocumentCode(invoice.customer.documentType)}</tipoIdentificacionComprador>`,
    `    <razonSocialComprador>${escapeXml(invoice.customer.name)}</razonSocialComprador>`,
    `    <identificacionComprador>${escapeXml(invoice.customer.document)}</identificacionComprador>`,
    invoice.customer.address ? `    <direccionComprador>${escapeXml(invoice.customer.address)}</direccionComprador>` : "",
    `    <totalSinImpuestos>${money(invoice.subtotal)}</totalSinImpuestos>`,
    "    <totalDescuento>0.00</totalDescuento>",
    "    <totalConImpuestos>",
    "      <totalImpuesto>",
    "        <codigo>2</codigo>",
    `        <codigoPorcentaje>${codigoPorcentaje}</codigoPorcentaje>`,
    `        <baseImponible>${money(invoice.subtotal)}</baseImponible>`,
    `        <valor>${money(invoice.tax)}</valor>`,
    "      </totalImpuesto>",
    "    </totalConImpuestos>",
    "    <propina>0.00</propina>",
    `    <importeTotal>${money(invoice.total)}</importeTotal>`,
    "    <moneda>DOLAR</moneda>",
    "    <pagos>",
    "      <pago>",
    "        <formaPago>20</formaPago>",
    `        <total>${money(invoice.total)}</total>`,
    "      </pago>",
    "    </pagos>",
    "  </infoFactura>",
    "  <detalles>",
    detailsXml,
    "  </detalles>",
    "</factura>",
  ].filter(Boolean).join("\n");

  return { accessKey: claveAcceso, xml };
}

export async function writeSriXml(invoiceNumber: string, xml: string) {
  await mkdir(xmlStorageRoot, { recursive: true });
  const fileName = `${invoiceNumber.replaceAll("-", "")}.xml`;
  const filePath = path.join(xmlStorageRoot, fileName);
  await writeFile(filePath, xml, "utf8");
  return filePath;
}

