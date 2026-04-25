// Browser-side parsers for PDF/DOCX uploads.

export async function parsePdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n\n";
  }
  return text.trim();
}

export async function parseDocx(file: File): Promise<string> {
  const mammoth: any = await import("mammoth/mammoth.browser" as any);
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value as string).trim();
}

export async function parseFile(file: File): Promise<{ text: string; source: "pdf" | "docx" }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return { text: await parsePdf(file), source: "pdf" };
  if (name.endsWith(".docx")) return { text: await parseDocx(file), source: "docx" };
  throw new Error("Unsupported file. Upload .pdf or .docx");
}
