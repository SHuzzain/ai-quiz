import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// Validation schemas
const questionSchema = z.object({
  questionText: z.string().min(1),
  correctAnswer: z.string().min(1),
  hints: z.array(z.string()),
  microLearning: z.string().min(1),
  order: z.number().optional(),
});

const createTestSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  duration: z.number().min(1),
  scheduledDate: z.string().datetime(),
  lessonId: z.string().optional(),
  questions: z.array(questionSchema).min(1),
});

/**
 * GET /api/tests
 * List all tests with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Only show tests created by this user (if not admin)
    if (user.role !== "ADMIN") {
      where.createdBy = user.id;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get tests with counts
    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        include: {
          creator: {
            select: { name: true, email: true },
          },
          lesson: {
            select: { title: true },
          },
          _count: {
            select: { questions: true, testAttempts: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.test.count({ where }),
    ]);

    return NextResponse.json({
      data: tests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return NextResponse.json(
      { error: "Failed to fetch tests" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tests
 * Create a new test with questions
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createTestSchema.parse(body);

    // Create test with questions
    const test = await prisma.test.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        duration: validatedData.duration,
        scheduledDate: new Date(validatedData.scheduledDate),
        createdBy: user.id,
        lessonId: validatedData.lessonId,
        status: "DRAFT",
        questionCount: validatedData.questions.length,
        questions: {
          create: validatedData.questions.map((q, index) => ({
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            hints: q.hints,
            microLearning: q.microLearning,
            order: q.order ?? index,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating test:", error);
    return NextResponse.json(
      { error: "Failed to create test" },
      { status: 500 },
    );
  }
}
