// Creates test accounts and schools for local development, through the real
// services, so documents are encrypted and everything is in the audit log.
// Safe to run repeatedly: anything that already exists is left alone.
//
// Usage: npm run db:seed-test
import { db } from "@/lib/db";
import { getBillerService } from "@/modules/billing";
import type { BillerDetails, PayoutDetails } from "@/modules/billing/domain/biller";
import { getVerificationService } from "@/modules/identity";
import type { DocumentKind } from "@/modules/identity/domain/verification";

type Role = "ADMIN" | "STUDENT" | "GUARDIAN";
type Stage = "new" | "in-review" | "sent-back" | "verified";

type TestAccount = {
  phone?: string;
  email?: string;
  name: string;
  role: Role;
  stage?: Stage;
};

const ADMIN: TestAccount = {
  phone: "+263771000001",
  name: "Test Admin",
  role: "ADMIN",
};

const APPLICANTS: TestAccount[] = [
  { phone: "+263771000002", name: "Test Student New", role: "STUDENT", stage: "new" },
  { phone: "+263771000003", name: "Test Guardian New", role: "GUARDIAN", stage: "new" },
  { phone: "+263771000004", name: "Test Student InReview", role: "STUDENT", stage: "in-review" },
  { phone: "+263771000005", name: "Test Student SentBack", role: "STUDENT", stage: "sent-back" },
  { phone: "+263771000006", name: "Test Student Verified", role: "STUDENT", stage: "verified" },
  { phone: "+263771000007", name: "Test Guardian Verified", role: "GUARDIAN", stage: "verified" },
  // example.com is reserved for testing, so this can never reach a real person.
  { email: "test.student@example.com", name: "Test Student Email", role: "STUDENT", stage: "verified" },
];

const SCHOOLS: Array<{
  details: BillerDetails;
  contactPhone: string;
  payout?: PayoutDetails;
  verified: boolean;
}> = [
  {
    details: { name: "Test University", type: "UNIVERSITY", city: "Harare" },
    contactPhone: "+263771000011",
    payout: {
      method: "BANK",
      bankName: "Test Bank",
      branch: "Harare",
      accountName: "Test University",
      accountNumber: "100000000011",
    },
    verified: true,
  },
  {
    details: { name: "Test High School", type: "HIGH_SCHOOL", city: "Bulawayo" },
    contactPhone: "+263771000012",
    payout: {
      method: "MOBILE_MONEY",
      provider: "EcoCash",
      accountName: "Test High School",
      number: "+263771000022",
    },
    verified: true,
  },
  {
    details: { name: "Test College (not verified)", type: "COLLEGE", city: "Mutare" },
    contactPhone: "+263771000013",
    verified: false,
  },
];

function refuseUnlessLocal() {
  const fail = (reason: string) => {
    console.error(`Not seeding: ${reason}`);
    process.exit(1);
  };

  if (process.env.NODE_ENV === "production") fail("this is production.");

  const host = new URL(process.env.DATABASE_URL ?? "postgresql://missing").hostname;
  if (!/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    fail(`the database at ${host} does not look local.`);
  }

  // These numbers are made up, but may belong to real people.
  if (process.env.MESSAGE_DELIVERY === "whatsapp") {
    fail(
      'MESSAGE_DELIVERY is "whatsapp", so signing in would message these made-up numbers. Clear it first.',
    );
  }
}

/** A small valid PDF, so the document opens when an admin clicks it. */
function samplePdf(label: string): Uint8Array {
  const text = `SAMPLE TEST DOCUMENT: ${label}`.replace(/[()\\]/g, "");
  const stream = `BT /F1 16 Tf 40 780 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

async function ensureUser({ phone, email, name, role }: TestAccount) {
  const existing = await db.user.findFirst({
    where: phone ? { phone } : { email: email! },
  });
  if (existing) return { user: existing, created: false };
  const user = await db.user.create({ data: { phone, email, name, role } });
  return { user, created: true };
}

async function advanceApplicant(account: TestAccount, adminId: string) {
  const { user, created } = await ensureUser(account);
  if (!created || account.stage === "new") return;

  const role = account.role === "GUARDIAN" ? "GUARDIAN" : "STUDENT";
  const applicant = { id: user.id, role } as const;
  const service = getVerificationService();

  const check = (result: { ok: boolean; error?: string }) => {
    if (!result.ok) throw new Error(`${account.name}: ${result.error}`);
  };

  check(
    await service.saveStudent(applicant, {
      firstName: role === "GUARDIAN" ? "Test" : account.name.split(" ")[1]!,
      lastName: "Learner",
      level: role === "GUARDIAN" ? "Form 3" : "Year 2",
    }),
  );

  const kinds: DocumentKind[] = ["NATIONAL_ID", "STUDENT_ID"];
  for (const kind of kinds) {
    check(
      await service.uploadDocument(
        applicant,
        kind,
        samplePdf(`${kind} for ${account.name}`),
      ),
    );
  }
  check(await service.submit(applicant));
  if (account.stage === "in-review") return;

  const { id } = await db.verification.findUniqueOrThrow({
    where: { userId: user.id },
    select: { id: true },
  });
  check(
    await service.review(
      id,
      adminId,
      account.stage === "sent-back"
        ? { decision: "REJECTED", reason: "This is a sample reason. The ID photo is blurry." }
        : { decision: "APPROVED" },
    ),
  );
}

async function ensureSchool(school: (typeof SCHOOLS)[number], adminId: string) {
  const existing = await db.biller.findFirst({
    where: { name: school.details.name },
    select: { id: true },
  });
  if (existing) return;

  const service = getBillerService();
  const id = await service.create(school.details, adminId);
  await service.addContact(
    id,
    {
      name: `Bursar at ${school.details.name}`,
      phone: school.contactPhone,
      roleTitle: "Bursar",
    },
    adminId,
  );
  if (school.payout) await service.savePayout(id, school.payout, adminId);

  if (school.verified) {
    const { id: contactId } = await db.billerContact.findFirstOrThrow({
      where: { billerId: id },
      select: { id: true },
    });
    await service.verifyContact(contactId, "Test data, not really checked", adminId);
    const result = await service.verify(id, adminId);
    if (!result.ok) throw new Error(`${school.details.name}: ${result.error}`);
  }
}

async function main() {
  refuseUnlessLocal();

  const { user: admin } = await ensureUser(ADMIN);
  for (const account of APPLICANTS) await advanceApplicant(account, admin.id);
  for (const school of SCHOOLS) await ensureSchool(school, admin.id);

  // Clears rate limits, so heavy testing can carry on after a re-run.
  await db.otpChallenge.deleteMany({
    where: {
      address: { in: [ADMIN, ...APPLICANTS].map((a) => (a.phone ?? a.email)!) },
    },
  });

  console.log("\nTest accounts (sign-in codes print in the npm run dev terminal):\n");
  for (const { phone, email, name, stage } of [ADMIN, ...APPLICANTS]) {
    const address = phone?.replace("+263", "0") ?? email;
    console.log(`  ${address}  ${name}${stage ? ` (${stage})` : ""}`);
  }
  console.log("\nSchools:\n");
  for (const { details, verified } of SCHOOLS) {
    console.log(`  ${details.name}, ${details.city}${verified ? " (verified)" : ""}`);
  }
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
