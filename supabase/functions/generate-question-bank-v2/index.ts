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
    question: z.string().describe("The text of the generated question"),
    answer: z.string().describe("The correct answer (number or text)"),
    working: z.string().describe("Working or explanation to arrive at the answer, e.g. '460 ÷ 10 = 46'. Use empty string if not applicable."),
    topic: z.string().describe("High-level topic, e.g. 'Whole Numbers'"),
    conceptTested: z.string().describe("Specific concept tested, e.g. 'Value & Place Value'"),
    marks: z.number().describe("Marks for the question (integer)"),
    difficulty: z.number().min(1).max(5).describe("Difficulty from 1 (easiest) to 5 (hardest)"),
});

const ResponseSchema = z.object({
    questions: z.array(QuestionBankItemSchema),
});

const SYSTEM_PROMPT = `You are an expert educational content creator.

The user will provide document content that may include:
1. A "##Document text" section with sample questions in a structured format (Question, Answer, Working, Topic, Concept Tested, Marks).
2. An optional "Prompt" section with instructions for how to vary the questions (e.g. include tens and thousands, different numbers, different wording).

Your task:
- Use the sample questions and structure in the document as the basis.
- If a "Prompt" or variation instructions are provided, follow them strictly: create variations in type (e.g. hundreds, tens, thousands), use different numbers, and vary the wording so each question is distinct.
- Generate exactly 10 high-quality questions for a Question Bank.
- Each question must have: question (text), answer (number or text), working (e.g. "460 ÷ 10 = 46" or empty string if not applicable), topic, conceptTested, marks (integer), difficulty (1 to 5).

Output a JSON object with a single "questions" array. Each element must include all fields: question, answer, working, topic, conceptTested, marks, difficulty.`;

function buildUserPrompt(content: string): string {
    const truncated = content.substring(0, 12000);
    return `Generate exactly 10 question bank entries from the following document.\n\n${truncated}`;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { content } = RequestSchema.parse(body);

        const userPrompt = buildUserPrompt(content);

        const { output } = await generateText({
            model: openai("gpt-4o-mini"),
            system: SYSTEM_PROMPT,
            prompt: userPrompt,
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
