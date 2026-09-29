import { ROUTES } from "@/lib/constants";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getSafeRedirectPath(next: string | null | undefined) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  return ROUTES.dashboard;
}
