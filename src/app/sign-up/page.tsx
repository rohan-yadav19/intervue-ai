import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { RedirectIfAuthenticated } from "@/components/auth/RedirectIfAuthenticated";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <RedirectIfAuthenticated>
        <AuthForm mode="sign-up" />
      </RedirectIfAuthenticated>
    </Suspense>
  );
}
