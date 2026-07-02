import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserAuth } from "@/lib/userAuth";
import { userPaymentsApi } from "@/lib/userApi";
import UserLayout from "@/components/user/UserLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import type { ReceiptRecord } from "@/lib/data";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  IndianRupee,
  Loader2,
  Hash,
  Clock3,
  Building2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReceiptPreviewDialog } from "@/components/receipts/ReceiptPreviewDialog";
import {
  buildReceiptFileName,
  formatReceiptAmount,
  formatReceiptDate,
  formatReceiptPeriod,
  normalizeReceiptStatus,
  isReceiptPaid,
} from "@/lib/receipt-format";
import { downloadReceiptPdfFromReceipt } from "@/lib/receipt-pdf";

export default function UserReceipts() {
  const { isAuthenticated } = useUserAuth();
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: receipts = [], isLoading } = useQuery<ReceiptRecord[]>({
    queryKey: ["user-receipts"],
    queryFn: userPaymentsApi.getReceiptsFromReceiptsApi,
    enabled: isAuthenticated,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const totalPaid = useMemo(
    () => receipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0),
    [receipts]
  );

  const latestReceipt = receipts[0] || null;

  const openPreview = (receipt: ReceiptRecord) => {
    setSelectedReceipt(receipt);
    setPreviewOpen(true);
  };

  const handleDownload = async (receipt: ReceiptRecord) => {
    try {
      setDownloadingId(receipt.id);
      await downloadReceiptPdfFromReceipt(receipt);
      toast.success(`Downloaded ${buildReceiptFileName(receipt)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download receipt";
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#071b34_0%,#10335f_50%,#0f4c81_100%)] px-6 py-7 text-white shadow-[0_22px_60px_rgba(8,24,48,0.18)] sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
                  Official Maintenance Receipts
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Payment Receipts</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                  View, verify, and download your official UrbanVista maintenance receipts in a premium printable format.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">Receipts</div>
                  <div className="mt-1 text-2xl font-black">{receipts.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">Total Paid</div>
                  <div className="mt-1 flex items-center gap-1 text-2xl font-black">
                    <IndianRupee className="h-5 w-5" />
                    {totalPaid.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">Latest</div>
                  <div className="mt-1 text-sm font-semibold text-white/90">{latestReceipt ? latestReceipt.receiptNumber : "No receipt yet"}</div>
                </div>
              </div>
            </div>
          </div>

          {receipts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900">No Receipts Yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Once your maintenance payment is confirmed, the official receipt will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {receipts.map((receipt) => {
                const paid = isReceiptPaid(receipt.paymentStatus);
                const status = normalizeReceiptStatus(receipt.paymentStatus);
                return (
                  <div
                    key={receipt.id}
                    className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
                  >
                    <div className="bg-[linear-gradient(135deg,#071b34_0%,#10335f_46%,#0f4c81_100%)] px-5 py-5 text-white sm:px-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg shadow-black/10">
                            <FileText className="h-7 w-7" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Official Receipt</div>
                            <div className="mt-1 text-2xl font-bold tracking-tight">{receipt.receiptNumber}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {formatReceiptDate(receipt.paidAt || receipt.generatedAt || receipt.createdAt)}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                                <Hash className="h-3.5 w-3.5" />
                                {receipt.pdfReference || "Ready for download"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={
                            paid
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                              : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                          }
                        >
                          {status}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-4 px-5 py-5 sm:px-6">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            <Building2 className="h-4 w-4" /> House / Block
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">
                            {receipt.blockName || "Block N/A"} • {receipt.houseNumber || "House N/A"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            <UserRound className="h-4 w-4" /> Resident
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">
                            {receipt.residentName || "UrbanVista Resident"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            <CalendarDays className="h-4 w-4" /> Maintenance Period
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">
                            {formatReceiptPeriod(receipt.fromMonth, receipt.toMonth)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            <Banknote className="h-4 w-4" /> Amount Paid
                          </div>
                          <div className="mt-2 text-sm font-bold text-emerald-600">
                            {formatReceiptAmount(receipt.amount)}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Payment Success</div>
                            <div className="mt-1 text-sm text-emerald-900/80">
                              The payment has been verified and linked to the resident ledger.
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                            <CheckCircle2 className="h-4 w-4" /> Paid
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => openPreview(receipt)}
                        >
                          <Eye className="h-4 w-4" />
                          View Receipt
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 gap-2"
                          onClick={() => handleDownload(receipt)}
                          disabled={downloadingId === receipt.id}
                        >
                          <Download className="h-4 w-4" />
                          {downloadingId === receipt.id ? "Generating..." : "Download PDF"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ErrorBoundary>

      <ReceiptPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} receipt={selectedReceipt} />
    </UserLayout>
  );
}
