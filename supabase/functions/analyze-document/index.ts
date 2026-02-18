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
  clarificationAnswer: z.string().optional(),
});

const ResponseSchema = z.object({
  type: z
    .string()
    .describe("Type of content, e.g., 'Physics', 'Math', 'History'"),
  greeting: z.string().describe("Friendly greeting for the student"),
  summary: z.string().describe("Brief summary of the content"),
  topics: z.array(z.string()).describe("List of key topics covered"),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
});

const SYSTEM_PROMPT =
  "You are an expert educational content analyzer. Analyze the provided text and extract key information to help a student understand what they are about to learn.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, clarificationAnswer } = await req.json();

    RequestSchema.parse({ content, clarificationAnswer });

    let prompt = `Analyze the following educational content:\n\n${content.substring(0, 10000)}`; // Truncate if too long
    if (clarificationAnswer) {
      prompt += `\n\nAdditional Clarification context: ${clarificationAnswer}`;
    }

    const { output } = await generateText({
      model: openai("gpt-4.1"),
      system: SYSTEM_PROMPT,
      prompt: prompt,
      output: Output.object({ schema: ResponseSchema }),
      temperature: 0.3,
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
