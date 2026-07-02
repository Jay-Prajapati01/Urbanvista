import type { ReceiptRecord } from "./data";

export const URBANVISTA_RECEIPT_BRAND = {
  name: "UrbanVista",
  subTitle: "Residential Management System",
  tagline: "Building Better Communities",
  supportEmail: "support@urbanvista.com",
  supportPhone: "+91 98765 43210",
  website: "urbanvista.com",
};

export function formatReceiptAmount(amount: number | null | undefined) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export function formatReceiptDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReceiptPeriod(fromMonth?: string | null, toMonth?: string | null) {
  const fromValue = fromMonth || "—";
  const toValue = toMonth || "—";
  return `${fromValue} • ${toValue}`;
}

export function normalizeReceiptStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "captured" || normalized === "paid" || normalized === "success") {
    return "Paid";
  }
  if (normalized === "pending" || normalized === "authorized") {
    return "Pending";
  }
  if (normalized === "failed") {
    return "Failed";
  }
  return "Paid";
}

export function isReceiptPaid(status?: string | null) {
  return normalizeReceiptStatus(status) === "Paid";
}

export function buildReceiptFileName(receipt: ReceiptRecord) {
  const safeNumber = String(receipt.receiptNumber || receipt.id || "receipt").replace(/[^a-zA-Z0-9-_]/g, "-");
  return `${safeNumber}.pdf`;
}

export function getReceiptDisplayTitle(receipt: ReceiptRecord) {
  return receipt.receiptNumber || receipt.id || "Maintenance Receipt";
}

export function getReceiptPaymentMethod(receipt: ReceiptRecord) {
  return receipt.paymentMethod || "Online";
}
