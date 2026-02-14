import { z } from "zod";

export const driveFileInputSchema = z.object({
  path: z.string().min(1),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  modifiedTime: z.string().optional(),
  size: z.number().int().nonnegative().optional()
});

const importByFileListSchema = z.object({
  files: z.array(driveFileInputSchema).min(1),
  initiatedBy: z.string().default("patient")
});

const importByFolderSchema = z.object({
  rootPath: z.string().min(1),
  years: z.array(z.number().int().min(2000).max(2099)).min(1).default([2025, 2026]),
  initiatedBy: z.string().default("patient")
});

export const importRequestSchema = z.union([importByFileListSchema, importByFolderSchema]);

export const verificationActionSchema = z.object({
  reviewer: z.string().default("patient"),
  note: z.string().max(500).optional()
});

export const createShareLinkSchema = z.object({
  password: z.string().min(8),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  initiatedBy: z.string().default("patient"),
  scope: z
    .object({
      includeDocuments: z.boolean().default(true),
      includeTimeline: z.boolean().default(true),
      includeSnapshot: z.boolean().default(true)
    })
    .default({
      includeDocuments: true,
      includeTimeline: true,
      includeSnapshot: true
    })
});

export const aiQuerySchema = z.object({
  question: z.string().min(3),
  actor: z.string().default("patient"),
  context: z.string().optional()
});

export const aiAnalyzeSingleSchema = z.object({
  mode: z.literal("single"),
  filePath: z.string().min(1)
});

export const aiAnalyzeYearSchema = z.object({
  mode: z.literal("year"),
  rootPath: z.string().min(1),
  year: z.number().int().min(2000).max(2099)
});

export const aiAnalyzeMultiYearSchema = z.object({
  mode: z.literal("multi-year"),
  rootPath: z.string().min(1),
  years: z.array(z.number().int().min(2000).max(2099)).min(1)
});

export const aiAnalyzeRequestSchema = z.union([
  aiAnalyzeSingleSchema,
  aiAnalyzeYearSchema,
  aiAnalyzeMultiYearSchema
]);

export type DriveFileInput = z.infer<typeof driveFileInputSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
export type FolderImportRequest = z.infer<typeof importByFolderSchema>;
export type AIAnalyzeRequest = z.infer<typeof aiAnalyzeRequestSchema>;
