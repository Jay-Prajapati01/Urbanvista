export async function downloadReceiptPdfFromElement(element: HTMLElement, fileName: string) {
  const html2canvas = (await import("html2canvas")).default;
  const jsPDF = (await import("jspdf")).default;

  const canvas = await html2canvas(element, {
    backgroundColor: "#f6f8fc",
    scale: Math.min(Math.max(window.devicePixelRatio || 1, 2), 3),
    useCORS: true,
    allowTaint: false,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    width: element.scrollWidth,
    height: element.scrollHeight,
  });

  const imageData = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const widthScale = printableWidth / canvas.width;
  const heightScale = printableHeight / canvas.height;
  const fitScale = Math.min(widthScale, heightScale);

  const renderWidth = canvas.width * fitScale;
  const renderHeight = canvas.height * fitScale;
  const offsetX = (pageWidth - renderWidth) / 2;
  const offsetY = (pageHeight - renderHeight) / 2;

  pdf.addImage(imageData, "PNG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");

  pdf.save(fileName);
}
