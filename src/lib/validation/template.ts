import { z } from "zod";

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
