import { ButtonLink } from "@/components/ui/ButtonLink";
import { APP_NAME, ROUTES, START_INTERVIEW_HREF } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.12),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(129,140,248,0.16),_transparent_55%)]"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
        <p className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          AI-powered mock interviews
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl dark:text-zinc-50">
          Practice interviews with {APP_NAME}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8 dark:text-zinc-400">
          {APP_NAME} is an AI-powered mock interview platform that helps you
          rehearse real interview conversations, get structured feedback, and
          walk into the real thing with more confidence.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href={START_INTERVIEW_HREF}>Start Interview</ButtonLink>
          <ButtonLink href={ROUTES.interviews} variant="secondary">
            View Interviews
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
