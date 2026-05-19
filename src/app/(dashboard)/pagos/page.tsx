import { BadgeDollarSign } from "lucide-react";
import { PaymentManager } from "@/components/payments/payment-manager";
import { getInternalInvoices } from "@/lib/invoices-db";
import { getCakeOrders } from "@/lib/orders-db";
import { getPaymentRecords } from "@/lib/payments-db";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [orders, invoices, payments] = await Promise.all([
    getCakeOrders(),
    getInternalInvoices(),
    getPaymentRecords(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Caja"
        title="Pagos"
        description="Control de anticipos, saldos, metodos de pago y movimientos de caja asociados a pedidos o facturas."
        actionLabel="Registrar pago"
        actionIcon={BadgeDollarSign}
        actionHref="#registrar-pago"
      />

      <PaymentManager
        initialInvoices={invoices}
        initialOrders={orders}
        initialPayments={payments}
      />
    </div>
  );
}
