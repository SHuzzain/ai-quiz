import * as pdfjsLib from "pdfjs-dist";

// Use CDN for worker to avoid build issues with Next.js specific config
// Note: pinning to the specific version installed to ensure compatibility
// The mjs extension is important for newer versions
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Loading document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let text = "";

    // Loop through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      // Extract strings from text items
      const strings = content.items.map((item) =>
        "str" in item ? item.str : "",
      );
      text += strings.join(" ") + "\n";
    }

    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF file.");
  }
}
