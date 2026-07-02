import React from "react";
import { createRoot } from "react-dom/client";
import { downloadReceiptPdfFromElement } from "./receiptPdfCore";
import { MaintenanceReceiptDocument } from "@/components/receipts/MaintenanceReceiptDocument";
import type { ReceiptRecord } from "./data";
import { buildReceiptFileName } from "./receipt-format";

export async function downloadReceiptPdfFromReceipt(receipt: ReceiptRecord) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "860px";
  container.style.pointerEvents = "none";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(React.createElement(MaintenanceReceiptDocument, { receipt, mode: "pdf" }));

  await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

  const target = container.querySelector<HTMLElement>('[data-receipt-surface="true"]');
  if (!target) {
    root.unmount();
    container.remove();
    throw new Error("Unable to render receipt for PDF export");
  }

  try {
    await downloadReceiptPdfFromElement(target, buildReceiptFileName(receipt));
  } finally {
    root.unmount();
    container.remove();
  }
}
