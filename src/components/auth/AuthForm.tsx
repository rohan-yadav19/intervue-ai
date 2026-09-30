"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { ROUTES } from "@/lib/constants";
import { getSafeRedirectPath } from "@/lib/utils";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthForm({ mode }: AuthFormProps) {
  const { configured, signInWithEmail, signInWithGoogle, signUpWithEmail } =
    useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";
  const redirectTo = getSafeRedirectPath(searchParams.get("next"));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name.trim() || undefined);
      } else {
        await signInWithEmail(email, password);
      }
      router.replace(redirectTo);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSubmitting(true);

    try {
      await signInWithGoogle();
      router.replace(redirectTo);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isSignUp ? "Create an account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {isSignUp
          ? "Sign up with email or Google to start mock interviews."
          : "Welcome back. Sign in to continue to your interviews."}
      </p>

      {!configured && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to
          .env.local, then restart the dev server.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {isSignUp && (
          <label className="block text-sm">
            <span className="font-medium">Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        )}
        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          type="submit"
          disabled={submitting || !configured}
          fullWidth
        >
          {submitting
            ? "Please wait…"
            : isSignUp
              ? "Sign up"
              : "Sign in"}
        </Button>
      </form>

      <div className="mt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={submitting || !configured}
          onClick={handleGoogleSignIn}
          fullWidth
        >
          Continue with Google
        </Button>
      </div>

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={
            isSignUp
              ? `${ROUTES.signIn}?next=${encodeURIComponent(redirectTo)}`
              : `${ROUTES.signUp}?next=${encodeURIComponent(redirectTo)}`
          }
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
