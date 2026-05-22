import { existsSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
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

function formatTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function generateInvoicePdfBuffer(
  invoice: InternalInvoice,
  settings: BusinessSettingsForm
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const regularFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
      const boldFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");

      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        font: existsSync(regularFontPath) ? regularFontPath : undefined,
      });

      if (existsSync(regularFontPath)) {
        doc.registerFont("Helvetica", regularFontPath);
      }
      if (existsSync(boldFontPath)) {
        doc.registerFont("Helvetica-Bold", boldFontPath);
      }

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const primaryColor = "#084c5e"; // Teal
      const secondaryColor = "#b91c1c"; // Red
      const lightGrey = "#f8fafc";
      const borderGrey = "#cbd5e1";
      const darkText = "#1e293b";

      // ----------------------------------------------------
      // COLUMNA IZQUIERDA: LOGO Y DATOS DE LA EMPRESA
      // ----------------------------------------------------
      const logoPath = settings.logoPath
        ? path.join(process.cwd(), "public", settings.logoPath.replace(/^\//, ""))
        : path.join(process.cwd(), "public", "brand", "logo-emily.png");

      if (existsSync(logoPath)) {
        doc.image(logoPath, 40, 40, { width: 80, height: 80 });
      } else {
        doc.fillColor(secondaryColor)
           .font("Helvetica-Bold")
           .fontSize(20)
           .text("🍰 " + (settings.tradeName || settings.businessName).toUpperCase(), 40, 45, { width: 230 });
      }

      // Caja datos emisor
      doc.roundedRect(40, 130, 245, 150, 8)
         .lineWidth(1)
         .strokeColor(borderGrey)
         .stroke();

      doc.fillColor(darkText)
         .font("Helvetica-Bold")
         .fontSize(9)
         .text(settings.businessName.toUpperCase(), 50, 140, { width: 225, align: "left" });

      if (settings.tradeName) {
        doc.font("Helvetica")
           .fontSize(8)
           .text(settings.tradeName.toUpperCase(), 50, 160, { width: 225 });
      }

      doc.font("Helvetica-Bold")
         .fontSize(8)
         .text("Dirección Matriz:", 50, 180)
         .font("Helvetica")
         .text(settings.address || "MACHALA, ECUADOR", 130, 180, { width: 145 })
         
         .font("Helvetica-Bold")
         .text("Teléfono:", 50, 215)
         .font("Helvetica")
         .text(settings.phone || "Sin teléfono", 130, 215)
         
         .font("Helvetica-Bold")
         .text("Correo:", 50, 230)
         .font("Helvetica")
         .text(settings.email || "Sin correo", 130, 230, { width: 145 })
         
         .font("Helvetica-Bold")
         .text("Obligado Contabilidad:", 50, 255)
         .font("Helvetica")
         .text("NO", 160, 255);

      // ----------------------------------------------------
      // COLUMNA DERECHA: DATOS DE FACTURACIÓN (TIPO RIDE)
      // ----------------------------------------------------
      doc.roundedRect(300, 40, 255, 240, 8)
         .lineWidth(1)
         .strokeColor(borderGrey)
         .stroke();

      doc.fillColor(darkText)
         .font("Helvetica-Bold")
         .fontSize(11)
         .text("R.U.C.:", 310, 50)
         .font("Helvetica")
         .text(settings.ruc || "0703454603001", 360, 50);

      doc.fillColor(secondaryColor)
         .font("Helvetica-Bold")
         .fontSize(13)
         .text("F A C T U R A", 310, 70);

      doc.fillColor(darkText)
         .font("Helvetica")
         .fontSize(9)
         .text("No. " + invoice.number, 310, 90)
         
         .font("Helvetica-Bold")
         .text("NÚMERO DE AUTORIZACIÓN / CLAVE DE ACCESO:", 310, 110, { width: 235 })
         .font("Helvetica")
         .fontSize(7.5)
         .text(invoice.sriAccessKey || "BORRADOR - PENDIENTE SRI", 310, 132, { width: 235, lineGap: 1.5 });

      // Generar código de barras simulado (Elegante, sin dependencias externas pesadas)
      const barcodeX = 310;
      const barcodeY = 160;
      const barcodeHeight = 25;
      const accessKey = invoice.sriAccessKey || "1505202601070345460300120110000525910703454612";
      
      doc.lineWidth(1);
      doc.strokeColor(darkText);
      for (let i = 0; i < accessKey.length; i++) {
        const val = parseInt(accessKey[i]) || 1;
        const width = val % 2 === 0 ? 1 : 2.5;
        doc.moveTo(barcodeX + i * 4.5, barcodeY)
           .lineTo(barcodeX + i * 4.5, barcodeY + barcodeHeight)
           .lineWidth(width)
           .stroke();
      }

      // Más información de facturación abajo del código de barras
      const infoY = 195;
      const envText = settings.sriEnabled ? settings.sriEnvironment : "PRUEBAS (SIMULACIÓN)";
      const isAuthorized = invoice.status === "AUTORIZADA" || invoice.status === "ENVIADA" || invoice.status === "FIRMADA" || invoice.status === "GENERADA_XML";
      const authDate = isAuthorized ? formatDate(invoice.sentAt || new Date()) : "NO APLICABLE";
      const authTime = isAuthorized ? formatTime(invoice.sentAt || new Date()) : "";

      doc.fillColor(darkText)
         .font("Helvetica-Bold")
         .fontSize(8.5)
         .text("FECHA Y HORA DE AUTORIZACIÓN:", 310, infoY)
         .font("Helvetica")
         .text(authDate + (authTime ? ` ${authTime}` : ""), 310, infoY + 12)
         
         .font("Helvetica-Bold")
         .text("AMBIENTE:", 310, infoY + 30)
         .font("Helvetica")
         .text(envText, 395, infoY + 30)
         
         .font("Helvetica-Bold")
         .text("EMISIÓN:", 310, infoY + 45)
         .font("Helvetica")
         .text("NORMAL", 395, infoY + 45);

      // Marca de agua si no es una factura autorizada real
      if (!isAuthorized) {
        doc.save()
           .fillColor("#b91c1c")
           .opacity(0.12)
           .font("Helvetica-Bold")
           .fontSize(32)
           .translate(297, 420)
           .rotate(-30)
           .text("DOCUMENTO INTERNO\nSIN VALOR TRIBUTARIO", -200, 0, { width: 400, align: "center" })
           .restore();
      }

      // ----------------------------------------------------
      // INFORMACIÓN DEL CLIENTE
      // ----------------------------------------------------
      const clientY = 295;
      doc.roundedRect(40, clientY, 515, 65, 6)
         .lineWidth(1)
         .strokeColor(borderGrey)
         .stroke();

      doc.fillColor(darkText)
         .font("Helvetica-Bold")
         .fontSize(8.5)
         .text("Razón Social:", 50, clientY + 10)
         .font("Helvetica")
         .text(invoice.customerName.toUpperCase(), 125, clientY + 10, { width: 220 })

         .font("Helvetica-Bold")
         .text("Identificación:", 355, clientY + 10)
         .font("Helvetica")
         .text(invoice.customerDocument, 435, clientY + 10)

         .font("Helvetica-Bold")
         .text("Fecha Emisión:", 50, clientY + 28)
         .font("Helvetica")
         .text(formatDate(invoice.issuedAt), 125, clientY + 28)

         .font("Helvetica-Bold")
         .text("Dirección:", 50, clientY + 46)
         .font("Helvetica")
         .text((invoice.customerAddress || "MACHALA").toUpperCase(), 125, clientY + 46, { width: 410, height: 12 });

      // ----------------------------------------------------
      // TABLA DE DETALLES / PRODUCTOS
      // ----------------------------------------------------
      let tableY = 375;
      
      // Cabecera de la tabla
      doc.rect(40, tableY, 515, 20)
         .fill(primaryColor);

      doc.fillColor("#ffffff")
         .font("Helvetica-Bold")
         .fontSize(8.5)
         .text("Descripción / Detalle", 50, tableY + 6, { width: 300 })
         .text("Cant.", 370, tableY + 6, { width: 40, align: "center" })
         .text("P. Unitario", 420, tableY + 6, { width: 60, align: "right" })
         .text("Total", 495, tableY + 6, { width: 50, align: "right" });

      tableY += 20;

      // Dibujar filas
      doc.fillColor(darkText).font("Helvetica").fontSize(8);
      
      invoice.lines.forEach((line, index) => {
        const itemY = tableY;
        const rowHeight = 22;

        // Fila fondo alternado
        if (index % 2 === 1) {
          doc.rect(40, itemY, 515, rowHeight)
             .fill(lightGrey);
        }

        // Línea inferior
        doc.moveTo(40, itemY + rowHeight)
           .lineTo(555, itemY + rowHeight)
           .lineWidth(0.5)
           .strokeColor(borderGrey)
           .stroke();

        doc.fillColor(darkText)
           .text(line.description, 50, itemY + 6, { width: 310, height: 14 })
           .text(line.quantity.toString(), 370, itemY + 6, { width: 40, align: "center" })
           .text("$ " + Number(line.unitPrice).toFixed(2), 420, itemY + 6, { width: 60, align: "right" })
           .text("$ " + Number(line.total).toFixed(2), 495, itemY + 6, { width: 50, align: "right" });

        tableY += rowHeight;
      });

      // ----------------------------------------------------
      // SECCIÓN INFERIOR: INFORMACIÓN ADICIONAL Y TOTALES
      // ----------------------------------------------------
      const footerY = tableY + 15;
      
      // Caja Información Adicional (Izquierda)
      doc.roundedRect(40, footerY, 300, 95, 6)
         .lineWidth(1)
         .strokeColor(borderGrey)
         .stroke();

      doc.fillColor(primaryColor)
         .font("Helvetica-Bold")
         .fontSize(9)
         .text("INFORMACIÓN ADICIONAL", 50, footerY + 8);

      doc.fillColor(darkText)
         .font("Helvetica-Bold")
         .fontSize(8)
         .text("Email:", 50, footerY + 25)
         .font("Helvetica")
         .text(invoice.customerEmail || "Sin correo", 100, footerY + 25)

         .font("Helvetica-Bold")
         .text("Teléfono:", 50, footerY + 40)
         .font("Helvetica")
         .text(invoice.customerPhone || "Sin teléfono", 100, footerY + 40)

         .font("Helvetica-Bold")
         .text("Descripción:", 50, footerY + 55)
         .font("Helvetica")
         .text("🍰 Elaborado artesanalmente con ingredientes frescos. ¡Gracias por preferir a Fiestas & Eventos \"Emily\"!", 100, footerY + 55, { width: 230, align: "justify" });

      // Caja Totales (Derecha)
      const totalsX = 355;
      const totalsWidth = 200;
      let currentTotalY = footerY;
      const rowHeight = 18;

      const taxRate = settings.taxRate !== undefined && settings.taxRate !== null ? Number(settings.taxRate) : 15;
      const taxValue = Number(invoice.tax);
      const totalVal = Number(invoice.total);
      const subtotalVal = Number(invoice.subtotal);

      const subtotal0 = taxRate === 0 ? subtotalVal : 0;
      const subtotalTax = taxRate > 0 ? subtotalVal : 0;

      const drawTotalRow = (label: string, value: number) => {
        doc.rect(totalsX, currentTotalY, totalsWidth, rowHeight)
           .lineWidth(0.5)
           .strokeColor(borderGrey)
           .stroke();

        doc.fillColor(darkText)
           .font("Helvetica-Bold")
           .fontSize(8)
           .text(label, totalsX + 10, currentTotalY + 5)
           .font("Helvetica")
           .text("$ " + value.toFixed(2), totalsX + totalsWidth - 70, currentTotalY + 5, { width: 60, align: "right" });

        currentTotalY += rowHeight;
      };

      if (taxRate > 0) {
        drawTotalRow(`SUBTOTAL ${taxRate}%`, subtotalTax);
        drawTotalRow("SUBTOTAL 0%", subtotal0);
      } else {
        drawTotalRow("SUBTOTAL 0%", subtotalVal);
      }
      
      drawTotalRow("SUBTOTAL SIN IMPUESTOS", subtotalVal);
      drawTotalRow("TOTAL DESCUENTO", 0.00);
      
      if (taxRate > 0) {
        drawTotalRow(`IVA ${taxRate}%`, taxValue);
      } else {
        drawTotalRow("IVA 0%", 0.00);
      }
      
      // Fila final total destacado
      doc.rect(totalsX, currentTotalY, totalsWidth, rowHeight + 2)
         .fill(primaryColor);

      doc.fillColor("#ffffff")
         .font("Helvetica-Bold")
         .fontSize(9.5)
         .text("VALOR TOTAL", totalsX + 10, currentTotalY + 6)
         .text("$ " + Number(totalVal).toFixed(2), totalsX + totalsWidth - 70, currentTotalY + 6, { width: 60, align: "right" });

      // Finalizar documento
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
