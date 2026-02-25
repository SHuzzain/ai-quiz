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
  topics: z.array(z.string()).optional(),
});

const QuestionSchema = z.object({
  questionText: z.string(),
  correctAnswer: z.string(),
  hints: z.array(z.string()).length(3),
  microLearning: z.string(),
  order: z.number(),
});

const ResponseSchema = z.object({
  questions: z.array(QuestionSchema),
  rawText: z.string(),
  confidence: z.number(),
});

const SYSTEM_PROMPT =
  "You are an expert quiz creator. Generate a set of fill-in-the-blank style questions based on the provided content.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, count, topics } = await req.json();

    RequestSchema.parse({ content, count, topics });

    const prompt = `Generate ${count} questions based on this content:\n\n${content.substring(0, 10000)}\n\nTopics: ${topics?.join(", ") || "General"}`;

    const { output } = await generateText({
      model: openai("gpt-4.1"),
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
