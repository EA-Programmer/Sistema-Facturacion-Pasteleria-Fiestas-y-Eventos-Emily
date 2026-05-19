import { getInternalInvoices } from "@/lib/invoices-db";
import { getCakeOrders } from "@/lib/orders-db";
import { getPaymentRecords } from "@/lib/payments-db";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function inCurrentMonth(value: string) {
  const date = new Date(value);
  return date >= monthStart();
}

export async function getReportsData() {
  const [orders, invoices, payments] = await Promise.all([
    getCakeOrders(),
    getInternalInvoices(),
    getPaymentRecords(),
  ]);

  const confirmedPayments = payments.filter((payment) => payment.status === "CONFIRMADO");
  const pendingPayments = payments.filter((payment) => payment.status === "PENDIENTE");
  const activeInvoices = invoices.filter((invoice) => invoice.status !== "ANULADA");
  const activeOrders = orders.filter((order) => order.status !== "CANCELADO");
  const monthlyOrders = activeOrders.filter((order) => inCurrentMonth(order.createdAt));
  const monthlyPayments = confirmedPayments.filter((payment) => inCurrentMonth(payment.paidAt));

  const invoicedOrderIds = new Set(activeInvoices.map((invoice) => invoice.orderId));
  const targets = [
    ...activeInvoices.map((invoice) => ({
      code: invoice.number,
      customerName: invoice.customerName,
      total: invoice.total,
      targetId: invoice.id,
      kind: "Factura",
    })),
    ...activeOrders
      .filter((order) => !invoicedOrderIds.has(order.id))
      .map((order) => ({
        code: order.code,
        customerName: order.customerName,
        total: order.total,
        targetId: order.id,
        kind: "Pedido",
      })),
  ];

  const receivables = targets
    .map((target) => {
      const paid = confirmedPayments
        .filter((payment) => payment.targetId === target.targetId)
        .reduce((total, payment) => total + payment.amount, 0);
      return {
        ...target,
        paid: roundMoney(paid),
        balance: roundMoney(Math.max(target.total - paid, 0)),
      };
    })
    .filter((target) => target.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const salesByMethod = Object.entries(
    confirmedPayments.reduce<Record<string, number>>((totals, payment) => {
      totals[payment.method] = (totals[payment.method] ?? 0) + payment.amount;
      return totals;
    }, {}),
  )
    .map(([method, amount]) => ({ method, amount: roundMoney(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const topFlavors = Object.entries(
    activeOrders.reduce<Record<string, number>>((totals, order) => {
      const key = order.flavorName || "Sin sabor";
      totals[key] = (totals[key] ?? 0) + 1;
      return totals;
    }, {}),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const invoiceStatus = Object.entries(
    invoices.reduce<Record<string, number>>((totals, invoice) => {
      totals[invoice.status] = (totals[invoice.status] ?? 0) + 1;
      return totals;
    }, {}),
  ).map(([status, count]) => ({ status, count }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingOrders = activeOrders
    .filter((order) => order.deliveryDate && new Date(`${order.deliveryDate}T00:00:00`) >= today)
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .slice(0, 5);

  const totalCollected = roundMoney(
    confirmedPayments.reduce((total, payment) => total + payment.amount, 0),
  );
  const monthCollected = roundMoney(
    monthlyPayments.reduce((total, payment) => total + payment.amount, 0),
  );
  const totalPendingConfirmation = roundMoney(
    pendingPayments.reduce((total, payment) => total + payment.amount, 0),
  );
  const openBalance = roundMoney(
    receivables.reduce((total, target) => total + target.balance, 0),
  );

  return {
    summary: {
      totalCollected,
      monthCollected,
      totalPendingConfirmation,
      openBalance,
      activeOrders: activeOrders.length,
      monthlyOrders: monthlyOrders.length,
      invoiceCount: invoices.length,
      emittedInvoices: invoices.filter((invoice) =>
        ["EMITIDA", "ENVIADA"].includes(invoice.status),
      ).length,
    },
    salesByMethod,
    topFlavors,
    invoiceStatus,
    upcomingOrders,
    receivables: receivables.slice(0, 6),
  };
}
