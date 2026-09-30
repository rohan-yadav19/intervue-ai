import { ROUTES } from "@/lib/constants";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRole(role: string) {
  return formatLabel(role);
}

export function formatInterviewType(type: string) {
  return formatLabel(type);
}

export function formatInterviewStatus(status: string) {
  return formatLabel(status.replace(/_/g, "-"));
}

export function formatInterviewDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return isoDate;
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getSafeRedirectPath(next: string | null | undefined) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  return ROUTES.dashboard;
}
