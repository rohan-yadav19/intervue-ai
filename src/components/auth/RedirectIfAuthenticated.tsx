"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSafeRedirectPath } from "@/lib/utils";

export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      router.replace(getSafeRedirectPath(searchParams.get("next")));
    }
  }, [loading, router, searchParams, user]);

  if (loading || user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return children;
}
