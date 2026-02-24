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
  documentText: z.string().optional(),
  currentQuestion: z.object({
    title: z.string().optional(),
    answer: z.string().optional(),
    topic: z.string().optional(),
    concept: z.string().optional(),
    difficulty: z.number().min(1).max(5).optional(),
    marks: z.number().optional(),
    working: z.string().optional(),
    isDirtyFields: z.record(z.string(), z.boolean()).optional(),
  }),
});

/* -------------------- RESPONSE SCHEMA -------------------- */
const ResponseSchema = z.object({
  title: z.string(),
  answer: z.string(),
  topic: z.string(),
  concept: z.string(),
  difficulty: z.number().min(1).max(5),
  difficultyReason: z.string(),
  marks: z.number(),
  working: z.string(),
});

/* -------------------- STRICT SYSTEM PROMPT -------------------- */
const SYSTEM_PROMPT = `
You are an expert mathematics curriculum designer.

The user may manually edit certain fields.
The 'isDirtyFields' object tells you which fields were edited.

CRITICAL RULES:

1. If a field is marked TRUE in isDirtyFields,
   you MUST return the EXACT SAME VALUE (character-by-character).
   Do NOT modify wording of that field.

2. If difficulty is marked TRUE,
   you are allowed to increase or decrease structural complexity
   to match the requested difficulty level.
   You may:
   - Add word problem context
   - Increase number size
   - Add multi-step reasoning
   - Introduce interpretation steps
   But you must keep the same topic and concept.

3. If difficulty is NOT marked TRUE,
   preserve the original structural complexity.

4. Topic and concept must always match the provided values exactly.

5. The "answer" field must contain ONLY the final answer.
   No explanation text.

6. All explanation must go in "working".

7. The regenerated question must not be identical wording.

8. Output strict JSON only.
`;

/* -------------------- SERVER -------------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const payload = RequestSchema.parse(body);

    const q = payload.currentQuestion;

    const prompt = `
Regenerate the question using the rules.

--- Current Question ---
Title: ${q.title ?? "N/A"}
Topic: ${q.topic ?? "N/A"}
Concept: ${q.concept ?? "N/A"}
Difficulty: ${q.difficulty ?? "N/A"}
Marks: ${q.marks ?? "N/A"}

--- Edited Fields ---
${JSON.stringify(q.isDirtyFields ?? {}, null, 2)}

--- Source Context ---
${payload.documentText?.substring(0, 3000) ?? "None provided."}
`;

    const result = await generateText({
      model: openai("gpt-4o"),
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: ResponseSchema }),
      temperature: 0.3, // Lower = more deterministic
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
