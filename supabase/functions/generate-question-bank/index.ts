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
});

const QuestionBankItemSchema = z.object({
  title: z.string().describe("The text of the generated question"),
  difficulty: z.number().min(1).max(5).describe("Difficulty score from 1 to 5"),
  difficultyReason: z
    .string()
    .describe("A short reason why this difficulty level was chosen"),
  marks: z
    .number()
    .describe("Recommended full marks integer for retrieving a correct answer"),
  answer: z.string().describe("The correct answer to the question"),
  working: z
    .string()
    .optional()
    .describe("Working or explanation to arrive at the answer, if applicable"),
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

const SYSTEM_PROMPT = `
You are an expert educational content creator. Analyze the provided educational text and extract a core 'topic' and specific 'concept'. 

Then, generate exactly 10 high-quality questions for a Question Bank covering this material. 
The 10 questions must include these 5 types of variations based on the core concept:
1. Re-sentencing or rephrasing a concept.
2. Changing names and numbers in a scenario.
3. Different meaning or context but testing the same outcome/skill.
4. Much harder difficulty phrasing.
5. Much easier difficulty phrasing.

Each question must have:
- A 'title' (the question itself).
- A explicitly assigned 'difficulty' rating from 1 to 5 (1 being easy, 5 being hard).
- A 'difficultyReason' briefly explaining why this rating was chosen based on the variation type.
- An appropriate 'marks' weighting integer.
- The correct 'answer'.
- An optional 'working' explanation showing how to solve it.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    RequestSchema.parse({ content });

    const prompt = `Generate exactly 10 question bank entries based on the following document content:\n\n${content.substring(0, 10000)}`;

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
