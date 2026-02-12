import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.name.split(".").pop()?.toLowerCase();

  switch (fileType) {
    case "txt":
      return await file.text();

    case "docx":
      return await extractDocxText(file);

    case "pdf":
      return await extractPdfText(file);

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

export async function extractTextFromUrl(
  url: string,
  type: string,
  fileName?: string,
): Promise<string> {
  // Fetch the file as a blob
  const response = await fetch(url);
  const blob = await response.blob();

  // Determine extension
  let extension = type.toLowerCase();

  // Map common MIME types to extensions if needed
  if (extension.includes("pdf")) extension = "pdf";
  else if (
    extension.includes("word") ||
    extension.includes("docx") ||
    extension.includes("document")
  )
    extension = "docx";
  else if (extension.includes("text") || extension.includes("txt"))
    extension = "txt";

  // If we have a fileName, prefer its extension
  if (fileName) {
    const nameExt = fileName.split(".").pop()?.toLowerCase();
    if (nameExt && ["pdf", "docx", "txt"].includes(nameExt)) {
      extension = nameExt;
    }
  }

  // Create a File object
  const file = new File([blob], `temp.${extension}`, { type: blob.type });

  return await extractTextFromFile(file);
}
