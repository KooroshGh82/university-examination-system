import type { RequestHandler } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../errors.js";
import { loginSchema, changePasswordSchema } from "../../validation/auth.js";
import { authService, publicUser, verifyAccess } from "./auth.service.js";
const cookieName = "refresh_token";
const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE === "true",
  sameSite: "strict" as const,
  path: "/api/v1/auth",
};
export const authController: Record<string, RequestHandler> = {
  login: async (req, res) => {
    const { universityId, password } = loginSchema.parse(req.body);
    const { refreshToken, ...data } = await authService.login(
      universityId,
      password,
    );
    res.cookie(cookieName, refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ data });
  },
  refresh: async (req, res) => {
    const raw = req.cookies?.[cookieName];
    if (typeof raw !== "string")
      throw new AppError(
        401,
        "INVALID_REFRESH",
        "لطفاً دوباره وارد حساب خود شوید.",
      );
    const { refreshToken, ...data } = await authService.refresh(raw);
    res.cookie(cookieName, refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ data });
  },
  logout: async (req, res) => {
    const raw =
      typeof req.cookies?.[cookieName] === "string"
        ? (req.cookies[cookieName] as string)
        : undefined;
    const bearer = req.header("authorization");
    let sid: string | undefined;
    if (bearer?.startsWith("Bearer ")) {
      try {
        sid = verifyAccess(bearer.slice(7)).sid;
      } catch {
        /* cookie may still authorize */
      }
    }
    if (!raw && !sid)
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "لطفاً ابتدا وارد حساب خود شوید.",
      );
    await authService.logout(raw, sid);
    res.clearCookie(cookieName, cookieOptions);
    res.sendStatus(204);
  },
  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body,
    );
    await authService.changePassword(
      req.auth!.user,
      req.auth!.sid,
      currentPassword,
      newPassword,
    );
    res.sendStatus(204);
  },
  me: async (req, res) => {
    res.json({ data: publicUser(req.auth!.user) });
  },
};
