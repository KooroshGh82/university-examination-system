import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
if (process.env.NODE_ENV === "production")
  throw new Error("Demo seeding is disabled in production.");
const password = process.env.DEMO_SEED_PASSWORD;
if (
  !password ||
  password.length < 12 ||
  !/[A-Z]/.test(password) ||
  !/[a-z]/.test(password) ||
  !/[0-9]/.test(password)
)
  throw new Error(
    "Set DEMO_SEED_PASSWORD: 12+ characters with uppercase, lowercase and digit.",
  );
const names = {
  STUDENT: [
    "کیان رضایی",
    "نگار محمدی",
    "علی احمدی",
    "سارا کریمی",
    "امیر حسینی",
    "نازنین موسوی",

    "محمد مرادی",
    "زهرا جعفری",
    "رضا قاسمی",
    "فاطمه رحیمی",
    "آرمان صادقی",
    "مریم اکبری",
    "پارسا کاظمی",
    "هستی نوری",
    "سینا شریفی",
    "یلدا حیدری",
    "پویا امینی",
    "شیدا رستمی",
    "سامان قربانی",
    "مهسا عباسی",
  ],
  PROFESSOR: [
    "دکتر مهدی احمدی",
    "دکتر لیلا محمدی",
    "دکتر حمید رضایی",
    "دکتر نسترن کریمی",
    "دکتر سعید موسوی",
  ],
  ADMIN: ["مدیر نمونه اول", "مدیر نمونه دوم"],
};
const starts = { STUDENT: 40310001, PROFESSOR: 980001, ADMIN: 900001 };
const accounts = Object.entries(names).flatMap(([role, list]) =>
  list.map((fullName, i) => ({
    universityId: String(starts[role] + i),
    fullName,
    role,
  })),
);
const db = new PrismaClient();
try {
  const hashes = [];
  for (const account of accounts)
    hashes.push(
      await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      }),
    );
  const result = await db.$transaction(
    async (tx) => {
      const output = [];
      for (const [i, account] of accounts.entries()) {
        const existing = await tx.user.findUnique({
          where: { universityId: account.universityId },
          include: { student: true, professor: true },
        });
        if (existing) {
          if (
            existing.role !== account.role ||
            (account.role === "STUDENT" && !existing.student) ||
            (account.role === "PROFESSOR" && !existing.professor)
          )
            throw new Error(
              "Conflicting role/profile for " +
                account.universityId +
                ". New accounts rolled back.",
            );
          output.push({ ...account, status: "Existing; unchanged" });
          continue;
        }
        await tx.user.create({
          data: {
            ...account,
            passwordHash: hashes[i],
            isActive: true,
            ...(account.role === "STUDENT" ? { student: { create: {} } } : {}),
            ...(account.role === "PROFESSOR"
              ? { professor: { create: {} } }
              : {}),
          },
        });
        output.push({ ...account, status: "Created" });
      }
      return output;
    },
    { timeout: 30000 },
  );
  console.table(result);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Seeding failed.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
