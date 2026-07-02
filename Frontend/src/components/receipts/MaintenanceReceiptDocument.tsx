import { forwardRef } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Clock3,
  FileText,
  Hash,
  Info,
  IndianRupee,
  Stamp,
  UserRound,
  Wallet,
  CheckCircle,
} from "lucide-react";
import type { ReceiptRecord } from "@/lib/data";
import {
  formatReceiptAmount,
  formatReceiptDate,
  formatReceiptPeriod,
  getReceiptDisplayTitle,
  getReceiptPaymentMethod,
  isReceiptPaid,
  normalizeReceiptStatus,
  URBANVISTA_RECEIPT_BRAND,
} from "@/lib/receipt-format";

interface MaintenanceReceiptDocumentProps {
  receipt: ReceiptRecord;
  societyName?: string;
  mode?: "preview" | "pdf";
}

const receiptRows = [
  { key: "houseNumber", label: "House Number", icon: Building2 },
  { key: "residentName", label: "Resident Name", icon: UserRound },
  { key: "blockName", label: "Block Name", icon: FileText },
  { key: "maintenancePeriod", label: "Maintenance Period", icon: CalendarDays },
  { key: "amountPaid", label: "Amount Paid", icon: IndianRupee },
  { key: "paidAt", label: "Payment Date", icon: Clock3 },
  { key: "paymentMethod", label: "Payment Method", icon: CreditCard },
  { key: "razorpayTransactionId", label: "Razorpay Transaction ID", icon: Hash },
  { key: "receiptNumber", label: "Receipt Number", icon: Stamp },
  { key: "paymentStatus", label: "Payment Status", icon: BadgeCheck },
];

