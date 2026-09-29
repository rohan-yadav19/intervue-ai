import { RequireAuth } from "@/components/auth/RequireAuth";

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
