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

/* -------------------- SCHEMAS -------------------- */

const VariantConfigSchema = z.object({
  topics: z.array(z.string()).min(1),
  concepts: z.array(z.string()).min(1),
  difficulty: z.number().min(1).max(5),
  marks: z.number().min(1),
  variantCount: z.number().min(1).max(20),
});

const RequestSchema = z.object({
  documentText: z.string().optional(),
  configurations: z.array(VariantConfigSchema).min(1),
});

const QuestionBankItemSchema = z.object({
  title: z.string().describe("The generated question text"),
  answer: z.string().describe("Correct answer"),
  topic: z.string(),
  concept: z.string(),
  difficulty: z.number().min(1).max(5),
  difficultyReason: z.string().describe("Reasoning for the difficulty level"),
  marks: z.number(),
  working: z
    .string()
    .describe(
      "Working steps for the question (Return empty string if no working is needed)",
    ),
});

const ResponseSchema = z.object({
  questions: z.array(QuestionBankItemSchema),
});

/* -------------------- SYSTEM PROMPT -------------------- */

const SYSTEM_PROMPT = `
You are an expert curriculum designer and mathematics question generator.

Strict Rules:
1. Follow EACH configuration exactly.
2. Generate EXACTLY the requested 'variantCount' per configuration.
3. Do NOT mix topics or concepts across configurations.
4. Difficulty must match numeric level (1 = easiest, 5 = hardest).
5. Marks must reflect complexity:
   - 1 mark: single-step direct question
   - 2 marks: multi-step but straightforward
   - 3+ marks: deeper reasoning or multi-step logic
6. Provide clear answers.
7. Provide working steps for difficulty >= 3.
8. Output must strictly match the JSON schema.
9. No explanations outside JSON.

Be precise. Do not drift outside requested topics and concepts.
`;

/* -------------------- SERVER -------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const payload = RequestSchema.parse(body);

    // Prevent token overflow
    const safeDocumentText = payload.documentText
      ? payload.documentText
      : "No document text provided.";

    const configText = payload.configurations
      .map(
        (cfg, i) => `
Configuration ${i + 1}:
- Topics: ${cfg.topics.join(", ")}
- Concepts: ${cfg.concepts.join(", ")}
- Difficulty: ${cfg.difficulty}
- Marks: ${cfg.marks}
- Generate EXACTLY ${cfg.variantCount} questions.
`,
      )
      .join("\n");

    const prompt = `
Generate questions based on the reference document and configurations.

--- Reference Context ---
${safeDocumentText}

--- Configurations ---
${configText}
`;

    const result = await generateText({
      model: openai("gpt-4o"),
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: ResponseSchema }),
      temperature: 0.5, // Reduced for stability
    });

    // Extra safety check to ensure count matches expected total
    const expectedCount = payload.configurations.reduce(
      (sum, cfg) => sum + cfg.variantCount,
      0,
    );

    if (result.output.questions.length !== expectedCount) {
      throw new Error(
        `Generated ${result.output.questions.length} questions but expected ${expectedCount}`,
      );
    }

    return new Response(JSON.stringify(result.output), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Question generation error:", error);

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
