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
    const { questionText, correctAnswer, studentAnswer } = await req.json();

    if (!questionText || !correctAnswer) {
      throw new Error("Missing questionText or correctAnswer");
    }

    const systemPrompt = `You are a patient, encouraging teacher for young children (LKG/UKG, ages 3-6).
    Your goal is to help the child answer the question correctly by giving a very specific, simple hint.
    
    Rules:
    1. Do NOT give the direct answer yet, but guide them very close to it.
    2. Respond to their wrong answer if provided (e.g., "Close, but that's actually...").
    3. Use simple words and emojis.
    4. Keep it short (1-2 sentences).
    5. Be super encouraging! 🌟`;

    const prompt = `Question: "${questionText}"
    Correct Answer: "${correctAnswer}"
    ${studentAnswer ? `Student's Answer (Wrong): "${studentAnswer}"` : ""}
    
    Give a helpful hint for a small child.`;

    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.6,
    });

    return new Response(JSON.stringify({ hint: text }), {
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
