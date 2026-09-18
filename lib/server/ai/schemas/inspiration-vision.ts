import { z } from "zod";

const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "6-digit hex required");

const ColorEntry = z.object({
  name: z.string().min(1).max(40),
  hex: HexColor,
});

const TypeEntry = z.object({
  role: z.string().min(1).max(40),
  fontFamily: z.string().min(1).max(80),
  fontSize: z.number().int().min(8).max(200),
  fontWeight: z.number().int().min(100).max(900),
  lineHeight: z.number().min(0.8).max(3),
  letterSpacing: z.number().optional(),
});

export const InspirationVisionTokensSchema = z.object({
  brand: z.string().min(1).max(80),
  vibe: z.string().min(10).max(400),
  colors: z.array(ColorEntry).min(2).max(12),
  typography: z.array(TypeEntry).min(1).max(6),
  radii: z.array(z.string().min(1).max(20)).min(0).max(6),
  shadows: z.array(z.string().min(1).max(120)).min(0).max(6),
  spacing: z.array(z.string().min(1).max(20)).min(0).max(10),
  keywords: z.array(z.string().min(1).max(40)).min(0).max(10),
});

export type InspirationVisionTokens = z.infer<
  typeof InspirationVisionTokensSchema
>;
