import { useState } from "react";
import { Download, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ReceiptRecord } from "@/lib/data";
import { MaintenanceReceiptDocument } from "./MaintenanceReceiptDocument";
import { downloadReceiptPdfFromReceipt } from "@/lib/receipt-pdf";
import { buildReceiptFileName, getReceiptDisplayTitle } from "@/lib/receipt-format";
import { toast } from "sonner";

interface ReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptRecord | null;
}

export function ReceiptPreviewDialog({ open, onOpenChange, receipt }: ReceiptPreviewDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!receipt) return;
    try {
      setIsDownloading(true);
      await downloadReceiptPdfFromReceipt(receipt);
      toast.success(`Downloaded ${buildReceiptFileName(receipt)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate PDF";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[96vh] w-[min(98vw,1440px)] max-w-none overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <div className="flex h-full min-h-0 flex-col rounded-[30px] bg-slate-100/90 p-2.5 shadow-[0_24px_80px_rgba(15,23,42,0.24)] md:p-4">
          <DialogHeader className="sticky top-0 z-20 rounded-[22px] border border-slate-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">Receipt Preview</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  Official digital maintenance receipt for {receipt ? getReceiptDisplayTitle(receipt) : "your payment"}.
                </DialogDescription>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                <Sparkles className="h-4 w-4" /> Official Receipt
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 pr-1 [scrollbar-gutter:stable]">
            <div className="space-y-4">
              <div className="mx-auto w-full max-w-[1220px]">
                {receipt ? <MaintenanceReceiptDocument receipt={receipt} mode="preview" /> : null}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 mt-3 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-sm text-slate-600">
                Download the PDF version for printing, email forwarding, or offline records.
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
                  <X className="h-4 w-4" />
                  Close
                </Button>
                <Button type="button" onClick={handleDownload} disabled={!receipt || isDownloading} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isDownloading ? "Generating PDF..." : "Download PDF"}
                </Button>
              </div>
          </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
