import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
  },
  client: {
    // Nothing here yet
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // For Next.js >= 13.4.4, you can rely on the Next.js process management.
  //   // For Next.js >= 13.4.4, you can rely on the Next.js process management.
  // experimental__runtimeEnv: {
  //   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  // }
});
