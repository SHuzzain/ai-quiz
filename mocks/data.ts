import { User, Test, Question, Lesson, TestAttempt, QuestionAttempt, TestAnalytics, OverallAnalytics } from '@/types';

// ============================================
// Mock Users
// ============================================

export const mockUsers: User[] = [
  {
    id: 'admin-1',
    email: 'admin@learningplatform.com',
    name: 'Ms. Johnson',
    role: 'admin',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    createdAt: new Date('2024-01-01'),
    lastActiveAt: new Date(),
  },
  {
    id: 'student-1',
    email: 'emma@student.com',
    name: 'Emma Watson',
    role: 'student',
    grade: 2,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
    createdAt: new Date('2024-02-15'),
    lastActiveAt: new Date(),
  },
  {
    id: 'student-2',
    email: 'max@student.com',
    name: 'Max Turner',
    role: 'student',
    grade: 3,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=max',
    createdAt: new Date('2024-02-20'),
    lastActiveAt: new Date('2024-12-10'),
  },
  {
    id: 'student-3',
    email: 'lily@student.com',
    name: 'Lily Chen',
    role: 'student',
    grade: 1,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lily',
    createdAt: new Date('2024-03-01'),
    lastActiveAt: new Date('2024-12-15'),
  },
  {
    id: 'student-4',
    email: 'oliver@student.com',
    name: 'Oliver Smith',
    role: 'student',
    grade: 2,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=oliver',
    createdAt: new Date('2024-03-10'),
    lastActiveAt: new Date(),
  },
];

// ============================================
// Mock Tests
// ============================================

export const mockTests: Test[] = [
  {
    id: 'test-1',
    title: 'Animal Friends Quiz',
    description: 'Learn about your favorite animals!',
    scheduledDate: new Date('2024-12-20'),
    createdAt: new Date('2024-12-01'),
    createdBy: 'admin-1',
    status: 'active',
    questionCount: 5,
    duration: 15,
    lessonId: 'lesson-1',
  },
  {
    id: 'test-2',
    title: 'Color Magic Test',
    description: 'Can you fill in the missing colors?',
    scheduledDate: new Date('2024-12-22'),
    createdAt: new Date('2024-12-05'),
    createdBy: 'admin-1',
    status: 'scheduled',
    questionCount: 4,
    duration: 10,
  },
  {
    id: 'test-3',
    title: 'Number Adventure',
    description: 'Fun with counting and numbers!',
    scheduledDate: new Date('2024-12-18'),
    createdAt: new Date('2024-12-10'),
    createdBy: 'admin-1',
    status: 'completed',
    questionCount: 6,
    duration: 20,
  },
  {
    id: 'test-4',
    title: 'Weather Wonders',
    description: 'Discover different types of weather!',
    scheduledDate: new Date('2024-12-25'),
    createdAt: new Date('2024-12-12'),
    createdBy: 'admin-1',
    status: 'draft',
    questionCount: 5,
    duration: 15,
  },
];

// ============================================
// Mock Questions
// ============================================

