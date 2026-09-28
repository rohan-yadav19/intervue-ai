export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
