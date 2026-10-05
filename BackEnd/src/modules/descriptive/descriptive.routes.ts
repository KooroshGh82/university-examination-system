import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { asyncRoute } from "../../middleware/asyncRoute.js";
import { descriptiveController as c } from "./descriptive.controller.js";
const r = Router();
r.put(
  "/attempts/:attemptId/grade",
  authenticate,
  requireRole("PROFESSOR"),
  asyncRoute(c.saveGrade!),
);
export default r;