export const mockQuestions: Record<string, Question[]> = {
  'test-1': [
    {
      id: 'q1-1',
      testId: 'test-1',
      questionText: 'A __BLANK__ says "meow" and loves to chase mice.',
      correctAnswer: 'cat',
      hints: [
        'This animal is soft and fluffy!',
        'It likes to drink milk.',
        'It starts with the letter C.',
      ],
      microLearning: 'Cats are amazing animals! They are called "felines" and have been friends with humans for thousands of years. Cats can see in the dark and always land on their feet!',
      order: 1,
    },
    {
      id: 'q1-2',
      testId: 'test-1',
      questionText: 'A __BLANK__ is a big animal that says "moo" and gives us milk.',
      correctAnswer: 'cow',
      hints: [
        'This animal lives on a farm.',
        'It has black and white spots.',
        'It starts with the letter C.',
      ],
      microLearning: 'Cows are gentle farm animals! A baby cow is called a calf. Cows have four stomachs to help them digest their food. They give us milk which we use to make cheese and ice cream!',
      order: 2,
    },
    {
      id: 'q1-3',
      testId: 'test-1',
      questionText: 'A __BLANK__ has a long trunk and big floppy ears.',
      correctAnswer: 'elephant',
      hints: [
        'This is the biggest land animal!',
        'It uses water to spray on its back.',
        'It starts with the letter E.',
      ],
      microLearning: 'Elephants are the largest animals that live on land! They use their trunks like a hand to pick up food and drink water. Elephants are very smart and have great memories!',
      order: 3,
    },
    {
      id: 'q1-4',
      testId: 'test-1',
      questionText: 'A __BLANK__ is mans best friend and loves to play fetch.',
      correctAnswer: 'dog',
      hints: [
        'This animal barks!',
        'It wags its tail when happy.',
        'It starts with the letter D.',
      ],
      microLearning: 'Dogs are loyal and loving pets! They can learn tricks and love to play. Dogs have an amazing sense of smell - about 40 times better than humans!',
      order: 4,
    },
    {
      id: 'q1-5',
      testId: 'test-1',
      questionText: 'A __BLANK__ hops around and has long ears like a bunny.',
      correctAnswer: 'rabbit',
      hints: [
        'This animal loves to eat carrots!',
        'It has a fluffy cotton tail.',
        'It starts with the letter R.',
      ],
      microLearning: 'Rabbits are soft, cuddly animals with long ears! They hop using their strong back legs. Baby rabbits are called kittens or bunnies. Their teeth never stop growing!',
      order: 5,
    },
  ],
  'test-2': [
    {
      id: 'q2-1',
      testId: 'test-2',
      questionText: 'The sky is usually __BLANK__ on a sunny day.',
      correctAnswer: 'blue',
      hints: [
        'Think about looking up on a nice day!',
        'The ocean is also this color.',
        'It starts with the letter B.',
      ],
      microLearning: 'The sky looks blue because of how sunlight travels through the air! Sunlight has all colors in it, but blue light bounces around the sky the most. Thats why we see blue!',
      order: 1,
    },
    {
      id: 'q2-2',
      testId: 'test-2',
      questionText: 'Bananas and sunflowers are __BLANK__.',
      correctAnswer: 'yellow',
      hints: [
        'This color is bright and cheerful!',
        'School buses are this color.',
        'It rhymes with "mellow".',
      ],
      microLearning: 'Yellow is a primary color, which means you cannot mix other colors to make it! Yellow is the color of happiness and sunshine. Bees love yellow flowers!',
      order: 2,
    },
    {
      id: 'q2-3',
      testId: 'test-2',
      questionText: 'Grass and leaves are usually __BLANK__.',
      correctAnswer: 'green',
      hints: [
        'This is the color of nature!',
        'Frogs and turtles can be this color.',
        'Mix blue and yellow to get this color.',
      ],
      microLearning: 'Green is everywhere in nature! Plants are green because of something called chlorophyll, which helps them make food from sunlight. Green means "go" on traffic lights!',
      order: 3,
    },
    {
      id: 'q2-4',
      testId: 'test-2',
      questionText: 'Fire trucks and strawberries are __BLANK__.',
      correctAnswer: 'red',
      hints: [
        'This color means stop!',
        'Hearts are often drawn in this color.',
        'It starts with the letter R.',
      ],
      microLearning: 'Red is a bold, exciting color! Its another primary color like yellow and blue. Red can mean love, danger, or stop. Ladybugs are red with black spots!',
      order: 4,
    },
  ],
  'test-3': [
    {
      id: 'q3-1',
      testId: 'test-3',
      questionText: 'If you have 2 apples and get 1 more, you have __BLANK__ apples.',
      correctAnswer: '3',
      hints: [
        'Count on your fingers!',
        '2 + 1 = ?',
        'Its more than 2 but less than 4.',
      ],
      microLearning: 'Adding means putting things together! When we add 2 + 1, we start with 2 and count one more: "2... 3!" You can use your fingers to help you add!',
      order: 1,
    },
  ],
};

