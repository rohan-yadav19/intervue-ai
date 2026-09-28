import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES, START_INTERVIEW_HREF } from "@/lib/constants";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-3">
          <ButtonLink
            href={ROUTES.interviews}
            variant="secondary"
            className="hidden h-9 px-4 sm:inline-flex"
          >
            View Interviews
          </ButtonLink>
          <ButtonLink href={START_INTERVIEW_HREF} className="h-9 px-4">
            Start Interview
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
