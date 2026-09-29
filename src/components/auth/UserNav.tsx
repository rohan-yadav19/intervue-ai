"use client";

import { getUserLabel, useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/lib/constants";

export function UserNav() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <span className="hidden h-9 w-24 rounded-full bg-zinc-100 sm:inline-block dark:bg-zinc-800" />
    );
  }

  if (!user) {
    return (
      <ButtonLink
        href={ROUTES.signIn}
        variant="secondary"
        className="h-9 px-4"
      >
        Sign In
      </ButtonLink>
    );
  }

  return (
    <div className="flex max-w-[70vw] items-center gap-2 sm:max-w-none sm:gap-3">
      <p className="truncate text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
        {getUserLabel(user)}
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          void signOut();
        }}
        className="h-9 px-4"
      >
        Sign Out
      </Button>
    </div>
  );
}
