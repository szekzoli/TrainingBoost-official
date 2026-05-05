import { z } from "zod";

export const applySchema = z.object({
  type: z.enum(["morning-boost", "personal-training", "online-programs", "contact"]),
  name: z.string().min(1, "A név megadása kötelező"),
  email: z.string().email("Érvénytelen email cím"),
  phone: z.string().optional(),
  message: z.string().optional(),
  slot: z.string().optional(),
});

export type ApplyInput = z.infer<typeof applySchema>;
