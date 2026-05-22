import type { InternalInvoice } from "@/types/invoice";
import type { BusinessSettingsForm } from "@/types/settings";

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function generateInvoiceHtmlEmail(invoice: InternalInvoice, settings: BusinessSettingsForm): string {
  const customerName = invoice.customerName.toUpperCase();
  const customerDocument = invoice.customerDocument;
  const businessName = settings.businessName.toUpperCase();
  const tradeName = settings.tradeName ? settings.tradeName.toUpperCase() : businessName;
  const logoUrl = settings.logoPath ? settings.logoPath : "";

  const formattedDate = formatDate(invoice.issuedAt);
  const sequence = invoice.number;
  const accessKey = invoice.sriAccessKey || "BORRADOR - PENDIENTE SRI";

  // Formatear la clave de acceso en dos partes o estilizada para que no se desborde
  const formattedAccessKey = accessKey.length === 49 
    ? `${accessKey.slice(0, 24)}<br/>${accessKey.slice(24)}` 
    : accessKey;

  // Si no hay logo registrado, mostramos una cabecera de texto estilizada
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${tradeName}" style="max-height: 80px; margin-bottom: 20px;" />`
    : `<div style="font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: bold; color: #b91c1c; margin-bottom: 20px; letter-spacing: 1px;">🍰 ${tradeName}</div>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento de Factura electrónico</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .recipient-title {
      font-family: 'Outfit', 'Arial Black', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #084c5e;
      text-align: center;
      margin: 0 0 15px 0;
      letter-spacing: -0.5px;
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
      font-family: 'Helvetica Neue', Arial, sans-serif;
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
      box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
    }
    .card-row {
      margin-bottom: 15px;
      overflow: hidden;
    }
    .card-row:last-child {
      margin-bottom: 0;
    }
    .card-label {
      float: left;
      width: 140px;
      font-size: 14px;
      font-weight: bold;
      color: #93c5fd;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      <div class="header">
        ${logoHtml}
      </div>

      <h1 class="recipient-title">${customerName}</h1>

      <p class="intro-text">
        Has recibido el siguiente comprobante electrónico a nombre de <strong>${customerName}</strong>,<br/>
        con cédula/RUC <strong>${customerDocument}</strong> de:
      </p>

      <hr class="divider" />

      <h2 class="doc-type">Factura</h2>

      <div class="card">
        <div class="card-row">
          <div class="card-label">Fecha emisión:</div>
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
        <div class="signature-title">${settings.businessName.toUpperCase()}</div>
        ${settings.ruc ? `<div style="margin-top: 2px;">RUC: ${settings.ruc}</div>` : ""}
        ${settings.phone ? `<div style="margin-top: 2px;">Teléfono: ${settings.phone}</div>` : ""}
        ${settings.address ? `<div style="margin-top: 2px;">Direc: ${settings.address}</div>` : ""}
      </div>
    </div>
    
    <div class="footer">
      Este es un correo automático de facturación electrónica.<br/>
      Los documentos XML y RIDE PDF correspondientes se encuentran adjuntos a este correo.<br/>
      Factura generada automáticamente por <strong>Astudillo Technologies</strong>.
    </div>
  </div>
</body>
</html>
  `.trim();
}
