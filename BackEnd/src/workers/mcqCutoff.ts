import { prisma } from "../db/prisma.js";
import { submissionsService } from "../modules/submissions/submissions.service.js";
let running = false;
export async function runMcqCutoffBatch() {
  if (running) return;
  running = true;
  try {
    const due = await prisma.$queryRaw<{ id: string }[]>`
      SELECT a.id FROM exam_attempts a JOIN exams e ON e.id=a.exam_id
      WHERE a.status='IN_PROGRESS' AND e.type='MULTIPLE_CHOICE' AND a.deadline_at<=clock_timestamp()
      ORDER BY a.deadline_at ASC LIMIT 100`;
    for (const a of due) {
      try {
        await submissionsService.finalizeDue(a.id);
      } catch (e) {
        console.error("MCQ cutoff failed", a.id, e);
      }
    }
  } finally {
    running = false;
  }
}
export function startMcqCutoffWorker() {
  const timer = setInterval(
    () =>
      void runMcqCutoffBatch().catch((e) =>
        console.error("MCQ cutoff batch failed", e),
      ),
    5000,
  );
  timer.unref();
  return () => clearInterval(timer);
}
