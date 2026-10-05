import argon2 from "argon2";
import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Prisma, type User, type UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../errors.js";
import { authRepository } from "./auth.repository.js";

const ACCESS_SECONDS = 600;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const tokenHash = (token: string) =>
  crypto.createHmac("sha256", env.REFRESH_PEPPER).update(token).digest("hex");
const newSecret = () => crypto.randomBytes(48).toString("base64url");
const formatToken = (id: string, secret: string) => `${id}.${secret}`;
export const publicUser = (u: User) => ({
  id: u.id,
  universityId: u.universityId,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  isActive: u.isActive,
  mustChangePassword: u.mustChangePassword,
});
export const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
const hasProfile = (u: {
  role: UserRole;
  student: unknown;
  professor: unknown;
}) =>
  u.role === "STUDENT"
    ? !!u.student && !u.professor
    : u.role === "PROFESSOR"
      ? !!u.professor && !u.student
      : !u.student && !u.professor;
const accessToken = (u: User, sid: string) =>
  jwt.sign({ role: u.role, sid }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: u.id,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: ACCESS_SECONDS,
    jwtid: crypto.randomUUID(),
  });
export function verifyAccess(token: string): JwtPayload {
  try {
    const claims = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    if (
      typeof claims === "string" ||
      typeof claims.sub !== "string" ||
      typeof claims.sid !== "string" ||
      typeof claims.role !== "string"
    )
      throw new Error("Invalid claims");
    return claims;
  } catch {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "نشست شما منقضی شده است؛ دوباره وارد شوید.",
    );
  }
}
export const authService = {
  async changePassword(
    user: User,
    sid: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!(await argon2.verify(user.passwordHash, currentPassword)))
      throw new AppError(400, "INVALID_PASSWORD", "گذرواژه فعلی صحیح نیست.");
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: user.id, passwordHash: user.passwordHash },
        data: { passwordHash, mustChangePassword: false },
      });
      if (changed.count !== 1)
        throw new AppError(
          409,
          "PASSWORD_CHANGED",
          "گذرواژه تغییر کرده است؛ دوباره وارد شوید.",
        );
      await tx.authSession.updateMany({
        where: { userId: user.id, id: { not: sid }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  },
  async login(universityId: string, password: string) {
    const u = await authRepository.findByUniversityId(universityId);
    // Equalize common invalid-account timing without revealing whether the ID exists.
    const dummy =
      "$argon2id$v=19$m=65536,t=3,p=1$F5MZXaD8o7Pf/nbHPwV2qw$AsapZWXtWhB3vAFAdpDzrYPWPtuqvCXIPaLZH7SIIUs";
    let valid = false;
    try {
      valid = await argon2.verify(u?.passwordHash ?? dummy, password);
    } catch {
      valid = false;
    }
    if (!u || !valid || !u.isActive || !hasProfile(u))
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "کد یا گذرواژه واردشده صحیح نیست.",
      );
    // Existing provisioned accounts still using the default must also change it.
    if (u.role !== "ADMIN" && password === "123456" && !u.mustChangePassword) {
      await prisma.user.update({
        where: { id: u.id },
        data: { mustChangePassword: true },
      });
      u.mustChangePassword = true;
    }
    if (
      argon2.needsRehash(u.passwordHash, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      })
    ) {
      await prisma.user.update({
        where: { id: u.id },
        data: { passwordHash: await hashPassword(password) },
      });
    }
    const sid = crypto.randomUUID(),
      secret = newSecret(),
      refreshToken = formatToken(sid, secret);
    await prisma.authSession.create({
      data: {
        id: sid,
        userId: u.id,
        tokenHash: tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + SESSION_MS),
      },
    });
    return {
      accessToken: accessToken(u, sid),
      expiresIn: ACCESS_SECONDS,
      user: publicUser(u),
      refreshToken,
    };
  },
  async refresh(raw: string) {
    const match =
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{64})$/i.exec(
        raw,
      );
    if (!match)
      throw new AppError(
        401,
        "INVALID_REFRESH",
        "نشست شما معتبر نیست؛ دوباره وارد شوید.",
      );
    const sid = match[1]!;
    const nextToken = formatToken(sid, newSecret()),
      oldHash = tokenHash(raw);
    const result = await prisma.$transaction(
      async (tx) => {
        const s = await tx.authSession.findUnique({ where: { id: sid } });
        if (!s || s.revokedAt || s.expiresAt <= new Date())
          throw new AppError(
            401,
            "INVALID_REFRESH",
            "نشست شما معتبر نیست؛ دوباره وارد شوید.",
          );
        if (s.tokenHash !== oldHash) {
          if (s.previousTokenHash === oldHash) {
            await tx.authSession.update({
              where: { id: sid },
              data: { revokedAt: new Date() },
            });
            return { replay: true as const };
          }
          throw new AppError(
            401,
            "INVALID_REFRESH",
            "نشست شما معتبر نیست؛ دوباره وارد شوید.",
          );
        }
        const changed = await tx.authSession.updateMany({
          where: {
            id: sid,
            tokenHash: oldHash,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { previousTokenHash: oldHash, tokenHash: tokenHash(nextToken) },
        });
        if (changed.count !== 1)
          throw new AppError(
            401,
            "INVALID_REFRESH",
            "نشست شما معتبر نیست؛ دوباره وارد شوید.",
          );
        const u = await tx.user.findUnique({
          where: { id: s.userId },
          include: { student: true, professor: true },
        });
        if (!u || !u.isActive || !hasProfile(u))
          throw new AppError(
            401,
            "INVALID_REFRESH",
            "نشست شما معتبر نیست؛ دوباره وارد شوید.",
          );
        return {
          replay: false as const,
          accessToken: accessToken(u, sid),
          expiresIn: ACCESS_SECONDS,
          user: publicUser(u),
          refreshToken: nextToken,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (result.replay)
      throw new AppError(
        401,
        "REPLAY_DETECTED",
        "نشست شما به پایان رسیده است؛ دوباره وارد شوید.",
      );
    return result;
  },
  async logout(raw?: string, sidFromAccess?: string) {
    if (sidFromAccess)
      await prisma.authSession.updateMany({
        where: { id: sidFromAccess },
        data: { revokedAt: new Date() },
      });
    else if (raw) {
      const sid = /^([0-9a-f-]{36})\./i.exec(raw)?.[1];
      if (sid)
        await prisma.authSession.updateMany({
          where: { id: sid, tokenHash: tokenHash(raw) },
          data: { revokedAt: new Date() },
        });
    }
  },
  async getActiveUser(id: string, sid: string) {
    const [u, session] = await Promise.all([
      authRepository.findById(id),
      authRepository.findSession(sid),
    ]);
    if (
      !u ||
      !u.isActive ||
      !hasProfile(u) ||
      !session ||
      session.userId !== id ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    )
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "نشست شما به پایان رسیده است؛ دوباره وارد شوید.",
      );
    return u;
  },
};
