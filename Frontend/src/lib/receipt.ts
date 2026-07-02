/**
 * Maintenance Receipt Generator — opens a styled printable receipt in a new window
 */

import type { MaintenanceRecord } from "./data";

function formatMonth(monthStr: string): string {
  if (!monthStr) return "—";
  // monthStr can be "2026-01" or "Jan 2026"
  if (monthStr.includes("-")) {
    const [year, month] = monthStr.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  return monthStr;
}

function formatCurrency(amount: number): string {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
}

export function generateReceipt(record: MaintenanceRecord, societyName = "UrbanVista Society") {
  const balance = (record.totalAmount ?? 0) - (record.amountPaid ?? 0);

  const receiptHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance Receipt — ${record.houseNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f0f2f5;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 40px 20px;
      color: #1a1a2e;
    }

    .receipt-container {
      width: 100%;
      max-width: 600px;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    /* ── Header ── */
    .receipt-header {
      background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%);
      color: white;
      padding: 32px 36px;
      text-align: center;
      position: relative;
    }

    .receipt-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
    }

    .society-name {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .receipt-subtitle {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 400;
    }

    .receipt-title {
      margin-top: 16px;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.95);
    }

    /* ── Status Badge ── */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .status-paid {
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .status-pending {
      background: rgba(245, 158, 11, 0.2);
      color: #fcd34d;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .status-overdue {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-paid .status-dot { background: #10b981; }
    .status-pending .status-dot { background: #f59e0b; }
    .status-overdue .status-dot { background: #ef4444; }

    /* ── Body ── */
    .receipt-body {
      padding: 32px 36px;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }

    .info-item {
      padding: 14px 16px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }

    .info-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .info-value {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }

    /* ── Divider ── */
    .divider {
      border: none;
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }

    /* ── Breakdown Table ── */
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #475569;
      margin-bottom: 16px;
    }

    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
    }

    .breakdown-table tr {
      border-bottom: 1px solid #f1f5f9;
    }

    .breakdown-table tr:last-child {
      border-bottom: none;
    }

    .breakdown-table td {
      padding: 12px 0;
      font-size: 14px;
    }

    .breakdown-table td:first-child {
      color: #64748b;
      font-weight: 400;
    }

    .breakdown-table td:last-child {
      text-align: right;
      font-weight: 500;
      color: #1e293b;
    }

    /* Total Row */
    .total-row {
      background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%);
      border-radius: 10px;
      margin-top: 16px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
    }

    .total-row .total-label {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .total-row .total-value {
      font-size: 22px;
      font-weight: 700;
    }

    /* Payment Summary */
    .payment-summary {
      margin-top: 20px;
      padding: 16px 20px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
    }

    .payment-summary.has-balance {
      background: #fffbeb;
      border-color: #fde68a;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }

    .payment-row .label {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .payment-row .value {
      font-size: 14px;
      font-weight: 600;
    }

    .paid-value { color: #059669; }
    .balance-value { color: #d97706; }

    /* ── Footer ── */
    .receipt-footer {
      padding: 24px 36px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .footer-note {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }

    .receipt-id {
      font-size: 11px;
      color: #cbd5e1;
      margin-top: 8px;
      font-family: 'Courier New', monospace;
    }

    /* ── Print button ── */
    .print-actions {
      text-align: center;
      margin-top: 24px;
    }

    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 32px;
      background: linear-gradient(135deg, #1a365d, #2563eb);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }

    .btn-print:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
    }

    @media print {
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { background: white !important; padding: 0; margin: 0; }
      .receipt-container { box-shadow: none; max-width: 100%; }
      .receipt-header {
        background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%) !important;
        color: white !important;
        -webkit-print-color-adjust: exact !important;
      }
      .receipt-header::after {
        background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6) !important;
        -webkit-print-color-adjust: exact !important;
      }
      .status-badge {
        -webkit-print-color-adjust: exact !important;
      }
      .status-paid { background: rgba(16, 185, 129, 0.2) !important; color: #6ee7b7 !important; border: 1px solid rgba(16, 185, 129, 0.3) !important; }
      .status-pending { background: rgba(245, 158, 11, 0.2) !important; color: #fcd34d !important; border: 1px solid rgba(245, 158, 11, 0.3) !important; }
      .status-overdue { background: rgba(239, 68, 68, 0.2) !important; color: #fca5a5 !important; border: 1px solid rgba(239, 68, 68, 0.3) !important; }
      .status-paid .status-dot { background: #10b981 !important; }
      .status-pending .status-dot { background: #f59e0b !important; }
      .status-overdue .status-dot { background: #ef4444 !important; }
      .info-item {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        -webkit-print-color-adjust: exact !important;
      }
      .total-row {
        background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%) !important;
        color: white !important;
        -webkit-print-color-adjust: exact !important;
      }
      .payment-summary {
        background: #f0fdf4 !important;
        border: 1px solid #bbf7d0 !important;
        -webkit-print-color-adjust: exact !important;
      }
      .payment-summary.has-balance {
        background: #fffbeb !important;
        border-color: #fde68a !important;
      }
      .paid-value { color: #059669 !important; }
      .balance-value { color: #d97706 !important; }
      .receipt-footer {
        background: #f8fafc !important;
        border-top: 1px solid #e2e8f0 !important;
        -webkit-print-color-adjust: exact !important;
      }
      .print-actions { display: none !important; }
    }
  </style>
</head>
<body>
  <div>
    <div class="receipt-container">
      <!-- Header -->
      <div class="receipt-header">
        <div class="society-name">${societyName}</div>
        <div class="receipt-subtitle">Residential Society Management</div>
        <div class="receipt-title">Maintenance Receipt</div>
        <div class="status-badge status-${record.status.toLowerCase()}">
          <span class="status-dot"></span>
          ${record.status}
        </div>
      </div>

      <!-- Body -->
      <div class="receipt-body">
        <!-- Info Grid -->
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">House Number</div>
            <div class="info-value">${record.houseNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Owner / Resident</div>
            <div class="info-value">${record.ownerName || "—"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Billing Period</div>
            <div class="info-value">${formatMonth(record.fromMonth)} — ${formatMonth(record.toMonth)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Payment Method</div>
            <div class="info-value">${record.paymentMethod}</div>
          </div>
        </div>

        <hr class="divider" />

        <!-- Amount Breakdown -->
        <div class="section-title">Amount Breakdown</div>
        <table class="breakdown-table">
          <tr>
            <td>Base Maintenance Charge</td>
            <td>${formatCurrency(record.baseAmount)}</td>
          </tr>
          ${record.lateFee ? `<tr>
            <td>Late Fee</td>
            <td>${formatCurrency(record.lateFee)}</td>
          </tr>` : ""}
          ${record.extraCharges ? `<tr>
            <td>Extra Charges</td>
            <td>${formatCurrency(record.extraCharges)}</td>
          </tr>` : ""}
        </table>

        <div class="total-row">
          <span class="total-label">Total Amount</span>
          <span class="total-value">${formatCurrency(record.totalAmount)}</span>
        </div>

        <!-- Payment Summary -->
        <div class="payment-summary ${balance > 0 ? "has-balance" : ""}">
          <div class="payment-row">
            <span class="label">Amount Paid</span>
            <span class="value paid-value">${formatCurrency(record.amountPaid)}</span>
          </div>
          ${balance > 0 ? `<div class="payment-row">
            <span class="label">Balance Due</span>
            <span class="value balance-value">${formatCurrency(balance)}</span>
          </div>` : ""}
        </div>
      </div>

      <!-- Footer -->
      <div class="receipt-footer">
        <div class="footer-note">
          This is a computer-generated receipt and does not require a signature.<br />
          For any queries, please contact the society management office.
        </div>
        <div class="receipt-id">Receipt ID: ${record.id.substring(0, 8).toUpperCase()} &bull; Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div>
    </div>

    <div class="print-actions">
      <button class="btn-print" onclick="window.print()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
        Print / Save as PDF
      </button>
    </div>
  </div>
</body>
</html>`;

  const receiptWindow = window.open("", "_blank");
  if (receiptWindow) {
    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
  }
}

export async function downloadReceiptAsPdf(record: MaintenanceRecord, societyName = "UrbanVista Society") {
  const html2canvas = (await import("html2canvas")).default;
  const jsPDF = (await import("jspdf")).default;

  const balance = (record.totalAmount ?? 0) - (record.amountPaid ?? 0);
  const isPaid = record.status === "Paid";

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "600px";
  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; background: #fff; border-radius: 16px; overflow: hidden; width: 600px;">
      <div style="background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); color: white; padding: 32px 36px; text-align: center;">
        <div style="font-size: 22px; font-weight: 700; margin-bottom: 4px;">${societyName}</div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.8);">Residential Society Management</div>
        <div style="margin-top: 16px; font-size: 16px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">MAINTENANCE RECEIPT</div>
        <div style="display: inline-block; margin-top: 12px; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; background: ${isPaid ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}; color: ${isPaid ? '#6ee7b7' : '#fcd34d'};">
          ${record.status}
        </div>
      </div>
      <div style="padding: 32px 36px;">
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          <tr>
            <td style="padding:14px 16px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; width:50%;">
              <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:#64748b; margin-bottom:4px;">House Number</div>
              <div style="font-size:15px; font-weight:600; color:#1e293b;">${record.houseNumber}</div>
            </td>
            <td style="width:20px;"></td>
            <td style="padding:14px 16px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; width:50%;">
              <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:#64748b; margin-bottom:4px;">Owner / Resident</div>
              <div style="font-size:15px; font-weight:600; color:#1e293b;">${record.ownerName || '—'}</div>
            </td>
          </tr>
          <tr><td colspan="3" style="height:20px;"></td></tr>
          <tr>
            <td style="padding:14px 16px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0;">
              <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:#64748b; margin-bottom:4px;">Billing Period</div>
              <div style="font-size:15px; font-weight:600; color:#1e293b;">${formatMonth(record.fromMonth)} — ${formatMonth(record.toMonth)}</div>
            </td>
            <td style="width:20px;"></td>
            <td style="padding:14px 16px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0;">
              <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:#64748b; margin-bottom:4px;">Payment Method</div>
              <div style="font-size:15px; font-weight:600; color:#1e293b;">${record.paymentMethod}</div>
            </td>
          </tr>
        </table>
        <hr style="border:none; height:1px; background:#e2e8f0; margin:24px 0;" />
        <div style="font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#475569; margin-bottom:16px;">Amount Breakdown</div>
        <table style="width:100%; border-collapse:collapse;">
          <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:12px 0; color:#64748b;">Base Maintenance Charge</td><td style="padding:12px 0; text-align:right; font-weight:500; color:#1e293b;">${formatCurrency(record.baseAmount)}</td></tr>
          ${record.lateFee ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:12px 0; color:#64748b;">Late Fee</td><td style="padding:12px 0; text-align:right; font-weight:500; color:#1e293b;">${formatCurrency(record.lateFee)}</td></tr>` : ''}
          ${record.extraCharges ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:12px 0; color:#64748b;">Extra Charges</td><td style="padding:12px 0; text-align:right; font-weight:500; color:#1e293b;">${formatCurrency(record.extraCharges)}</td></tr>` : ''}
        </table>
        <div style="background: linear-gradient(135deg, #1a365d, #2563eb); border-radius:10px; margin-top:16px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; color:white;">
          <span style="font-size:14px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Total Amount</span>
          <span style="font-size:22px; font-weight:700;">${formatCurrency(record.totalAmount)}</span>
        </div>
        <div style="margin-top:20px; padding:16px 20px; background:${balance > 0 ? '#fffbeb' : '#f0fdf4'}; border:1px solid ${balance > 0 ? '#fde68a' : '#bbf7d0'}; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span style="font-size:13px; color:#64748b; font-weight:500;">Amount Paid</span>
            <span style="font-size:14px; font-weight:600; color:#059669;">${formatCurrency(record.amountPaid)}</span>
          </div>
          ${balance > 0 ? `<div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span style="font-size:13px; color:#64748b; font-weight:500;">Balance Due</span>
            <span style="font-size:14px; font-weight:600; color:#d97706;">${formatCurrency(balance)}</span>
          </div>` : ''}
        </div>
      </div>
      <div style="padding:24px 36px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
        <div style="font-size:12px; color:#94a3b8; line-height:1.6;">This is a computer-generated receipt and does not require a signature.</div>
        <div style="font-size:11px; color:#cbd5e1; margin-top:8px; font-family:monospace;">Receipt ID: ${record.id.substring(0, 8).toUpperCase()} | Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div>
    </div>`;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save(`Receipt_${record.houseNumber}_${record.id.substring(0, 8).toUpperCase()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
