import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  withinWindow,
  OBJECTION_WINDOW_MS,
} from "../src/modules/objections/objections.rules.js";
import { summarizePerformance } from "../src/modules/grades/performance.js";

test("objection deadline excludes the exact 168-hour boundary", () => {
  const anchor = new Date("2026-09-01T09:00:00Z");
  assert.equal(
    withinWindow(new Date(anchor.getTime() + OBJECTION_WINDOW_MS - 1), anchor),
    true,
  );
  assert.equal(
    withinWindow(new Date(anchor.getTime() + OBJECTION_WINDOW_MS), anchor),
    false,
  );
});
test("published exam percentages compare across different maximum scores without floating-point loss", () => {
  const p = summarizePerformance([
    {
      gradeId: "g2",
      examId: "e2",
      examTitleFa: "Final",
      courseId: "c",
      courseCode: "SE301",
      termCode: "1405-1",
      startsAt: new Date("2026-10-02T10:00:00Z"),
      score: new Prisma.Decimal("14.50"),
      maxPoints: new Prisma.Decimal("20.00"),
    },
    {
      gradeId: "g1",
      examId: "e1",
      examTitleFa: "Midterm",
      courseId: "c",
      courseCode: "SE301",
      termCode: "1405-1",
      startsAt: new Date("2026-09-01T10:00:00Z"),
      score: new Prisma.Decimal("8.00"),
      maxPoints: new Prisma.Decimal("10.00"),
    },
  ]);
  assert.equal(p.totalScore, "22.5");
  assert.equal(p.totalMaxPoints, "30");
  assert.equal(p.averagePercentage, "76.25");
  assert.equal(p.weightedPercentage, "75.00");
  assert.deepEqual(
    p.courses[0]?.exams.map((x) => x.percentage),
    ["80.00", "72.50"],
  );
  assert.equal(
    p.courses[0]?.exams[1]?.deltaFromPreviousPercentagePoints,
    "-7.50",
  );
});
test("empty published-grade set has no invented average", () => {
  const p = summarizePerformance([]);
  assert.equal(p.examCount, 0);
  assert.equal(p.averagePercentage, null);
  assert.equal(p.weightedPercentage, null);
});
