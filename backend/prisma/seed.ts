import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

async function main() {
  const emails = [...new Set((process.env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (emails.length === 0) {
    console.info('No ADMIN_EMAILS configured; skipping admin seed.');
    return;
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) throw new Error('ADMIN_PASSWORD must be set to at least 8 characters to seed admins.');
  for (const email of emails) z.string().email().parse(email);

  const passwordHash = await bcrypt.hash(password, 10);
  for (const email of emails) {
    const displayName = email.slice(0, email.indexOf('@')).slice(0, 50) || 'Admin';
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, emailVerified: true, role: 'admin', status: 'active' },
      create: { email, passwordHash, displayName, emailVerified: true, role: 'admin', status: 'active' },
    });
    console.info(`Seeded admin account: ${email}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('Admin seed failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());