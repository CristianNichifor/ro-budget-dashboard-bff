import { z } from "zod";

/**
 * Schema for data/bnr-inflation.json — the BNR monetary context seed.
 * Used at runtime (fail-fast validation on import) and by the update script.
 */
export const bnrDataSchema = z.object({
  updatedAt: z.string(),
  source: z.string(),
  inflationTarget: z.number().positive(),
  series: z.array(
    z.object({
      year: z.number().int(),
      cpiPercent: z.number().positive(),
      avgNetSalary: z.number().positive(),
    })
  ),
  debt: z.object({
    total: z.string(),
    interestPayment: z.string(),
    averageRate: z.number(),
  }),
});

export type BnrData = z.infer<typeof bnrDataSchema>;

/** Minimal BNR export accepted by the update script (inflation only). */
export const bnrExportSchema = z.array(
  z.object({
    year: z.number().int(),
    cpiPercent: z.number().positive(),
  })
);

export type BnrExport = z.infer<typeof bnrExportSchema>;
