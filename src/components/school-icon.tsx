import { Building2, GraduationCap, School } from "lucide-react";
import type { BillerType } from "@/modules/billing/domain/biller";

export function SchoolIcon({ type, className }: { type: BillerType; className?: string }) {
  const Icon = type === "UNIVERSITY" ? GraduationCap : type === "COLLEGE" ? Building2 : School;
  return <Icon className={className} aria-hidden />;
}
