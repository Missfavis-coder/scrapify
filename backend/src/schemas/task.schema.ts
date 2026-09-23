import { z } from "zod";

export const createTaskSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      "URL must start with http:// or https://"
    ),
  taskDescription: z
    .string()
    .min(1, "Task description is required")
    .max(2000, "Task description must be under 2000 characters"),
  name: z
    .string()
    .min(1)
    .max(200)
    .optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
