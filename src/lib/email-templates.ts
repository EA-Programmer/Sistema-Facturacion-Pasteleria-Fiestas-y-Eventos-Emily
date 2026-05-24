import { escapeHtml } from "@/lib/validation";
import type { InternalInvoice } from "@/types/invoice";
import type { BusinessSettingsForm } from "@/types/settings";

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return escapeHtml(String(dateStr));
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function generateInvoiceHtmlEmail(invoice: InternalInvoice, settings: BusinessSettingsForm): string {
  const customerName = escapeHtml(invoice.customerName.toUpperCase());
  const customerDocument = escapeHtml(invoice.customerDocument);
  const businessName = escapeHtml(settings.businessName.toUpperCase());
  const tradeName = settings.tradeName ? escapeHtml(settings.tradeName.toUpperCase()) : businessName;
  const logoUrl = settings.logoPath ? escapeHtml(settings.logoPath) : "";
  const formattedDate = formatDate(invoice.issuedAt);
  const sequence = escapeHtml(invoice.number);
  const accessKey = invoice.sriAccessKey || "BORRADOR - PENDIENTE SRI";
  const formattedAccessKey =
    accessKey.length === 49
      ? `${escapeHtml(accessKey.slice(0, 24))}<br/>${escapeHtml(accessKey.slice(24))}`
      : escapeHtml(accessKey);

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${tradeName}" style="max-height: 80px; margin-bottom: 20px;" />`
    : `<div style="font-size: 24px; font-weight: bold; color: #b91c1c; margin-bottom: 20px; letter-spacing: 1px;">${tradeName}</div>`;

  const contactLines = [
    settings.ruc ? `<div style="margin-top: 2px;">RUC: ${escapeHtml(settings.ruc)}</div>` : "",
    settings.phone ? `<div style="margin-top: 2px;">Telefono: ${escapeHtml(settings.phone)}</div>` : "",
    settings.address ? `<div style="margin-top: 2px;">Direccion: ${escapeHtml(settings.address)}</div>` : "",
  ].join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura electronica</title>
  <style>
    body {
      font-family: Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 30px 10px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .recipient-title {
      font-size: 28px;
      font-weight: 800;
      color: #084c5e;
      text-align: center;
      margin: 0 0 15px 0;
    }
    .intro-text {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      text-align: center;
      margin-bottom: 25px;
    }
    .divider {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 25px 0;
    }
    .doc-type {
      font-size: 26px;
      font-weight: 700;
      color: #b91c1c;
      text-align: center;
      margin: 0 0 25px 0;
    }
    .card {
      background-color: #084c5e;
      border-radius: 14px;
      padding: 25px 30px;
      color: #ffffff;
      margin-bottom: 30px;
    }
    .card-row {
      margin-bottom: 15px;
      overflow: hidden;
    }
    .card-label {
      float: left;
      width: 140px;
      font-size: 14px;
      font-weight: bold;
      color: #93c5fd;
      text-transform: uppercase;
    }
    .card-value {
      margin-left: 140px;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.5;
    }
    .signature {
      font-size: 14px;
      color: #64748b;
      margin-top: 35px;
      border-top: 1px dashed #e2e8f0;
      padding-top: 20px;
    }
    .signature-title {
      font-weight: bold;
      color: #334155;
      margin-top: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 25px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">${logoHtml}</div>
      <h1 class="recipient-title">${customerName}</h1>
      <p class="intro-text">
        Has recibido el siguiente comprobante electronico a nombre de <strong>${customerName}</strong>,<br/>
        con cedula/RUC <strong>${customerDocument}</strong> de:
      </p>
      <hr class="divider" />
      <h2 class="doc-type">Factura</h2>
      <div class="card">
        <div class="card-row">
          <div class="card-label">Fecha emision:</div>
          <div class="card-value">${formattedDate}</div>
        </div>
        <div class="card-row">
          <div class="card-label">Secuencia:</div>
          <div class="card-value">${sequence}</div>
        </div>
        <div class="card-row">
          <div class="card-label">Clave acceso:</div>
          <div class="card-value" style="font-family: monospace; font-size: 14px; letter-spacing: 1px;">
            ${formattedAccessKey}
          </div>
        </div>
      </div>
      <div class="signature">
        Atentamente,<br/>
        <div class="signature-title">${businessName}</div>
        ${contactLines}
      </div>
    </div>
    <div class="footer">
      Este es un correo automatico de facturacion electronica.<br/>
      Los documentos XML y RIDE PDF correspondientes se encuentran adjuntos a este correo.<br/>
      Factura generada automaticamente por <strong>Astudillo Technologies</strong>.
    </div>
  </div>
</body>
</html>
  `.trim();
}
