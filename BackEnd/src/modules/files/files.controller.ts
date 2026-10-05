import type { Request, RequestHandler } from "express";
import { filesService as s } from "./files.service.js";
const actor = (r: Request) => ({
  id: r.auth!.user.id,
  role: r.auth!.user.role,
});
export const filesController: Record<string, RequestHandler> = {
  questionUpload: async (r, res) =>
    res
      .status(201)
      .json({
        data: await s.uploadQuestion(r.params.examId!, r.file!, actor(r)),
      }),
  answerUpload: async (r, res) =>
    res
      .status(201)
      .json({
        data: await s.uploadAnswer(r.params.attemptId!, r.file!, actor(r)),
      }),
  questionList: async (r, res) =>
    res.json({
      data: { items: await s.questionFiles(r.params.examId!, actor(r)) },
    }),
  questionRemove: async (r, res) => {
    await s.removeQuestion(r.params.examId!, r.params.fileId!, actor(r));
    res.sendStatus(204);
  },
  answerList: async (r, res) =>
    res.json({
      data: { items: await s.answerFiles(r.params.attemptId!, actor(r)) },
    }),
  answerRemove: async (r, res) => {
    await s.removeAnswer(r.params.attemptId!, r.params.fileId!, actor(r));
    res.sendStatus(204);
  },
  download: async (r, res) => {
    const f = await s.download(r.params.fileId!, actor(r));
    res.setHeader("Content-Type", f.mimeType);
    res.setHeader("Content-Length", f.bytes.length.toString());
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${f.downloadName}"`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.send(f.bytes);
  },
};
