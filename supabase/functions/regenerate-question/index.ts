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
    title: z.string(),
    answer: z.string(),
    topic: z.string(),
    concept: z.string(),
    difficulty: z.number().min(1).max(5),
    marks: z.number(),
    working: z.string(),
    difficultyReason: z.string().optional(),
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
   Do NOT modify wording.

2. Topic and concept must ALWAYS match exactly.

3. If difficulty is marked TRUE:
   - You may adjust structural complexity.
   - Increase/decrease number size.
   - Add/remove steps.
   - Introduce interpretation.
   - Keep same topic and concept.

4. If difficulty is NOT marked TRUE:
   - Preserve same structural complexity.
   - Only rephrase or change numbers/context.

5. "answer" must contain ONLY the final answer.
   No explanation text.

6. All explanation must go in "working".

7. The regenerated title must not be identical wording.

8. Maintain same marks unless marked dirty.

9. Output STRICT JSON matching schema.
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

    const dirtyFields = q.isDirtyFields ?? {};

    const prompt = `
Regenerate the question following all system rules.

--- CURRENT QUESTION ---
${JSON.stringify(
      {
        title: q.title,
        answer: q.answer,
        topic: q.topic,
        concept: q.concept,
        difficulty: q.difficulty,
        marks: q.marks,
        working: q.working,
        difficultyReason: q.difficultyReason ?? "",
      },
      null,
      2,
    )}

--- DIRTY FIELDS ---
${JSON.stringify(dirtyFields, null, 2)}

--- SOURCE CONTEXT ---
${payload.documentText?.substring(0, 3000) ?? "None provided."}

Important:
- If a field is dirty, copy it EXACTLY.
- If not dirty, regenerate logically.
`;

    const result = await generateText({
      model: openai("gpt-5"), // upgraded to match question bank
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: ResponseSchema }),
      temperature: 0.2, // more deterministic
    });

    let regenerated = result.output;

    /* -------------------- ENFORCE HARD CONSTRAINTS -------------------- */
    regenerated = {
      ...regenerated,
      topic: q.topic,
      concept: q.concept,
      marks: dirtyFields.marks ? q.marks : q.marks,
      difficulty: dirtyFields.difficulty ? q.difficulty : q.difficulty,
    };

    return new Response(JSON.stringify(regenerated), {
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
      }
    );
  }
});