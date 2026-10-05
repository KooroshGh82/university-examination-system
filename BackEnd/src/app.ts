import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import coursesRoutes from "./modules/courses/courses.routes.js";
import examsRoutes from "./modules/exams/exams.routes.js";
import submissionsRoutes from "./modules/submissions/submissions.routes.js";
import descriptiveRoutes from "./modules/descriptive/descriptive.routes.js";
import filesRoutes from "./modules/files/files.routes.js";
import gradesRoutes from "./modules/grades/grades.routes.js";
import objectionsRoutes from "./modules/objections/objections.routes.js";
import { authenticate } from "./middleware/authenticate.js";
import { AppError } from "./errors.js";
import { errorHandler } from "./errors.js";
import { env } from "./config/env.js";
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.header("origin") === env.APP_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", env.APP_ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", authenticate, (req, _res, next) => {
  if (
    req.auth!.user.role === "ADMIN" &&
    !(
      req.path.startsWith("/admin/") ||
      (req.method === "POST" && ["/students", "/professors"].includes(req.path))
    )
  )
    return next(
      new AppError(
        403,
        "FORBIDDEN",
        "مدیر فقط می‌تواند حساب‌ها و دانشجویان آزمون را مدیریت کند.",
      ),
    );
  next();
});
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", coursesRoutes);
app.use("/api/v1", examsRoutes);
app.use("/api/v1", submissionsRoutes);
app.use("/api/v1", descriptiveRoutes);
app.use("/api/v1", filesRoutes);
app.use("/api/v1", gradesRoutes);
app.use("/api/v1", objectionsRoutes);
app.use("/api/v1", usersRoutes);
app.use((_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "صفحه یا مسیر مورد نظر یافت نشد." },
  });
});
app.use(errorHandler);
export default app;
