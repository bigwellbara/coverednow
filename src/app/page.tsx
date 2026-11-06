import { GraduationCap } from "lucide-react";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 640, margin: "15vh auto", padding: 24 }}>
      <GraduationCap size={40} aria-hidden />
      <h1>CoveredNow</h1>
      <p>School-confirmed fee bills, paid directly to the school. Coming soon.</p>
    </main>
  );
}