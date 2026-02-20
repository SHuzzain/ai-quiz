import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { corsHeaders } from "../_shared/cors.ts";

const openai = createOpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const RequestSchema = z.object({
  content: z.string(),
  count: z.number().default(5),
});

const QuestionBankItemSchema = z.object({
  title: z.string().describe("The text of the generated question"),
  difficulty: z.number().min(1).max(5).describe("Difficulty score from 1 to 5"),
  marks: z
    .number()
    .describe("Recommended full marks integer for retrieving a correct answer"),
  answer: z.string().describe("The correct answer to the question"),
});

const ResponseSchema = z.object({
  topic: z
    .string()
    .describe(
      "A high level category or subject topic derived from the content",
    ),
  concept: z
    .string()
    .describe("The specific core concept being taught in the text"),
  questions: z.array(QuestionBankItemSchema),
});

const SYSTEM_PROMPT =
  "You are an expert educational content creator. Analyze the provided educational text and extract a core 'topic' and specific 'concept'. Then, generate a set of quality questions for a Question Bank covering this material. Each question must have a 'title' (the question itself), a 'difficulty' rating from 1 to 5, an appropriate 'marks' weighting, and the correct 'answer'.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, count } = await req.json();

    RequestSchema.parse({ content, count });

    const prompt = `Generate ${count} question bank entries based on the following document content:\n\n${content.substring(0, 10000)}`;

    const { output } = await generateText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      prompt: prompt,
      output: Output.object({ schema: ResponseSchema }),
      temperature: 0.5,
    });

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
