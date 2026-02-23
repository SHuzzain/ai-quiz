import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { corsHeaders } from "../_shared/cors.ts";

/* -------------------- API KEY VALIDATION -------------------- */
const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

const openai = createOpenAI({ apiKey });

/* -------------------- REQUEST SCHEMA -------------------- */
const RequestSchema = z.object({
  documentText: z
    .string()
    .describe(
      "The source document text, if available to ground the new question.",
    ),
  currentQuestion: z
    .object({
      title: z.string().optional(),
      answer: z.string().optional(),
      topics: z.array(z.string()).optional(),
      concepts: z.array(z.string()).optional(),
      difficulty: z.number().optional(),
      marks: z.number().optional(),
      working: z.string().optional(),
    })
    .describe(
      "The current state of the question, including any manual user edits.",
    ),
});

/* -------------------- RESPONSE SCHEMA -------------------- */
const ResponseSchema = z.object({
  title: z.string().describe("The regenerated question text"),
  answer: z.string().describe("Correct answer"),
  topics: z.array(z.string()),
  concepts: z.array(z.string()),
  difficulty: z.number().min(1).max(5),
  difficultyReason: z.string().describe("Reasoning for the difficulty level"),
  marks: z.number(),
  working: z
    .string()
    .describe(
      "Working steps for the question (Return empty string if no working is needed)",
    ),
});

/* -------------------- SYSTEM PROMPT -------------------- */
const SYSTEM_PROMPT = `
You are an expert curriculum designer. The user has provided an existing question (which may have been manually edited by a teacher) and wants you to "re-generate" it.

Your goal is to take the provided 'currentQuestion' state (which has the target topics, concepts, desired difficulty, and marks) and output a newly generated question that strictly adheres to those parameters.

If the user changed the topics or concepts, the new question MUST reflect those new topics/concepts.
If the user changed the difficulty, the new question MUST match that difficulty.
If the user provided source text, use it to ground the context of the question.

Do not just return the exact same question. Make it a fresh variant that fits the current parameters perfectly.
`;

/* -------------------- SERVER -------------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const payload = RequestSchema.parse(body);

    const prompt = `
Please re-generate this question based on its current parameters:

--- Target Parameters ---
Title/Context: ${payload.currentQuestion.title || "N/A"}
Topics: ${payload.currentQuestion.topics?.join(", ") || "N/A"}
Concepts: ${payload.currentQuestion.concepts?.join(", ") || "N/A"}
Difficulty level: ${payload.currentQuestion.difficulty || "N/A"}
Marks: ${payload.currentQuestion.marks || "N/A"}

--- Source Material ---
${payload.documentText ? payload.documentText.substring(0, 3000) + "..." : "None provided."}
`;

    const result = await generateText({
      model: openai("gpt-4o"), // Use standard model for generation
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: ResponseSchema }),
      temperature: 0.7, // Add some creativity to ensure a new variant
    });

    return new Response(JSON.stringify(result.output), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Regenerate question error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
