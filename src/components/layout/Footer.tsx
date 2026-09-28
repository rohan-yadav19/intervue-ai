import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
      {APP_NAME} — AI-powered mock interview platform
    </footer>
  );
}
