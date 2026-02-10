export const API_ROUTES = {
  TESTS: {
    ROOT: "/tests",
    BY_ID: (id: string) => `/tests/${id}`,
  },
  USERS: {
    ME: (userId: string) => `/users/me/${userId}`,
  },
  AI: {
    EXTRACT_QUESTIONS: "/ai/extract-questions",
    GENERATE_HINTS: "/ai/generate-hints",
    GENERATE_MICRO_LEARNING: "/ai/generate-micro-learning",
    ANALYZE_DOCUMENT: "/ai/analyze-document",
  },
  ADMIN: {
    TESTS: {
      ROOT: "/admin/tests",
      BY_ID: (id: string) => `/admin/tests/${id}`,
    },
    USERS: {
      ROOT: "/admin/users",
      ME: (userId: string) => `/admin/users/me/${userId}`,
    },
    ANALYTICS: {
      ROOT: "/analytics/dashboard",
      DASHBOARD: "/admin/analytics/dashboard",
    },
  },
} as const;
