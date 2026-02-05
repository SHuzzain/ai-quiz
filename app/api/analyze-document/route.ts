import { NextResponse } from "next/server";
import { analyzeDocumentContent } from "@/features/quiz-creator/services/openai.service";
import officeParser, { OfficeParserAST } from "officeparser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided." },
        { status: 400 },
      );
    }

    const texts = formData.get("texts");

    let combinedTextContent = "";

    if (texts && typeof texts === "string") {
      try {
        const parsedTexts = JSON.parse(texts) as {
          name: string;
          content: string;
        }[];
        for (const item of parsedTexts) {
          combinedTextContent += `\n--- SOURCE: ${item.name} ---\n${item.content}\n`;
        }
      } catch (e) {
        console.error("Failed to parse texts from FormData", e);
      }
    }

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      let fileText = "";

      try {
        console.log("file", file);

        const parsedData = await officeParser.parseOffice(buffer);

        fileText =
          typeof parsedData === "string"
            ? parsedData
            : JSON.stringify(parsedData.toText());
      } catch (parseError) {
        console.error(`officeParser error for ${file.name}:`, parseError);
        fileText = await file.text();
      }

      combinedTextContent += `\n--- SOURCE: ${file.name} ---\n${fileText}\n`;
    }

    if (!combinedTextContent || !combinedTextContent.trim()) {
      return NextResponse.json(
        { error: "Files content is empty or could not be read." },
        { status: 400 },
      );
    }

    const clarificationAnswer = formData.get("clarificationAnswer") as
      | string
      | undefined;

    const analysis = await analyzeDocumentContent(
      combinedTextContent,
      clarificationAnswer,
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error in analyze-document route:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: "Failed to analyze document.", details: errorMessage },
      { status: 500 },
    );
  }
}
