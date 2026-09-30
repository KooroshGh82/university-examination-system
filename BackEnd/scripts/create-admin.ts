import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
const id = process.env.BOOTSTRAP_ADMIN_ID;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const fullName = process.env.BOOTSTRAP_ADMIN_NAME;
if (!id || !password || !fullName || password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
  throw new Error('Set BOOTSTRAP_ADMIN_ID, BOOTSTRAP_ADMIN_NAME and a strong BOOTSTRAP_ADMIN_PASSWORD (12+ characters, upper/lowercase/digit)');
}
const db = new PrismaClient();
try {
  const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
  await db.user.create({ data: { universityId: id, fullName, role: 'ADMIN', passwordHash: hash } });
  console.log('Admin created. Clear bootstrap environment variables now.');
} finally { await db.$disconnect(); }
