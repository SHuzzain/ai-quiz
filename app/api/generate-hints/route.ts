import { NextResponse } from 'next/server';
import { generateHintsForQuestion } from '@/services/openai';

export async function POST(request: Request) {
  try {
    const { questionText, correctAnswer } = await request.json();

    if (!questionText || !correctAnswer) {
      return NextResponse.json({ error: 'Question text and correct answer are required.' }, { status: 400 });
    }

    const result = await generateHintsForQuestion(questionText, correctAnswer);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in generate-hints route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to generate hints.', details: errorMessage }, { status: 500 });
  }
}
