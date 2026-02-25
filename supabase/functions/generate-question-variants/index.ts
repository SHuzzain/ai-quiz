import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { corsHeaders } from "../_shared/cors.ts";

/* ---------------- API KEY ---------------- */
const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

const openai = createOpenAI({ apiKey });

/* ---------------- REQUEST SCHEMA ---------------- */
const VariantConfigSchema = z.object({
  baseQuestion: z.string().min(1),
  topics: z.array(z.string()).min(1),
  concepts: z.array(z.string()).min(1),
  difficulty: z.number().min(1).max(5),
  marks: z.number().min(1),
  variantCount: z.number().min(1).max(20),
});

const RequestSchema = z.object({
  documentText: z.string().optional(),
  configurations: z.array(VariantConfigSchema),
});

/* ---------------- RESPONSE SCHEMA ---------------- */
const QuestionSchema = z.object({
  variationType: z.string(), // AI decides automatically
  title: z.string(),
  answer: z.string(),
  topic: z.string(),
  concept: z.string(),
  difficulty: z.number().min(1).max(5),
  difficultyReason: z.string(),
  marks: z.number(),
  working: z.string(),
});

const ResponseSchema = z.object({
  questions: z.array(QuestionSchema),
});

/* ---------------- SYSTEM PROMPT ---------------- */
const SYSTEM_PROMPT = `
You are a mathematics curriculum expert. Generate variations of the given base question.

Rules:
1. Base question is ONLY the pattern.
2. Generate exactly the number of variations requested.
3. Keep topic, concept, difficulty, marks SAME as input.
4. Automatically assign variationType (e.g., sentencing, number_change, context_change, harder, easier_phrasing, answer_different).
5. Variations can change numbers, names, phrasing, or context but computation logic must follow the base pattern.
6. Include working and difficultyReason for each question.
7. Output STRICT JSON matching schema:
{
  "questions": [
    {
      "variationType": "string",
      "title": "string",
      "answer": "string",
      "topic": "string",
      "concept": "string",
      "difficulty": "number",
      "difficultyReason": "string",
      "marks": "number",
      "working": "string"
    }
  ]
}
`;

/* ---------------- SERVER ---------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const payload = RequestSchema.parse(body);

    const allQuestions: any[] = [];

    // Process each base question configuration
    for (const config of payload.configurations) {
      const prompt = `
Base Question:
${config.baseQuestion}

Generate EXACTLY ${config.variantCount} variations.
- Topic: ${config.topics[0]}
- Concept: ${config.concepts.join(", ")}
- Difficulty: ${config.difficulty}
- Marks: ${config.marks}
- Keep computation logic same as base question.
- Assign variationType automatically.
- Include working and difficultyReason.
`;

      const result = await generateText({
        model: openai("gpt-5"),
        system: SYSTEM_PROMPT,
        prompt,
        output: Output.object({ schema: ResponseSchema }),
      });

      // Enforce topic, concept, marks, difficulty
      const validatedQuestions = result.output.questions.map((q) => ({
        ...q,
        topic: config.topics[0],
        concept: config.concepts[0],
        marks: config.marks,
        difficulty: config.difficulty,
      }));

      allQuestions.push(...validatedQuestions);
    }

    return new Response(JSON.stringify({ questions: allQuestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
