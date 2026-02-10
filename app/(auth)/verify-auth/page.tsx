"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { Loader2 } from "lucide-react";
import { useClerk, SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function CheckAuthPage() {
    const { signOut } = useClerk();
    const { isLoaded, userId } = useAuth();
    const router = useRouter();
    const { data: user, isLoading, error } = useCurrentUser();

    useEffect(() => {
        if (user && userId && isLoaded) {
            if (user.role === "ADMIN") {
                router.replace("/admin/dashboard");
            } else if (user.role === "STUDENT") {
                router.replace("/student/dashboard");
            } else {
                signOut();
            }
        } else {
            signOut();
        }
    }, [user, router, signOut, isLoaded, userId]);

    if (isLoading || !isLoaded) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying your account...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-destructive">Authentication Error</h1>
                    <p className="text-muted-foreground mb-4">
                        We couldn&apos;t verify your account details.
                    </p>

                    <Button variant="outline" asChild>
                        <SignUpButton
                        >
                            Go to Sign Up
                        </SignUpButton>
                    </Button>
                </div>
            </div >
        );
    }

    if (!user && !error) {
        return <div className="flex h-screen w-full items-center justify-center">
            <div className="text-center">
                <h1 className="text-xl font-bold text-destructive">Authentication Failed</h1>
                <p className="text-muted-foreground mb-4">
                    Your account is not verified.
                </p>

                <Button variant="outline" asChild>
                    <SignUpButton
                    >
                        Go to Sign Up
                    </SignUpButton>
                </Button>
            </div>
        </div>
    }

    return null;
}