// ============================================
// Mock Lessons
// ============================================

export const mockLessons: Lesson[] = [
  {
    id: 'lesson-1',
    title: 'Amazing Animals',
    description: 'Learn about different animals and their sounds!',
    fileName: 'amazing-animals.pdf',
    fileUrl: '/lessons/amazing-animals.pdf',
    fileType: 'application/pdf',
    uploadedAt: new Date('2024-11-15'),
    uploadedBy: 'admin-1',
  },
  {
    id: 'lesson-2',
    title: 'Rainbow Colors',
    description: 'Discover all the beautiful colors around us!',
    fileName: 'rainbow-colors.pdf',
    fileUrl: '/lessons/rainbow-colors.pdf',
    fileType: 'application/pdf',
    uploadedAt: new Date('2024-11-20'),
    uploadedBy: 'admin-1',
  },
  {
    id: 'lesson-3',
    title: 'Fun with Numbers',
    description: 'Counting and simple math for beginners.',
    fileName: 'fun-with-numbers.pdf',
    fileUrl: '/lessons/fun-with-numbers.pdf',
    fileType: 'application/pdf',
    uploadedAt: new Date('2024-11-25'),
    uploadedBy: 'admin-1',
  },
];

// ============================================
// Mock Test Attempts
// ============================================

export const mockAttempts: TestAttempt[] = [
  {
    id: 'attempt-1',
    testId: 'test-3',
    studentId: 'student-1',
    startedAt: new Date('2024-12-18T10:00:00'),
    completedAt: new Date('2024-12-18T10:15:00'),
    status: 'completed',
    score: 83,
    totalQuestions: 6,
    correctAnswers: 5,
    hintsUsed: 3,
    timeTakenSeconds: 900,
  },
  {
    id: 'attempt-2',
    testId: 'test-3',
    studentId: 'student-2',
    startedAt: new Date('2024-12-18T11:00:00'),
    completedAt: new Date('2024-12-18T11:18:00'),
    status: 'completed',
    score: 67,
    totalQuestions: 6,
    correctAnswers: 4,
    hintsUsed: 5,
    timeTakenSeconds: 1080,
  },
  {
    id: 'attempt-3',
    testId: 'test-3',
    studentId: 'student-3',
    startedAt: new Date('2024-12-18T14:00:00'),
    completedAt: new Date('2024-12-18T14:12:00'),
    status: 'completed',
    score: 100,
    totalQuestions: 6,
    correctAnswers: 6,
    hintsUsed: 1,
    timeTakenSeconds: 720,
  },
];

// ============================================
// Mock Question Attempts
// ============================================

export const mockQuestionAttempts: QuestionAttempt[] = [
  {
    id: 'qa-1',
    attemptId: 'attempt-1',
    questionId: 'q3-1',
    studentAnswer: '3',
    isCorrect: true,
    attemptsCount: 1,
    hintsUsed: 0,
    viewedMicroLearning: false,
    timeTakenSeconds: 30,
  },
];

// ============================================
// Mock Analytics
// ============================================

export const mockTestAnalytics: TestAnalytics[] = [
  {
    testId: 'test-3',
    testTitle: 'Number Adventure',
    totalAttempts: 12,
    averageScore: 78,
    averageTime: 840,
    averageHintsUsed: 2.5,
    completionRate: 92,
  },
  {
    testId: 'test-1',
    testTitle: 'Animal Friends Quiz',
    totalAttempts: 8,
    averageScore: 85,
    averageTime: 720,
    averageHintsUsed: 1.8,
    completionRate: 100,
  },
];

export const mockOverallAnalytics: OverallAnalytics = {
  totalTests: 4,
  totalStudents: 4,
  totalAttempts: 20,
  averageScore: 81,
  testAnalytics: mockTestAnalytics,
};
