"use client";

import { useRouter } from "next/navigation";
import { getUserLabel, useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES, START_INTERVIEW_HREF } from "@/lib/constants";

export function DashboardWelcome() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const name = user ? getUserLabel(user) : "there";

  async function handleSignOut() {
    await signOut();
    router.replace(ROUTES.home);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back, {name}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base dark:text-zinc-400">
          Review past sessions or start a new mock interview. Feedback and
          generation will be wired in later.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <ButtonLink href={START_INTERVIEW_HREF} className="sm:w-auto">
          Start New Interview
        </ButtonLink>
        <Button
          variant="secondary"
          onClick={() => {
            void handleSignOut();
          }}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
