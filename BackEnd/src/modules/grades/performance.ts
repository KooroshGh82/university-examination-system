import { Prisma } from "@prisma/client";
export type PerformanceRow = {
  gradeId: string;
  examId: string;
  examTitleFa: string;
  courseId: string;
  courseCode: string;
  termCode: string;
  startsAt: Date;
  score: Prisma.Decimal;
  maxPoints: Prisma.Decimal;
};
const pct = (score: Prisma.Decimal, max: Prisma.Decimal) =>
  score.div(max).mul(100);
const fixed = (value: Prisma.Decimal) =>
  value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
export function summarizePerformance(rows: PerformanceRow[]) {
  const sorted = [...rows].sort(
    (a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime() ||
      a.examId.localeCompare(b.examId),
  );
  let total = new Prisma.Decimal(0),
    max = new Prisma.Decimal(0),
    sumPercent = new Prisma.Decimal(0);
  const byCourse = new Map<
    string,
    {
      courseId: string;
      courseCode: string;
      termCode: string;
      items: typeof sorted;
    }
  >();
  for (const r of sorted) {
    total = total.plus(r.score);
    max = max.plus(r.maxPoints);
    sumPercent = sumPercent.plus(pct(r.score, r.maxPoints));
    const key = r.courseId;
    if (!byCourse.has(key))
      byCourse.set(key, {
        courseId: key,
        courseCode: r.courseCode,
        termCode: r.termCode,
        items: [],
      });
    byCourse.get(key)!.items.push(r);
  }
  const examSeries = (items: PerformanceRow[]) => {
    let previous: Prisma.Decimal | null = null;
    return items.map((r) => {
      const percentage = pct(r.score, r.maxPoints),
        delta = previous === null ? null : fixed(percentage.minus(previous));
      previous = percentage;
      return {
        gradeId: r.gradeId,
        examId: r.examId,
        examTitleFa: r.examTitleFa,
        startsAt: r.startsAt,
        score: r.score.toString(),
        maxPoints: r.maxPoints.toString(),
        percentage: fixed(percentage),
        deltaFromPreviousPercentagePoints: delta,
      };
    });
  };
  const courses = [...byCourse.values()].map((c) => {
    const earned = c.items.reduce(
      (n, r) => n.plus(r.score),
      new Prisma.Decimal(0),
    );
    const possible = c.items.reduce(
      (n, r) => n.plus(r.maxPoints),
      new Prisma.Decimal(0),
    );
    const percentages = c.items.reduce(
      (n, r) => n.plus(pct(r.score, r.maxPoints)),
      new Prisma.Decimal(0),
    );
    return {
      courseId: c.courseId,
      courseCode: c.courseCode,
      termCode: c.termCode,
      examCount: c.items.length,
      totalScore: earned.toString(),
      totalMaxPoints: possible.toString(),
      averagePercentage: fixed(percentages.div(c.items.length)),
      weightedPercentage: fixed(earned.div(possible).mul(100)),
      exams: examSeries(c.items),
    };
  });
  return {
    examCount: sorted.length,
    totalScore: total.toString(),
    totalMaxPoints: max.toString(),
    averagePercentage: sorted.length
      ? fixed(sumPercent.div(sorted.length))
      : null,
    weightedPercentage: sorted.length ? fixed(total.div(max).mul(100)) : null,
    courses,
  };
}