export const MaintenanceReceiptDocument = forwardRef<HTMLDivElement, MaintenanceReceiptDocumentProps>(
  function MaintenanceReceiptDocument({ receipt, societyName = URBANVISTA_RECEIPT_BRAND.name, mode = "preview" }, ref) {
    const paid = isReceiptPaid(receipt.paymentStatus);
    const totalPaid = Number(receipt.amount || 0);
    const paidAt = receipt.paidAt || receipt.generatedAt || receipt.createdAt;
    const maintenancePeriod = formatReceiptPeriod(receipt.fromMonth, receipt.toMonth);
    const supportEmail = URBANVISTA_RECEIPT_BRAND.supportEmail;
    const supportPhone = URBANVISTA_RECEIPT_BRAND.supportPhone;
    const website = URBANVISTA_RECEIPT_BRAND.website;
    const isPdf = mode === "pdf";

    return (
      <div
        ref={ref}
        data-receipt-surface="true"
        className={`mx-auto w-full overflow-hidden bg-[#eef3fa] text-slate-900 ${
          isPdf
            ? "max-w-[860px] rounded-[20px] shadow-[0_12px_40px_rgba(15,23,42,0.14)]"
            : "max-w-[1080px] rounded-[28px] shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
        }`}
      >
        <div
          className={`bg-[linear-gradient(135deg,#071b34_0%,#0f2747_40%,#123d6d_72%,#0b4f7d_100%)] text-white ${
            isPdf ? "px-5 py-5" : "px-6 py-6 sm:px-8 sm:py-7"
          }`}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 font-black tracking-[0.2em] shadow-lg ${
                  isPdf ? "h-12 w-12 text-lg" : "h-16 w-16 text-2xl"
                }`}
              >
                UV
              </div>
              <div>
                <div className={`${isPdf ? "text-xl" : "text-2xl"} font-semibold tracking-wide`}>{societyName}</div>
                <div className={`${isPdf ? "text-[11px]" : "text-sm"} uppercase tracking-[0.3em] text-white/75`}>
                  {URBANVISTA_RECEIPT_BRAND.subTitle}
                </div>
                <div className={`mt-1 ${isPdf ? "text-xs" : "text-sm"} text-white/70`}>
                  {URBANVISTA_RECEIPT_BRAND.tagline}
                </div>
              </div>
            </div>

            <div className="text-left lg:text-right">
              <div
                className={`inline-flex items-center rounded-full border border-white/15 bg-white/10 font-semibold uppercase tracking-[0.3em] text-white/85 ${
                  isPdf ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]"
                }`}
              >
                Official Payment Receipt
              </div>
              <div className={`mt-3 font-black uppercase tracking-[0.24em] ${isPdf ? "text-2xl" : "text-3xl sm:text-4xl"}`}>
                Maintenance Receipt
              </div>
              <div className={`mt-1.5 ${isPdf ? "text-xs" : "text-sm"} text-white/70`}>
                Digital proof of maintenance payment settlement
              </div>
            </div>
          </div>
        </div>

        <div className={`${isPdf ? "px-4 py-4" : "px-5 py-5 sm:px-7 sm:py-7"}`}>
          <div
            className={`rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.08)] ${
              isPdf ? "p-4" : "p-5 sm:p-6"
            }`}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 ${
                    isPdf ? "h-11 w-11" : "h-14 w-14"
                  }`}
                >
                  <FileText className={isPdf ? "h-5 w-5" : "h-7 w-7"} />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Receipt Summary</div>
                  <div className={`mt-1 font-bold text-slate-900 ${isPdf ? "text-xl" : "text-2xl"}`}>
                    {getReceiptDisplayTitle(receipt)}
                  </div>
                  <div className={`mt-2 max-w-2xl text-slate-600 ${isPdf ? "text-xs leading-5" : "text-sm leading-6"}`}>
                    This is an electronically generated receipt and does not require a signature.
                  </div>
                  <div
                    className={`mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 font-medium text-slate-700 ${
                      isPdf ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
                    }`}
                  >
                    <Hash className="h-4 w-4 text-slate-500" />
                    Receipt ID: <span className="font-mono text-slate-900">{receipt.id || receipt.receiptNumber}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <div
                  className={`inline-flex items-center gap-2 rounded-2xl border text-center font-black uppercase tracking-[0.35em] shadow-sm ${
                    isPdf ? "px-4 py-2 text-xs" : "px-5 py-3"
                  } ${
                    paid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  <Stamp className="h-5 w-5" />
                  {normalizeReceiptStatus(receipt.paymentStatus)}
                </div>
                <div className={`rounded-2xl border border-emerald-200 bg-emerald-50 text-right shadow-sm ${isPdf ? "px-3 py-2" : "px-4 py-3"}`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Payment Status</div>
                  <div className={`mt-1 font-medium text-emerald-900 ${isPdf ? "text-xs" : "text-sm"}`}>
                    {paid ? "Payment fully settled and receipt issued" : "Receipt created for authorized payment"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-4 grid gap-4 ${isPdf ? "grid-cols-[1.52fr_0.78fr]" : "xl:grid-cols-[1.42fr_0.86fr]"}`}>
            <div
              className={`rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)] ${
                isPdf ? "p-4" : "p-5 sm:p-6"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-900">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Payment Details</div>
                  <div className={`${isPdf ? "text-xs" : "text-sm"} text-slate-500`}>
                    Complete settlement information with secure references
                  </div>
                </div>
              </div>

              <div className={`divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/70 ${isPdf ? "mt-3" : "mt-5"}`}>
                {receiptRows.map((row) => {
                  const Icon = row.icon;
                  const value = (() => {
                    if (row.key === "houseNumber") return receipt.houseNumber || "—";
                    if (row.key === "residentName") return receipt.residentName || "—";
                    if (row.key === "blockName") return receipt.blockName || "—";
                    if (row.key === "maintenancePeriod") return maintenancePeriod;
                    if (row.key === "amountPaid") return formatReceiptAmount(totalPaid);
                    if (row.key === "paidAt") return formatReceiptDate(paidAt);
                    if (row.key === "paymentMethod") return getReceiptPaymentMethod(receipt);
                    if (row.key === "razorpayTransactionId") return receipt.razorpayTransactionId || receipt.razorpayPaymentId || "—";
                    if (row.key === "receiptNumber") return receipt.receiptNumber || "—";
                    if (row.key === "paymentStatus") return normalizeReceiptStatus(receipt.paymentStatus);
                    return "—";
                  })();

                  const isAmount = row.key === "amountPaid";
                  const isStatus = row.key === "paymentStatus";

                  return (
                    <div key={row.key} className={`flex items-start gap-3 ${isPdf ? "px-3 py-2.5" : "px-4 py-3 sm:px-5"}`}>
                      <div
                        className={`mt-0.5 flex shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ${
                          isPdf ? "h-9 w-9" : "h-10 w-10"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{row.label}</div>
                        <div
                          className={`mt-1 break-all font-semibold ${isPdf ? "text-xs" : "text-sm"} ${
                            isAmount ? "text-emerald-600" : isStatus ? (paid ? "text-emerald-700" : "text-amber-700") : "text-slate-900"
                          }`}
                        >
                          {value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className={`rounded-[22px] border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-sm ${
                  isPdf ? "mt-3 p-3.5" : "mt-5 p-5"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 ${
                      isPdf ? "h-10 w-10" : "h-12 w-12"
                    }`}
                  >
                    <CheckCircle2 className={isPdf ? "h-5 w-5" : "h-6 w-6"} />
                  </div>
                  <div className="flex-1">
                    <div className={`${isPdf ? "text-lg" : "text-xl"} font-bold text-emerald-900`}>Payment Successful!</div>
                    <div className={`mt-1 text-emerald-800/80 ${isPdf ? "text-xs leading-5" : "text-sm leading-6"}`}>
                      Your maintenance payment has been successfully processed.
                    </div>
                  </div>
                </div>

                <div className={`grid gap-3 ${isPdf ? "mt-3 grid-cols-2" : "mt-5 md:grid-cols-2"}`}>
                  <div className={`rounded-2xl border border-emerald-200 bg-white ${isPdf ? "p-3" : "p-4"}`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Total Paid</div>
                    <div className={`mt-1.5 flex items-end gap-2 font-black text-emerald-700 ${isPdf ? "text-2xl" : "text-3xl"}`}>
                      <IndianRupee className={`${isPdf ? "mb-0.5 h-5 w-5" : "mb-1 h-6 w-6"}`} />
                      <span>{totalPaid.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className={`rounded-2xl border border-emerald-200 bg-white ${isPdf ? "p-3" : "p-4"}`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Thank You</div>
                    <div className={`mt-1.5 text-slate-700 ${isPdf ? "text-xs leading-5" : "text-sm leading-6"}`}>
                      Thank you for keeping your maintenance account up to date.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${isPdf ? "space-y-3" : "space-y-5"}`}>
              <div
                className={`rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)] ${
                  isPdf ? "p-4" : "p-5 sm:p-6"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-900">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Important Notes</div>
                    <div className={`${isPdf ? "text-xs" : "text-sm"} text-slate-500`}>
                      Please keep this receipt for records and future reference
                    </div>
                  </div>
                </div>

                <div className={`${isPdf ? "mt-3 space-y-2" : "mt-5 space-y-3"}`}>
                  {[
                    "This receipt is computer generated and valid without signature.",
                    "Please keep this receipt for future reference.",
                    "Contact the management office for billing or reconciliation queries.",
                    "The payment reference is permanently stored for audit and support.",
                  ].map((note) => (
                    <div
                      key={note}
                      className={`flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 ${
                        isPdf ? "px-3 py-2 text-xs leading-5" : "px-4 py-3 text-sm leading-6"
                      }`}
                    >
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`rounded-[24px] border border-slate-200/80 bg-[#08162d] text-white shadow-[0_16px_40px_rgba(2,6,23,0.18)] ${
                  isPdf ? "px-4 py-4" : "px-5 py-5 sm:px-6"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Official Footer</div>
                <div className={`${isPdf ? "mt-3 space-y-2 text-xs" : "mt-4 space-y-3 text-sm"} text-white/80`}>
                  <div className="font-semibold text-white">UrbanVista Management</div>
                  <div>{supportEmail}</div>
                  <div>{supportPhone}</div>
                  <div>{website}</div>
                </div>
                <div className={`${isPdf ? "mt-3 pt-3 text-[11px] leading-5" : "mt-5 pt-4 text-xs leading-6"} border-t border-white/10 text-white/55`}>
                  {URBANVISTA_RECEIPT_BRAND.tagline} • A premium digital maintenance receipt for residents and administrators.
                </div>
              </div>
            </div>
          </div>

          <div
            className={`rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)] ${
              isPdf ? "mt-3 px-4 py-3" : "mt-5 px-5 py-4 sm:px-6"
            }`}
          >
            <div className={`grid gap-3 text-slate-600 ${isPdf ? "grid-cols-3 text-xs" : "text-sm sm:grid-cols-3"}`}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Receipt Number</div>
                <div className="mt-1 font-mono text-slate-900">{receipt.receiptNumber}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Generated At</div>
                <div className="mt-1 text-slate-900">{formatReceiptDate(receipt.generatedAt || receipt.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Payment Date</div>
                <div className="mt-1 text-slate-900">{formatReceiptDate(paidAt)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
