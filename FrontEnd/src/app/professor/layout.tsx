import { ProfessorShell } from "@/components/professor-shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProfessorShell>{children}</ProfessorShell>;
}
