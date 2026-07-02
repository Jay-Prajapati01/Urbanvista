import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "@/lib/userAuth";
import { userPaymentsApi } from "@/lib/userApi";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
import type { ReceiptRecord } from "@/lib/data";
import UserLayout from "@/components/user/UserLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import type { MaintenanceRecord } from "@/lib/data";
import {
  Wallet,
  IndianRupee,
  Loader2,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReceiptPreviewDialog } from "@/components/receipts/ReceiptPreviewDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UserPayments() {
  const { user, isAuthenticated } = useUserAuth();
  const queryClient = useQueryClient();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptRecord | null>(null);

  const normalizeStatus = (status: string) => String(status || "").trim().toLowerCase();
  const isPaid = (record: MaintenanceRecord) => normalizeStatus(record.status) === "paid";
  const getPaidAmount = (record: MaintenanceRecord) => Number(record.paidAmount ?? record.amountPaid ?? 0);
  const getDueAmount = (record: MaintenanceRecord) => Number(record.dueAmount ?? Math.max((record.totalAmount || 0) - getPaidAmount(record), 0));
  const getLateFeeAmount = (record: MaintenanceRecord) => Number(record.lateFeeAmount || 0);
  const getTotalPayable = (record: MaintenanceRecord) => Number(record.totalPayable ?? (getDueAmount(record) + getLateFeeAmount(record)));
  const getDisplayStatus = (record: MaintenanceRecord) => {
    const normalized = normalizeStatus(record.status);
    if (normalized === "paid") return "Paid";
    if (normalized === "partial") return "Partial";
    if (normalized === "overdue") return "Overdue";
    return "Pending";
  };

  const { data: records = [], isLoading, isError, error, refetch } = useQuery<MaintenanceRecord[]>({
    queryKey: ["user-payments"],
    queryFn: userPaymentsApi.getMaintenanceBills,
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      const latest = query.state.data || [];
      const hasPending = latest.some((record) => normalizeStatus(record.status) !== "paid");
      return hasPending ? 3000 : 15000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const totalBilled = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + getPaidAmount(r), 0);
  const pendingAmount = records.reduce((sum, r) => sum + getTotalPayable(r), 0);

  const handlePay = async (record: MaintenanceRecord) => {
    try {
      setPayingId(record.id);

      // Load Razorpay script
      await loadRazorpayScript();

      // Create order on backend
      const order = await userPaymentsApi.createOrder(record.id);

      // Open Razorpay checkout
      openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.razorpayKeyId,
        userName: user?.name || "",
        userEmail: user?.email || "",
        onSuccess: async (response) => {
          try {
            // Use the server-provided order amount for verification to avoid
            // relying on a client-scoped variable that may be undefined.
            // Note: order.amount is in paise from Razorpay; convert to rupees for backend
            const amountInRupees = order.amount / 100;
            
            const verificationResponse = await userPaymentsApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              maintenance_id: record.id,
              amount: amountInRupees, // Convert from paise to rupees
            });

            const receiptFromResponse = verificationResponse;
            const cachedReceipt: ReceiptRecord = {
              ...(receiptFromResponse.receipt || {}),
              id: receiptFromResponse.receipt?.id || verificationResponse.receiptId || response.razorpay_payment_id,
              paymentId: receiptFromResponse.receipt?.paymentId || response.razorpay_payment_id,
              maintenanceId: receiptFromResponse.receipt?.maintenanceId || record.id,
              residentId: receiptFromResponse.receipt?.residentId || user?.id || null,
              amount: Number(receiptFromResponse.receipt?.amount ?? record.totalAmount ?? amountInRupees ?? 0),
              receiptNumber: receiptFromResponse.receipt?.receiptNumber || verificationResponse.receiptNumber || response.razorpay_payment_id,
              createdAt: receiptFromResponse.receipt?.createdAt || new Date().toISOString(),
              generatedAt: receiptFromResponse.receipt?.generatedAt || new Date().toISOString(),
              paidAt: receiptFromResponse.receipt?.paidAt || new Date().toISOString(),
              paymentStatus: receiptFromResponse.receipt?.paymentStatus || "captured",
              pdfReference: receiptFromResponse.receipt?.pdfReference || null,
              razorpayTransactionId: receiptFromResponse.receipt?.razorpayTransactionId || response.razorpay_payment_id,
              razorpayPaymentId: receiptFromResponse.receipt?.razorpayPaymentId || response.razorpay_payment_id,
              razorpayOrderId: receiptFromResponse.receipt?.razorpayOrderId || response.razorpay_order_id,
              paymentMethod: receiptFromResponse.receipt?.paymentMethod || "Online",
              houseId: receiptFromResponse.receipt?.houseId || record.houseId || null,
              houseNumber: receiptFromResponse.receipt?.houseNumber || record.houseNumber || null,
              blockName: receiptFromResponse.receipt?.blockName || null,
              residentName: receiptFromResponse.receipt?.residentName || user?.name || null,
              fromMonth: receiptFromResponse.receipt?.fromMonth || record.fromMonth || null,
              toMonth: receiptFromResponse.receipt?.toMonth || record.toMonth || null,
              dueDate: receiptFromResponse.receipt?.dueDate || record.dueDate || null,
            };

            queryClient.setQueryData<ReceiptRecord[]>(["user-receipts"], (previous = []) => {
              const next = [cachedReceipt, ...previous.filter((item) => item.id !== cachedReceipt.id)];
              return next;
            });

            setPreviewReceipt(cachedReceipt);
            setPreviewOpen(true);

            // Instant resident-side sync while refetch catches up.
            queryClient.setQueryData<MaintenanceRecord[]>(["user-payments"], (previous = []) =>
              previous.map((item) => {
                if (item.id !== record.id) return item;
                const paidAmount = Number(item.totalAmount || 0);
                return {
                  ...item,
                  status: "paid",
                  paidAmount,
                  amountPaid: paidAmount,
                  dueAmount: 0,
                  totalPayable: 0,
                  paymentDate: new Date().toISOString(),
                };
              })
            );

            toast.success("Payment successful! Your receipt is now available.");
            queryClient.invalidateQueries({ queryKey: ["user-payments"] });
            queryClient.invalidateQueries({ queryKey: ["user-dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["user-receipts"] });
            queryClient.invalidateQueries({ queryKey: ["secretary"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          } catch {
            userPaymentsApi
              .markAttempt({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                status: "failed",
                reason: "Client verification call failed",
              })
              .catch(() => {
                // Best-effort attempt tracking; ignore telemetry failures in UI.
              });
            toast.error("Payment verification failed. Please contact support.");
          }
          setPayingId(null);
        },
        onFailure: () => {
          userPaymentsApi.markAttempt({
            razorpay_order_id: order.orderId,
            status: "cancelled",
            reason: "Checkout dismissed by user",
          }).catch(() => {
            // Best-effort attempt tracking; ignore telemetry failures in UI.
          });
          toast.info("Payment was cancelled.");
          setPayingId(null);
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initiate payment";
      toast.error(message);
      setPayingId(null);
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

  if (isError) {
    return (
      <UserLayout>
        <ErrorBoundary>
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Unable to load payments</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "Payment data could not be loaded."}
            </p>
            <Button className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </ErrorBoundary>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <ErrorBoundary>
        <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground">Maintenance Payments</h1>
          <p className="text-muted-foreground mt-1">
            View your maintenance dues and make payments online.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up delay-100">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Billed</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  <IndianRupee className="w-5 h-5 inline -mt-1" />
                  {totalBilled.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-steel-blue/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-steel-blue" />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  <IndianRupee className="w-5 h-5 inline -mt-1" />
                  {totalPaid.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
                  <IndianRupee className="w-5 h-5 inline -mt-1" />
                  {pendingAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Records Table */}
        <div className="glass-card p-6 animate-fade-up delay-200">
          <h2 className="text-lg font-semibold text-foreground mb-4">Payment History</h2>
          {records.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No maintenance records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const due = getDueAmount(record);
                    const lateFee = getLateFeeAmount(record);
                    const totalPayable = getTotalPayable(record);
                    const status = normalizeStatus(record.status);
                    return (
                      <TableRow key={record.id} className="table-row-hover">
                        <TableCell className="font-medium">
                          <div>{record.fromMonth} — {record.toMonth}</div>
                          {record.dueDate && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(record.dueDate).toLocaleDateString("en-IN")}
                            </div>
                          )}
                          {record.overdueDays && record.overdueDays > 0 && status === "overdue" && (
                            <div className="text-xs text-red-500 mt-1">Overdue by {record.overdueDays} day{record.overdueDays > 1 ? "s" : ""}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <IndianRupee className="w-3.5 h-3.5 inline -mt-0.5" />
                          {(record.totalAmount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right text-emerald-500">
                          <IndianRupee className="w-3.5 h-3.5 inline -mt-0.5" />
                          {getPaidAmount(record).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right">
                          {due > 0 ? (
                            <div className="space-y-1 text-right">
                              <div className="text-amber-500">
                                <IndianRupee className="w-3.5 h-3.5 inline -mt-0.5" />
                                {due.toLocaleString("en-IN")}
                              </div>
                              {lateFee > 0 && (
                                <div className="text-xs text-red-500">
                                  Late Fee: <IndianRupee className="w-3 h-3 inline -mt-0.5" />{lateFee.toLocaleString("en-IN")}
                                </div>
                              )}
                              <div className="text-xs text-foreground/80">
                                Total Payable: <IndianRupee className="w-3 h-3 inline -mt-0.5" />{totalPayable.toLocaleString("en-IN")}
                              </div>
                            </div>
                          ) : (
                            <span className="text-emerald-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              status === "paid"
                                ? "badge-paid"
                                : status === "overdue"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : status === "partial"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : "badge-pending"
                            }
                          >
                            {status === "paid" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            ) : status === "overdue" ? (
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 mr-1" />
                            )}
                            {getDisplayStatus(record)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.paymentDate
                            ? new Date(record.paymentDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isPaid(record) && totalPayable > 0 && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handlePay(record)}
                              disabled={payingId === record.id}
                            >
                              {payingId === record.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  Pay Now
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        </div>
      </ErrorBoundary>

      <ReceiptPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} receipt={previewReceipt} />
    </UserLayout>
  );
}
