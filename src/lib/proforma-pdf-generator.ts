import { existsSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type { Proforma } from "@/types/proforma";
import type { BusinessSettingsForm } from "@/types/settings";

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function money(value: number) {
  return `$ ${Number(value || 0).toFixed(2)}`;
}

function line(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(40, y).lineTo(555, y).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
}

export function generateProformaPdfBuffer(
  proforma: Proforma,
  settings: BusinessSettingsForm,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const regularFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
      const boldFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
      const logoPath = settings.logoPath
        ? path.join(process.cwd(), "public", settings.logoPath.replace(/^\//, ""))
        : path.join(process.cwd(), "public", "brand", "logo-emily.png");

      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        font: existsSync(regularFontPath) ? regularFontPath : undefined,
      });
      const chunks: Buffer[] = [];

      if (existsSync(regularFontPath)) doc.registerFont("Helvetica", regularFontPath);
      if (existsSync(boldFontPath)) doc.registerFont("Helvetica-Bold", boldFontPath);

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const berry = "#db2777";
      const chocolate = "#4a2c22";
      const slate = "#334155";
      const palePink = "#fff1f2";

      if (existsSync(logoPath)) {
        doc.image(logoPath, 42, 36, { fit: [84, 84] });
      }

      doc.fillColor(chocolate).font("Helvetica-Bold").fontSize(18)
        .text(settings.tradeName || settings.businessName, 140, 44, { width: 260 });
      doc.fillColor(slate).font("Helvetica").fontSize(9)
        .text(settings.businessName, 140, 70, { width: 260 })
        .text(`RUC: ${settings.ruc || "Pendiente"}`, 140, 84)
        .text(settings.address || "Direccion pendiente", 140, 98, { width: 260 })
        .text([settings.phone, settings.email].filter(Boolean).join(" | "), 140, 112, { width: 260 });

      doc.roundedRect(405, 40, 150, 92, 8).fillAndStroke(palePink, "#fbcfe8");
      doc.fillColor(berry).font("Helvetica-Bold").fontSize(18)
        .text("PROFORMA", 420, 56, { width: 120, align: "right" });
      doc.fillColor(chocolate).fontSize(12)
        .text(proforma.number, 420, 82, { width: 120, align: "right" });
      doc.fillColor(slate).font("Helvetica").fontSize(9)
        .text(`Fecha: ${formatDate(proforma.issueDate)}`, 420, 104, { width: 120, align: "right" })
        .text(`Valida hasta: ${formatDate(proforma.validUntil) || "Por confirmar"}`, 420, 118, { width: 120, align: "right" });

      line(doc, 150);

      doc.roundedRect(40, 165, 515, 84, 8).strokeColor("#e2e8f0").stroke();
      doc.fillColor(berry).font("Helvetica-Bold").fontSize(10).text("DATOS DEL CLIENTE", 55, 178);
      doc.fillColor(chocolate).fontSize(11).text(proforma.customerName, 55, 198, { width: 250 });
      doc.fillColor(slate).font("Helvetica").fontSize(9)
        .text(`Documento: ${proforma.customerDocument}`, 55, 216)
        .text(`Correo: ${proforma.customerEmail || "Sin correo"}`, 300, 198, { width: 230 })
        .text(`Telefono: ${proforma.customerPhone || "Sin telefono"}`, 300, 216, { width: 230 })
        .text(`Direccion: ${proforma.customerAddress || proforma.deliveryAddress || "Por confirmar"}`, 300, 232, { width: 230 });

      doc.fillColor(chocolate).font("Helvetica-Bold").fontSize(10).text("DETALLE SOLICITADO", 40, 272);
      const headerY = 292;
      doc.rect(40, headerY, 515, 24).fill(berry);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8)
        .text("Descripcion", 50, headerY + 8, { width: 270 })
        .text("Cant.", 340, headerY + 8, { width: 40, align: "center" })
        .text("Unitario", 400, headerY + 8, { width: 60, align: "right" })
        .text("Total", 490, headerY + 8, { width: 55, align: "right" });

      let y = headerY + 24;
      proforma.items.forEach((item, index) => {
        const description = [item.name, item.description].filter(Boolean).join("\n");
        const rowHeight = Math.max(36, doc.heightOfString(description, { width: 270 }) + 18);
        if (y + rowHeight > 700) {
          doc.addPage();
          y = 50;
        }

        if (index % 2 === 1) doc.rect(40, y, 515, rowHeight).fill("#f8fafc");
        doc.fillColor(slate).font("Helvetica").fontSize(8.5)
          .text(description, 50, y + 9, { width: 270 })
          .text(String(item.quantity), 340, y + 9, { width: 40, align: "center" })
          .text(money(item.unitPrice), 400, y + 9, { width: 60, align: "right" })
          .text(money(item.total), 490, y + 9, { width: 55, align: "right" });
        doc.moveTo(40, y + rowHeight).lineTo(555, y + rowHeight).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
        y += rowHeight;
      });

      const totalsY = Math.max(y + 20, 610);
      doc.roundedRect(335, totalsY, 220, 100, 8).strokeColor("#fbcfe8").stroke();
      const rows = [
        ["Subtotal", proforma.subtotal],
        ["Descuento", proforma.discount],
        ["IVA", proforma.tax],
        ["Total", proforma.total],
      ] as const;
      rows.forEach(([label, value], index) => {
        const rowY = totalsY + 14 + index * 20;
        doc.fillColor(index === 3 ? berry : slate)
          .font(index === 3 ? "Helvetica-Bold" : "Helvetica")
          .fontSize(index === 3 ? 12 : 9)
          .text(label, 350, rowY)
          .text(money(value), 450, rowY, { width: 85, align: "right" });
      });

      doc.roundedRect(40, totalsY, 275, 100, 8).strokeColor("#e2e8f0").stroke();
      doc.fillColor(chocolate).font("Helvetica-Bold").fontSize(9).text("CONDICIONES", 55, totalsY + 14);
      doc.fillColor(slate).font("Helvetica").fontSize(8.5)
        .text(proforma.terms || "Precios sujetos a confirmacion de disponibilidad. La proforma no reemplaza una factura autorizada.", 55, totalsY + 32, {
          width: 245,
          lineGap: 2,
        });

      const signatureY = 755;

      doc.moveTo(70, signatureY + 22).lineTo(235, signatureY + 22).lineWidth(0.7).strokeColor("#94a3b8").stroke();
      doc.fillColor(chocolate).font("Helvetica-Bold").fontSize(8)
        .text(settings.tradeName || settings.businessName, 70, signatureY + 30, { width: 165, align: "center" });

      doc.fillColor("#64748b").font("Helvetica").fontSize(7.5)
        .text("Proforma generada digitalmente. No es comprobante tributario autorizado por el SRI.", 300, signatureY + 26, {
          width: 245,
          align: "right",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
