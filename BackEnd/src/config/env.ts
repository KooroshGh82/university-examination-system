import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  JWT_SECRET: z.string().min(32),
  REFRESH_PEPPER: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default("university-exams"),
  JWT_AUDIENCE: z.string().min(1).default("university-exams-api"),
  APP_ORIGIN: z.string().url(),
  COOKIE_SECURE: z.enum(["true", "false"]).default("true"),
  STORAGE_DIR: z.string().startsWith("/"),
});
export const env = schema.parse(process.env);
