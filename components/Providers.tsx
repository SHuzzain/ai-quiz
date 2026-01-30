"use client";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/features/auth";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>{children}</AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
