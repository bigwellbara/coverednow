import { db } from "@/lib/db";

/** What other modules may ask about students, without reaching into these tables. */
export const prismaStudentDirectory = {
  findForOwner: async (ownerId: string) => {
    const [student, verification] = await Promise.all([
      // Onboarding collects one student per account for now.
      db.student.findFirst({
        where: { ownerId },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }),
      db.verification.findUnique({
        where: { userId: ownerId },
        select: { status: true },
      }),
    ]);
    if (!student) return null;
    return { id: student.id, ownerVerified: verification?.status === "APPROVED" };
  },

  findStudent: (studentId: string) =>
    db.student.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true, level: true },
    }),
};
