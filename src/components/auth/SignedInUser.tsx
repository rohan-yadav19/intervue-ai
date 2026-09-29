"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export function SignedInUser() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const name = user.displayName;
  const email = user.email;

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      Signed in as {name ? `${name} (${email})` : email}
    </p>
  );
}
