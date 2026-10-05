import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { asyncRoute } from "../../middleware/asyncRoute.js";
import { acceptFile } from "./files.middleware.js";
import { filesController as c } from "./files.controller.js";
const r = Router();
r.use(authenticate);
r.post(
  "/exams/:examId/question-files",
  requireRole("PROFESSOR", "ADMIN"),
  acceptFile,
  asyncRoute(c.questionUpload!),
);
r.get(
  "/exams/:examId/question-files",
  requireRole("STUDENT", "PROFESSOR", "ADMIN"),
  asyncRoute(c.questionList!),
);
r.delete(
  "/exams/:examId/question-files/:fileId",
  requireRole("PROFESSOR", "ADMIN"),
  asyncRoute(c.questionRemove!),
);
r.post(
  "/attempts/:attemptId/files",
  requireRole("STUDENT"),
  acceptFile,
  asyncRoute(c.answerUpload!),
);
r.get(
  "/attempts/:attemptId/files",
  requireRole("STUDENT", "PROFESSOR"),
  asyncRoute(c.answerList!),
);
r.delete(
  "/attempts/:attemptId/files/:fileId",
  requireRole("STUDENT"),
  asyncRoute(c.answerRemove!),
);
r.get(
  "/files/:fileId/download",
  requireRole("STUDENT", "PROFESSOR", "ADMIN"),
  asyncRoute(c.download!),
);
export default r;
