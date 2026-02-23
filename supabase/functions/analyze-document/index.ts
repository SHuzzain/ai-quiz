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
  content: z.string().min(10, "Content is too short"),
  clarificationAnswer: z.string().optional(),
});

/* -------------------- RESPONSE SCHEMA -------------------- */

const ResponseSchema = z.object({
  type: z
    .string()
    .describe("Main academic subject (e.g., Mathematics, Physics, History)"),

  greeting: z
    .string()
    .describe("Friendly and motivating greeting for the student"),

  summary: z
    .string()
    .describe("Pedagogically clear summary of what the learner will study"),

  topics: z
    .array(z.string())
    .describe(
      "High-level curriculum domains (e.g., Whole Numbers, Fractions, Decimals)",
    ),

  concepts: z
    .array(z.string())
    .describe(
      "Specific learning focuses within the selected topics (e.g., Place Value, Multiplication, Common Factors)",
    ),

  difficultyLevel: z.number().min(1).max(5),
});

/* -------------------- SYSTEM PROMPT -------------------- */

const SYSTEM_PROMPT = `
You are an expert educational content analyzer.

Your task:
- Identify the main academic subject.
- Provide a pedagogically strong summary.
- Extract HIGH-LEVEL curriculum domains as "topics".
- Extract SPECIFIC learning focuses as "concepts".
- Determine cognitive difficulty level.

Rules:
- Topics must be broad curriculum areas (e.g., Whole Numbers, Fractions).
- Concepts must be more specific than topics.
- Avoid repeating the same idea in both lists.
- Be structured, precise, and academically accurate.
- Avoid generic wording.
`;

/* -------------------- SERVER -------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const { content, clarificationAnswer } = RequestSchema.parse(body);

    // Prevent extremely large inputs
    const safeContent = content.slice(0, 15000);

    let prompt = `Analyze the following educational content:\n\n${safeContent}`;

    if (clarificationAnswer) {
      prompt += `\n\nAdditional context provided by user:\n${clarificationAnswer}`;
    }

    const result = await generateText({
      model: openai("gpt-4.1-mini"),
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: ResponseSchema }),
      temperature: 0.4, // slightly reduced for stability
    });

    return new Response(JSON.stringify(result.output), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      },
    );
  }
});
