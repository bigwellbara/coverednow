// Admins are only ever created from a trusted shell, never through the app.
// Usage: npm run admin:create -- +263771234567 "Full Name"
import { PrismaClient } from "@prisma/client";

const [phone, name] = process.argv.slice(2);
if (!phone || !/^\+2637[1378]\d{7}$/.test(phone) || !name?.trim()) {
  console.error('Usage: npm run admin:create -- +263771234567 "Full Name"');
  process.exit(1);
}

const db = new PrismaClient();
try {
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.upsert({
      where: { phone },
      update: { role: "ADMIN" },
      create: { phone, name: name.trim(), role: "ADMIN" },
    });
    await tx.auditLog.create({
      data: {
        action: "user.made_admin",
        entity: "User",
        entityId: created.id,
        meta: { source: "create-admin script" },
      },
    });
    return created;
  });
  console.log(`${user.name} (${user.phone}) is an admin.`);
} finally {
  await db.$disconnect();
}
