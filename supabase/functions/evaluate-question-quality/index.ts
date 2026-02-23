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
  question: z.string().min(1, "Question text is required"),
  answer: z.string().min(1, "Answer is required"),
  working: z.string().optional(),
});

/* -------------------- RESPONSE SCHEMA -------------------- */
const ResponseSchema = z.object({
  isCorrect: z
    .boolean()
    .describe(
      "Whether the answer and working are fundamentally correct for the given question",
    ),
  feedback: z
    .string()
    .describe(
      "Clear, concise feedback on the question's phrasing, answer accuracy, and working steps",
    ),
  suggestedImprovement: z
    .string()
    .describe(
      "If there are issues, how can the question or answer be improved? (Return empty string if no working is needed)",
    ),
});

/* -------------------- SYSTEM PROMPT -------------------- */
const SYSTEM_PROMPT = `
You are an expert curriculum validator and educational quality assurance AI.

Your task is to review a single question, its provided correct answer, and the working/steps (if any).

You must determine:
1. Does the answer logically follow from the question?
2. Is the working (if provided) mathematically or factually correct?
3. Is the question phrasing clear and unambiguous?

Provide a boolean indicating if it is fundamentally 'correct' and usable. Then provide concise feedback, and an optional suggested improvement if there are minor errors or phrasing issues. Keep feedback encouraging but academically rigorous.
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
Please evaluate the following educational question:

--- Question Context ---
Question: ${payload.question}
Answer: ${payload.answer}
Working / Steps: ${payload.working || "None provided."}
`;

    const result = await generateText({
      model: openai("gpt-4o-mini"), // Using mini for fast, cheap evaluations
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: ResponseSchema }),
      temperature: 0.3,
    });

    return new Response(JSON.stringify(result.output), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Question evaluation error:", error);
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
