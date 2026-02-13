import { readdir, stat } from "fs/promises";
import { join } from "path";
import type { DriveFileInput } from "@/lib/types/api";

interface ScanOptions {
  rootPath: string;
  years: number[];
}

async function walkDirectory(dirPath: string, acc: string[]): Promise<void> {
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(entryPath, acc);
      continue;
    }

    if (entry.isFile()) {
      acc.push(entryPath);
    }
  }
}

export async function scanDriveFolder(options: ScanOptions): Promise<DriveFileInput[]> {
  const files: string[] = [];

  for (const year of options.years) {
    const yearPath = join(options.rootPath, String(year));
    try {
      const info = await stat(yearPath);
      if (!info.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    await walkDirectory(yearPath, files);
  }

  const results: DriveFileInput[] = [];

  for (const filePath of files) {
    try {
      const fileInfo = await stat(filePath);
      results.push({
        path: filePath,
        name: filePath.split("/").pop(),
        modifiedTime: fileInfo.mtime.toISOString(),
        size: fileInfo.size
      });
    } catch {
      results.push({ path: filePath });
    }
  }

  return results;
}
