import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function extractQuestionsFromText(
  textContent: string,
  count: number,
  topics?: string[],
) {
  const maxLength = 100000;
  const truncatedText =
    textContent.length > maxLength
      ? textContent.substring(0, maxLength) + "..."
      : textContent;

  const { output } = await generateText({
    model: openai("gpt-4o"),
    output: Output.object({
      name: "questions",
      description: "List of questions",
      schema: z.object({
        questions: z.array(
          z.object({
            questionText: z.string(),
            correctAnswer: z.string(),
            hints: z.array(z.string()),
            microLearning: z.string(),
          }),
        ),
      }),
    }),
    prompt: `Act as a fun and expert elementary school teacher. Generate ${count} super engaging quiz questions for kids aged 5-10 from the following text. 
    
    ${topics && topics.length > 0 ? `IMPORTANT: Focus ONLY on the following selected topics: ${topics.join(", ")}.` : ""}

    Requirements:
    1. Use very simple, child-friendly vocabulary.
    2. Use fill-in-the-blank format with "__BLANK__" for a single key word.
    3. Make it fun and educational!
    4. Provide exactly ${count} questions.

    Text:
    ${truncatedText}`,
  });

  return output;
}

export async function generateHintsForQuestion(
  questionText: string,
  correctAnswer: string,
) {
  const { output } = await generateText({
    model: openai("gpt-4o"),
    output: Output.object({
      name: "hints",
      description: "List of hints",
      schema: z.object({
        hints: z.array(z.string()).length(3),
      }),
    }),
    prompt: `Act as a helpful teacher for 5-10 year olds. Generate three very simple and fun hints for the following quiz question. Make them easier as they go!

    Question: ${questionText}
    Answer: ${correctAnswer}`,
  });

  return output;
}

export async function generateMicroLearningForQuestion(
  questionText: string,
  correctAnswer: string,
) {
  const { output } = await generateText({
    model: openai("gpt-4o"),
    output: Output.object({
      name: "microLearning",
      description: "Micro learning for the question",
      schema: z.object({
        microLearning: z.string(),
      }),
    }),
    prompt: `Act as a fun teacher for 5-10 year olds. Generate a super simple, 2-sentence explanation of the topic for the following quiz question. Use "Did you know?" style and make it exciting!

    Question: ${questionText}
    Answer: ${correctAnswer}`,
  });

  return output;
}

export async function analyzeDocumentContent(
  textContent: string,
  clarificationAnswer?: string,
) {
  const maxLength = 100000;
  const truncatedText =
    textContent.length > maxLength
      ? textContent.substring(0, maxLength) + "..."
      : textContent;

  const { output } = await generateText({
    model: openai("gpt-4o"),
    output: Output.object({
      name: "analysis",
      description: "Analysis of the document",
      schema: z.object({
        type: z.enum(["lesson", "test", "solution"]),
        greeting: z.string(),
        analysis: z.string(),
        topics: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            difficulty: z.enum(["easy", "medium", "hard"]),
            estimatedQuestions: z.number(),
          }),
        ),
        suggestedQuestionCount: z.number(),
        clarification: z
          .object({
            question: z.string(),
            options: z.array(z.string()).length(4), // 3 specific + "Other"
          })
          .nullable(),
      }),
    }),
    prompt: `Act as a smart, friendly, and expert elementary school teacher (pedagogue). 
    Analyze the following educational content provided by another teacher.
    
    CONTENT:
    ${truncatedText}

    ${
      clarificationAnswer
        ? `TEACHER'S CLARIFICATION: "${clarificationAnswer}" \n\n(Use this clarification to refine your analysis and be specific).`
        : ""
    }
    
    YOUR GOALS:
    1. Identify if this is a lesson/textbook, a test sheet, or a solution key.
    2. Deeply scan for distinct educational topics and sub-topics.
    3. Generate a human-like, warm greeting and short analysis summary.
    4. Provide a list of specific topics that can be turned into a quiz.
    
    CLARIFICATION LOGIC:
    - If the content is ambiguous or could be interpreted in multiple ways (e.g., "History" could be "Ancient Rome" or "World War II"), ASK A CLARIFICATION QUESTION.
    - Provide exactly 4 options: 3 specific likely interpretations and the 4th option MUST be "Other".
    - If you are asking for clarification, the 'topics' array can be empty or generic.
    - IF NO CLARIFICATION IS NEEDED, SET 'clarification' TO NULL.
    
    BE SMART: 
    - If it's a math book, don't just say "Math". Say "Adding Single Digits", "Intro to Fractions", etc. 
    - Act like you are talking to a colleague. Use a professional yet very friendly tone.
    - If it's for 5-10 year olds, keep the topics simple and clear.`,
  });

  return output;
}
