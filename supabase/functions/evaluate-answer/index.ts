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

    if (!questionText || !correctAnswer || !studentAnswer) {
      throw new Error("Missing questionText, correctAnswer, or studentAnswer");
    }

    const systemPrompt = `You are a strict but fair teacher grading a test.
    Evaluate the student's answer compared to the correct answer.
    
    Rubric:
    - 100: Perfect match, correct synonym, or fully correct interpretation.
    - 90-99: Minor typo (1-2 letters) but clearly correct meaning.
    - 80-89: Correct concept but slightly vague or missing a small detail.
    - 50-79: Partially correct but missing key keywords or context.
    - 0-49: Incorrect or irrelevant.

    Return JSON ONLY:
    {
      "score": number (0-100),
      "isCorrect": boolean (true ONLY if score >= 80),
      "feedback": "One short sentence. Start with 'Correct!', 'Almost!', or 'Incorrect.' followed by a brief reason."
    }`;

    const prompt = `
    Question: "${questionText}"
    Correct Answer: "${correctAnswer}"
    Student Answer: "${studentAnswer}"
    
    Grade this answer.`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: prompt,
    });

    // Parse JSON safely
    const cleanText = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanText);

    return new Response(JSON.stringify(result), {
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
