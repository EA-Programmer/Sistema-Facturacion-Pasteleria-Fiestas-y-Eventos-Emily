import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { generateProformaPdfBuffer } from "@/lib/proforma-pdf-generator";
import { getProformas } from "@/lib/proformas-db";
import { getBusinessSettings } from "@/lib/settings-db";
import { assertSafeId } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id } = await params;
  const proformaId = assertSafeId(id, "identificador de la proforma");

  const [proformas, settings] = await Promise.all([
    getProformas(),
    getBusinessSettings(),
  ]);
  const proforma = proformas.find((item) => item.id === proformaId);

  if (!proforma) {
    return NextResponse.json({ error: "Proforma no encontrada." }, { status: 404 });
  }

  const pdf = await generateProformaPdfBuffer(proforma, settings);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Proforma_${proforma.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
