import { Router } from "express";
import {
  authenticate,
  requireRole,
  requireStudent,
  requireProfessor,
  requireSelfStudent,
  requireAssignedCourse,
  requireEnrolledCourse,
} from "../../middleware/authenticate.js";
import { asyncRoute } from "../../middleware/asyncRoute.js";
import { usersController } from "./users.controller.js";
const router = Router();
router.post(
  "/students",
  authenticate,
  requireRole("ADMIN"),
  asyncRoute(usersController.createStudent!),
);
router.post(
  "/professors",
  authenticate,
  requireRole("ADMIN"),
  asyncRoute(usersController.createProfessor!),
);
router.get(
  "/students/me",
  authenticate,
  requireStudent,
  usersController.ownProfile!,
);
router.get(
  "/professors/me",
  authenticate,
  requireProfessor,
  usersController.ownProfile!,
);
router.get(
  "/students/:studentId/private",
  authenticate,
  requireStudent,
  requireSelfStudent(),
  usersController.ownProfile!,
);
router.get(
  "/courses/:courseId/student-access",
  authenticate,
  requireStudent,
  asyncRoute(requireEnrolledCourse()),
  (_req, res) => res.json({ data: { authorized: true } }),
);
router.get(
  "/courses/:courseId/professor-access",
  authenticate,
  requireProfessor,
  asyncRoute(requireAssignedCourse()),
  (_req, res) => res.json({ data: { authorized: true } }),
);
export default router;
