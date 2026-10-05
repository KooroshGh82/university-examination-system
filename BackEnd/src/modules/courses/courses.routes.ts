import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { asyncRoute } from "../../middleware/asyncRoute.js";
import { coursesController as c } from "./courses.controller.js";
const r = Router();
r.use(authenticate);
r.get(
  "/students/me/courses",
  requireRole("STUDENT"),
  asyncRoute(c.myStudentCourses!),
);
r.get(
  "/professors/me/courses",
  requireRole("PROFESSOR"),
  asyncRoute(c.myProfessorCourses!),
);
r.post("/courses", requireRole("ADMIN", "PROFESSOR"), asyncRoute(c.create!));
r.get(
  "/courses",
  requireRole("ADMIN", "STUDENT", "PROFESSOR"),
  asyncRoute(c.list!),
);
r.get(
  "/courses/:courseId",
  requireRole("ADMIN", "STUDENT", "PROFESSOR"),
  asyncRoute(c.get!),
);
r.patch("/courses/:courseId", requireRole("ADMIN"), asyncRoute(c.update!));
r.delete("/courses/:courseId", requireRole("ADMIN"), asyncRoute(c.remove!));
r.post(
  "/courses/:courseId/enrollments",
  requireRole("ADMIN"),
  asyncRoute(c.addEnrollment!),
);
r.get(
  "/courses/:courseId/enrollments",
  requireRole("ADMIN"),
  asyncRoute(c.listEnrollments!),
);
r.patch(
  "/courses/:courseId/enrollments/:enrollmentId",
  requireRole("ADMIN"),
  asyncRoute(c.updateEnrollment!),
);
r.post(
  "/courses/:courseId/assignments",
  requireRole("ADMIN"),
  asyncRoute(c.addAssignment!),
);
r.get(
  "/courses/:courseId/assignments",
  requireRole("ADMIN"),
  asyncRoute(c.listAssignments!),
);
r.patch(
  "/courses/:courseId/assignments/:assignmentId",
  requireRole("ADMIN"),
  asyncRoute(c.updateAssignment!),
);
export default r;
