import { z } from "zod";

const r2EnvSchema = z.object({
  R2_ENDPOINT: z.string().url(),
  R2_BUCKET: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
});

export type BookEnvironment = Readonly<Record<string, string | undefined>>;

export type R2Environment = z.infer<typeof r2EnvSchema>;

export function readR2Environment(environment: BookEnvironment = process.env): R2Environment | undefined {
  const candidate = {
    R2_ENDPOINT: environment.R2_ENDPOINT,
    R2_BUCKET: environment.R2_BUCKET,
    R2_ACCESS_KEY_ID: environment.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: environment.R2_SECRET_ACCESS_KEY,
  };
  if (Object.values(candidate).every((value) => value === undefined || value === "")) {
    return undefined;
  }
  return r2EnvSchema.parse(candidate);
}
