import { z } from "zod";

export const audioLayerSchema = z.enum(["music", "ambience"]);
export type AudioLayer = z.infer<typeof audioLayerSchema>;

export const blockTypeSchema = z.enum(["heading", "paragraph", "verse", "quote", "divider"]);
export type BlockType = z.infer<typeof blockTypeSchema>;

export const chapterBlockSchema = z.object({
  id: z.string().min(1),
  type: blockTypeSchema,
  text: z.string(),
  emphasis: z.boolean().default(false),
});
export type ChapterBlock = z.infer<typeof chapterBlockSchema>;

export const chapterDocumentSchema = z.object({
  blocks: z.array(chapterBlockSchema).min(1),
});
export type ChapterDocument = z.infer<typeof chapterDocumentSchema>;

export const themeTokensSchema = z.object({
  background: z.string().min(1),
  foreground: z.string().min(1),
  accent: z.string().min(1),
});
export type ThemeTokens = z.infer<typeof themeTokensSchema>;

export const motionRecipeSchema = z.object({
  id: z.string().min(1),
  blockId: z.string().min(1),
  intensity: z.enum(["subtle", "moderate"]),
});
export type MotionRecipe = z.infer<typeof motionRecipeSchema>;

export const audioCueSchema = z.object({
  id: z.string().min(1),
  sceneId: z.string().min(1),
  assetId: z.string().min(1),
  layer: audioLayerSchema,
  startBlockId: z.string().min(1),
  endBlockId: z.string().min(1),
  offsetMs: z.number().int().min(0),
  loop: z.boolean(),
  gainDb: z.number().min(-60).max(12),
  fadeInMs: z.number().int().min(0),
  fadeOutMs: z.number().int().min(0),
  duckMusicDb: z.number().min(-60).max(0).optional(),
  duckAttackMs: z.number().int().min(0).optional(),
  duckReleaseMs: z.number().int().min(0).optional(),
});
export type AudioCue = z.infer<typeof audioCueSchema>;

export const audioSceneSchema = z.object({
  id: z.string().min(1),
  revisionId: z.string().min(1),
  label: z.string().min(1),
  startBlockId: z.string().min(1),
  endBlockId: z.string().min(1),
  orderIndex: z.number().int().min(0),
  cues: z.array(audioCueSchema),
});
export type AudioScene = z.infer<typeof audioSceneSchema>;

export const chapterExperienceSchema = z.object({
  theme: themeTokensSchema,
  motion: z.array(motionRecipeSchema),
  scenes: z.array(audioSceneSchema),
});
export type ChapterExperience = z.infer<typeof chapterExperienceSchema>;

export const audioAssetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: audioLayerSchema,
  contentType: z.string().regex(/^audio\/[a-z0-9.+-]+$/),
  storageKey: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  byteSize: z.number().int().positive(),
  durationMs: z.number().int().positive(),
  waveformPeaks: z.array(z.number().min(0).max(1)).min(1),
  status: z.enum(["pending", "ready", "quarantined"]),
});
export type AudioAsset = z.infer<typeof audioAssetSchema>;

export const chapterRevisionSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  revisionNumber: z.number().int().positive(),
  document: chapterDocumentSchema,
  experience: chapterExperienceSchema,
  assets: z.array(audioAssetSchema),
  status: z.enum(["draft", "published"]),
  visibility: z.enum(["public", "direct-link", "conditional"]),
  createdAt: z.string().datetime(),
});
export type ChapterRevision = z.infer<typeof chapterRevisionSchema>;
