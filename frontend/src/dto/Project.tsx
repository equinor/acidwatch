import * as z from "zod";

export const Project = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    owner: z.string(),
    owner_id: z.string(),
    private: z.boolean(),
    access_ids: z.array(z.string()),
    date: z.date(),
});

export type Project = z.infer<typeof Project>;
