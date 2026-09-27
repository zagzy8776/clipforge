import { z } from "zod";

export type ProgressStage =
  | "probe"
  | "audio-extract"
  | "transcribe"
  | "understand"
  | "candidates"
  | "score"
  | "select"
  | "render"
  | "finalize";

export const progressStageSchema = z.enum([
  "probe",
  "audio-extract",
  "transcribe",
  "understand",
  "candidates",
  "score",
  "select",
  "render",
  "finalize",
]);

export interface ProgressEvent {
  stage: ProgressStage;
  /** 0..1 overall. */
  progress: number;
  message: string;
  detail?: Record<string, string | number | boolean | null>;
}

export const progressEventSchema = z.object({
  stage: progressStageSchema,
  progress: z.number().min(0).max(1),
  message: z.string(),
  detail: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export type ProgressReporter = (event: ProgressEvent) => void;
