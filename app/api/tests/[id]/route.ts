import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const questionSchema = z.object({
  id: z.string().optional(),
  questionText: z.string().min(1),
  correctAnswer: z.string().min(1),
  hints: z.array(z.string()),
  microLearning: z.string().min(1),
  order: z.number().optional(),
});

const updateTestSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  duration: z.number().min(1).optional(),
  scheduledDate: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED"]).optional(),
  lessonId: z.string().optional(),
  questions: z.array(questionSchema).optional(),
});

/**
 * GET /api/tests/[id]
 * Get a single test with all questions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: { name: true, email: true, id: true },
        },
        lesson: true,
        questions: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { testAttempts: true },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Check if user has access (creator or admin)
    if (test.createdBy !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json(
      { error: "Failed to fetch test" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/tests/[id]
 * Update a test and its questions
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if test exists and user has access
    const existingTest = await prisma.test.findUnique({
      where: { id: params.id },
      include: { questions: true },
    });

    if (!existingTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (existingTest.createdBy !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTestSchema.parse(body);

    // Prepare update data
    const updateData: any = {};

    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.description)
      updateData.description = validatedData.description;
    if (validatedData.duration) updateData.duration = validatedData.duration;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.lessonId !== undefined)
      updateData.lessonId = validatedData.lessonId;
    if (validatedData.scheduledDate) {
      updateData.scheduledDate = new Date(validatedData.scheduledDate);
    }

    // Handle questions update
    if (validatedData.questions) {
      const newQuestions = validatedData.questions;
      const existingQuestionIds = existingTest.questions.map((q) => q.id);
      const newQuestionIds = newQuestions.filter((q) => q.id).map((q) => q.id!);

      // Delete questions that are no longer in the list
      const questionsToDelete = existingQuestionIds.filter(
        (id) => !newQuestionIds.includes(id),
      );

      if (questionsToDelete.length > 0) {
        await prisma.question.deleteMany({
          where: {
            id: { in: questionsToDelete },
            testId: params.id,
          },
        });
      }

      // Upsert questions
      updateData.questions = {
        upsert: newQuestions.map((q, index) => ({
          where: { id: q.id || "new-" + index },
          create: {
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            hints: q.hints,
            microLearning: q.microLearning,
            order: q.order ?? index,
          },
          update: {
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            hints: q.hints,
            microLearning: q.microLearning,
            order: q.order ?? index,
          },
        })),
      };

      updateData.questionCount = newQuestions.length;
    }

    // Update test
    const updatedTest = await prisma.test.update({
      where: { id: params.id },
      data: updateData,
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(updatedTest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating test:", error);
    return NextResponse.json(
      { error: "Failed to update test" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tests/[id]
 * Delete a test (cascade deletes questions)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if test exists and user has access
    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { testAttempts: true },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (test.createdBy !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Warn if test has attempts
    if (test._count.testAttempts > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete test with existing attempts",
          attemptCount: test._count.testAttempts,
        },
        { status: 400 },
      );
    }

    // Delete test (questions will be cascade deleted)
    await prisma.test.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Test deleted successfully" });
  } catch (error) {
    console.error("Error deleting test:", error);
    return NextResponse.json(
      { error: "Failed to delete test" },
      { status: 500 },
    );
  }
}
