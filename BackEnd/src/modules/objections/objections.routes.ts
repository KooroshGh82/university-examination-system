import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { asyncRoute } from "../../middleware/asyncRoute.js";
import { objectionsController as c } from "./objections.controller.js";
const r = Router();
r.use(authenticate);
r.post(
  "/grades/:gradeId/objections",
  requireRole("STUDENT"),
  asyncRoute(c.submit!),
);
r.get(
  "/grades/:gradeId/objections",
  requireRole("STUDENT", "PROFESSOR"),
  asyncRoute(c.byGrade!),
);
r.get("/objections", requireRole("STUDENT", "PROFESSOR"), asyncRoute(c.list!));
r.get(
  "/objections/:objectionId",
  requireRole("STUDENT", "PROFESSOR"),
  asyncRoute(c.get!),
);
r.post(
  "/objections/:objectionId/review",
  requireRole("PROFESSOR"),
  asyncRoute(c.review!),
);
r.post(
  "/objections/:objectionId/decision",
  requireRole("PROFESSOR"),
  asyncRoute(c.decide!),
);
export default r;
