// Browser-only: extracts text from a PDF, rebuilding lines from the text layer's y-coordinates.
export async function pdfToText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const row = rows.get(y) ?? [];
      row.push({ x: item.transform[4], s: item.str });
      rows.set(y, row);
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => {
        items.sort((a, b) => a.x - b.x);
        // Large horizontal gaps become a tab so "Balance   $1,234" stays parseable as label/value.
        let out = "";
        let lastEnd = -Infinity;
        for (const it of items) {
          if (out) out += it.x - lastEnd > 25 ? "\t" : " ";
          out += it.s.trim();
          lastEnd = it.x + it.s.length * 4.5;
        }
        return out;
      });
    pages.push(lines.join("\n"));
  }
  return pages.join("\n");
}

export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style").forEach((el) => el.remove());
  // Put table cells and block elements on their own lines.
  doc.querySelectorAll("td,th").forEach((el) => el.append("\t"));
  doc.querySelectorAll("tr,div,p,br,li,h1,h2,h3,h4,h5,h6").forEach((el) => el.append("\n"));
  return (doc.body.textContent ?? "").replace(/[  ]+/g, " ").replace(/\n\s*\n+/g, "\n");
}

export function fileToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
