import { NextResponse } from "next/server";
import { extractQuestionsFromText } from "@/services/openai";


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const countStr = formData.get("questionCount") as string;
    const count = countStr ? parseInt(countStr, 10) : 5;
    let textContent = "";

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    textContent = await file.text();

    if (!textContent.trim()) {
      return NextResponse.json(
        { error: "File content is empty or could not be read." },
        { status: 400 },
      );
    }

    const result = await extractQuestionsFromText(textContent, count);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in extract-questions route:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: "Failed to process file.", details: errorMessage },
      { status: 500 },
    );
  }
}
