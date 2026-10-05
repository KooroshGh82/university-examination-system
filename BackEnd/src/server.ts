import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { startMcqCutoffWorker } from "./workers/mcqCutoff.js";
import { startDescriptiveWorker } from "./workers/descriptiveCutoff.js";
const server = app.listen(env.PORT, () =>
  console.log(`Authentication API listening on ${env.PORT}`),
);
const stopWorker = startMcqCutoffWorker();
const stopDescriptiveWorker = startDescriptiveWorker();
process.on("SIGTERM", () => {
  stopWorker();
  stopDescriptiveWorker();
  server.close(() => void prisma.$disconnect());
});
process.on("SIGINT", () => {
  stopWorker();
  stopDescriptiveWorker();
  server.close(() => void prisma.$disconnect());
});
