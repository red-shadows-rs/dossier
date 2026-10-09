import { z } from "zod";
import { LANG_MODES, TEMPLATE_TYPES } from "@/lib/constants";

export const templateMilestoneRowSchema = z.object({
  titleAr: z.string().min(1).max(120),
  titleEn: z.string().min(1).max(120),
  percentBp: z.number().int().min(1).max(10000).optional(),
  triggerNoteAr: z.string().max(200).optional(),
  triggerNoteEn: z.string().max(200).optional(),
});

export const templateDefaultsSchema = z
  .object({
    hasFees: z.boolean().default(true),
    titleAr: z.string().max(200).optional(),
    titleEn: z.string().max(200).optional(),
    paymentTermsDays: z.number().int().min(0).max(365).optional(),
    milestonePreset: z
      .object({
        mode: z.enum(["percent", "fixed"]),
        rows: z.array(templateMilestoneRowSchema).min(1).max(24),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const preset = data.milestonePreset;
    if (!preset || preset.mode !== "percent") return;
    const sum = preset.rows.reduce((acc, row) => acc + (row.percentBp ?? 0), 0);
    if (sum !== 10000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["milestonePreset", "rows"],
        message: "errors.milestonesSumMismatch",
      });
    }
  });

export type TemplateDefaults = z.infer<typeof templateDefaultsSchema>;

const optText = (max = 300) =>
  z
    .string()
    .trim()
    .max(max, "errors.tooLong")
    .optional()
    .transform((value) => (value ? value : null));

export const templateClauseInputSchema = z.object({
  key: z.string().trim().max(60).nullable().optional(),
  titleAr: z.string().trim().min(1, "errors.required").max(200, "errors.tooLong"),
  titleEn: z.string().trim().min(1, "errors.required").max(200, "errors.tooLong"),
  bodyAr: z
    .string()
    .trim()
    .min(1, "errors.required")
    .max(20000, "errors.tooLong"),
  bodyEn: z
    .string()
    .trim()
    .min(1, "errors.required")
    .max(20000, "errors.tooLong"),
});

export type TemplateClauseInput = z.infer<typeof templateClauseInputSchema>;

export const templateInputSchema = z.object({
  type: z.enum(TEMPLATE_TYPES).default("contract"),
  nameAr: z.string().trim().min(1, "errors.required").max(200, "errors.tooLong"),
  nameEn: z.string().trim().min(1, "errors.required").max(200, "errors.tooLong"),
  descriptionAr: optText(),
  descriptionEn: optText(),
  defaultLanguageMode: z.enum(LANG_MODES).default("bilingual"),
  defaults: templateDefaultsSchema,
  clauses: z
    .array(templateClauseInputSchema)
    .min(1, "errors.required")
    .max(60, "errors.tooLong"),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;
