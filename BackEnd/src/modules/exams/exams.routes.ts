import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { asyncRoute } from "../../middleware/asyncRoute.js";
import { examsController as c } from "./exams.controller.js";
const r = Router();
r.use(authenticate);
const staff = requireRole("PROFESSOR", "ADMIN");
r.post("/exams", staff, asyncRoute(c.create!));
r.get(
  "/exams",
  requireRole("STUDENT", "PROFESSOR", "ADMIN"),
  asyncRoute(c.list!),
);
r.get(
  "/exams/:examId",
  requireRole("STUDENT", "PROFESSOR", "ADMIN"),
  asyncRoute(c.get!),
);
r.patch("/exams/:examId", staff, asyncRoute(c.update!));
r.delete("/exams/:examId", staff, asyncRoute(c.remove!));
r.post("/exams/:examId/publish", staff, asyncRoute(c.publish!));
r.post("/exams/:examId/close", staff, asyncRoute(c.close!));
r.post("/exams/:examId/cancel", staff, asyncRoute(c.cancel!));
r.get("/exams/:examId/questions", staff, asyncRoute(c.questions!));
r.post("/exams/:examId/questions", staff, asyncRoute(c.addQuestion!));
r.put("/exams/:examId/questions/order", staff, asyncRoute(c.reorderQuestions!));
r.patch(
  "/exams/:examId/questions/:questionId",
  staff,
  asyncRoute(c.updateQuestion!),
);
r.delete(
  "/exams/:examId/questions/:questionId",
  staff,
  asyncRoute(c.removeQuestion!),
);
r.post(
  "/exams/:examId/questions/:questionId/options",
  staff,
  asyncRoute(c.addOption!),
);
r.patch(
  "/exams/:examId/questions/:questionId/options/:optionId",
  staff,
  asyncRoute(c.updateOption!),
);
r.delete(
  "/exams/:examId/questions/:questionId/options/:optionId",
  staff,
  asyncRoute(c.removeOption!),
);
r.put(
  "/exams/:examId/questions/:questionId/options/:optionId/correct",
  staff,
  asyncRoute(c.setCorrect!),
);
export default r;
