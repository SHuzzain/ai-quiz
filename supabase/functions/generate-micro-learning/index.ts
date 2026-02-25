import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { generateText } from "npm:ai";
import { corsHeaders } from "../_shared/cors.ts";

const openai = createOpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { questionText, correctAnswer, studentQuestion } = await req.json();

    if (!questionText || !correctAnswer) {
      throw new Error("Missing questionText or correctAnswer");
    }

    const systemPrompt = `You are a fun, friendly teacher for LKG/UKG kids (ages 3-6).
    Explain the concept behind this question in a very simple, engaging way.
    Use analogies, fun facts, or simple logic.
    Keep it under 3-4 sentences. Use emojis! 🎈`;

    let prompt = `Question: "${questionText}"
    Correct Answer: "${correctAnswer}"
    
    Explain this concept to a child.`;

    if (studentQuestion) {
      prompt = `Question: "${questionText}"
      Correct Answer: "${correctAnswer}"
      Student Question: "${studentQuestion}"
      
      Explain this concept to a child.`;
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.5,
    });

    return new Response(JSON.stringify({ content: text }), {
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
