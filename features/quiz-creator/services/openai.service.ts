import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function extractQuestionsFromText(
  textContent: string,
  count: number,
) {
  const maxLength = 4000;
  const truncatedText =
    textContent.length > maxLength
      ? textContent.substring(0, maxLength) + "..."
      : textContent;

  const response = streamText({
    model: openai("gpt-4-turbo"),
    prompt: `Generate ${count} quiz questions from this text in fill-in-the-blank format with "__BLANK__". Format:
Question text with __BLANK__
Answer: [answer]
Hint: [hint1]
Hint: [hint2]
Hint: [hint3]
Micro-learning: [simple explanation for 5-10 year old]
---

Text:
${truncatedText}`,
  });

  const textResponse = await response.text;

  const questions = textResponse.split("---").map((q) => {
    const lines = q.trim().split("\n");
    const questionText = lines[0];
    const correctAnswer =
      lines
        .find((line) => line.startsWith("Answer:"))
        ?.replace("Answer:", "")
        .trim() || "";
    const hints = lines
      .filter((line) => line.startsWith("Hint:"))
      .map((hint) => hint.replace("Hint:", "").trim());
    const microLearning =
      lines
        .find((line) => line.startsWith("Micro-learning:"))
        ?.replace("Micro-learning:", "")
        .trim() || "";

    return {
      questionText,
      correctAnswer,
      hints,
      microLearning,
    };
  });

  return { questions };
}

export async function generateHintsForQuestion(
  questionText: string,
  correctAnswer: string,
) {
  const response = streamText({
    model: openai("gpt-4o"),
    prompt: `Generate three concise hints for the following quiz question. Each hint should be on a new line.

    Question: ${questionText}
    Answer: ${correctAnswer}`,
  });
  const textResponse = await response.text;
  const hints = textResponse.trim().split("\n");
  return { hints };
}

export async function generateMicroLearningForQuestion(
  questionText: string,
  correctAnswer: string,
) {
  const response = streamText({
    model: openai("gpt-4o"),
    prompt: `Generate a simple and brief explanation of the topic suitable for a 5-10 year old for the following quiz question.

    Question: ${questionText}
    Answer: ${correctAnswer}`,
  });

  const textResponse = await response.text;

  return { microLearning: textResponse.trim() };
}
