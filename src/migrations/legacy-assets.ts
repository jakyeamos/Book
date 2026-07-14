import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { AudioLayer } from "@/domain/composition/model";

const audioExtensions = new Set([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav", ".webm"]);
const checksumPattern = /^[a-f0-9]{64}$/i;
const assetIdPattern = /^[a-zA-Z0-9_-]+$/;

export type LegacyAssetManifestEntry = {
  id: string;
  title: string;
  kind: AudioLayer;
  sourcePath: string;
  expectedChecksum?: string;
  expectedByteSize?: number;
};

export type LegacyAssetVerificationStatus = "ready" | "quarantined";

export type LegacyAssetVerification = {
  id: string;
  title: string;
  kind: AudioLayer;
  sourcePath: string;
  status: LegacyAssetVerificationStatus;
  checksum?: string;
  byteSize?: number;
  storageKey?: string;
  reasons: string[];
};

export type LegacyAssetReconciliation = {
  entries: LegacyAssetVerification[];
  readyCount: number;
  quarantinedCount: number;
};

export type LegacyAssetScanOptions = {
  rootDir: string;
  directories?: string[];
};

function checksumForBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableLegacyAssetId(relativePath: string): string {
  return `legacy_${checksumForBytes(Buffer.from(relativePath, "utf8")).slice(0, 24)}`;
}

function titleForPath(relativePath: string): string {
  return path.basename(relativePath, path.extname(relativePath)).replace(/[-_]+/g, " ").trim();
}

function kindForPath(relativePath: string): AudioLayer {
  return relativePath.split(path.sep).includes("music") ? "music" : "ambience";
}

async function walkAudioFiles(rootDir: string, directory: string): Promise<string[]> {
  const absoluteDirectory = path.resolve(rootDir, directory);
  let entries;
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkAudioFiles(rootDir, relativePath));
      continue;
    }
    if (entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(relativePath);
    }
  }
  return files;
}

/**
 * Enumerate legacy audio files in a deterministic order. The generated IDs
 * are derived from the relative path so rerunning an export does not create
 * new identities for the same legacy object.
 */
export async function exportLegacyAudioManifest(options: LegacyAssetScanOptions): Promise<LegacyAssetManifestEntry[]> {
  const directories = options.directories ?? ["assets/music", "assets/library"];
  const relativePaths = (await Promise.all(directories.map((directory) => walkAudioFiles(options.rootDir, directory))))
    .flat()
    .sort((left, right) => left.localeCompare(right));

  return relativePaths.map((relativePath) => ({
    id: stableLegacyAssetId(relativePath),
    title: titleForPath(relativePath),
    kind: kindForPath(relativePath),
    sourcePath: path.resolve(options.rootDir, relativePath),
  }));
}

export async function sha256File(filePath: string): Promise<{ checksum: string; byteSize: number }> {
  const file = await stat(filePath);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return { checksum: hash.digest("hex"), byteSize: file.size };
}

function immutableStorageKey(id: string, checksum: string, sourcePath: string): string {
  const extension = path.extname(sourcePath).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".bin";
  return `audio/${id}/${checksum}${extension}`;
}

function quarantine(entry: LegacyAssetManifestEntry, reasons: string[], checksum?: string, byteSize?: number): LegacyAssetVerification {
  return {
    id: entry.id,
    title: entry.title,
    kind: entry.kind,
    sourcePath: entry.sourcePath,
    status: "quarantined",
    checksum,
    byteSize,
    reasons: [...new Set(reasons)].sort(),
  };
}

/**
 * Verify legacy objects before any upload/import side effects. A report is
 * deterministic for the same manifest and filesystem state, making retries
 * safe and allowing quarantined rows to be resolved independently.
 */
export async function reconcileLegacyAssets(entries: LegacyAssetManifestEntry[]): Promise<LegacyAssetReconciliation> {
  const seenChecksums = new Map<string, string>();
  const verifications: LegacyAssetVerification[] = [];

  for (const entry of entries) {
    const reasons: string[] = [];
    if (!assetIdPattern.test(entry.id)) {
      reasons.push("invalid-asset-id");
    }
    if (entry.expectedChecksum !== undefined && !checksumPattern.test(entry.expectedChecksum)) {
      reasons.push("invalid-expected-checksum");
    }

    let checksum: string | undefined;
    let byteSize: number | undefined;
    try {
      const file = await sha256File(entry.sourcePath);
      checksum = file.checksum;
      byteSize = file.byteSize;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reasons.push("missing-source");
      } else {
        reasons.push("read-failed");
      }
    }

    if (checksum && entry.expectedChecksum && checksum !== entry.expectedChecksum.toLowerCase()) {
      reasons.push("checksum-mismatch");
    }
    if (byteSize !== undefined && entry.expectedByteSize !== undefined && byteSize !== entry.expectedByteSize) {
      reasons.push("byte-size-mismatch");
    }
    if (checksum && seenChecksums.has(checksum)) {
      reasons.push(`duplicate-checksum:${seenChecksums.get(checksum)}`);
    }

    if (reasons.length > 0 || !checksum || byteSize === undefined) {
      verifications.push(quarantine(entry, reasons.length > 0 ? reasons : ["unverified"], checksum, byteSize));
      continue;
    }

    seenChecksums.set(checksum, entry.id);
    verifications.push({
      id: entry.id,
      title: entry.title,
      kind: entry.kind,
      sourcePath: entry.sourcePath,
      status: "ready",
      checksum,
      byteSize,
      storageKey: immutableStorageKey(entry.id, checksum, entry.sourcePath),
      reasons: [],
    });
  }

  const quarantinedCount = verifications.filter((entry) => entry.status === "quarantined").length;
  return {
    entries: verifications,
    readyCount: verifications.length - quarantinedCount,
    quarantinedCount,
  };
}

export function canCutoverLegacyAssets(report: LegacyAssetReconciliation): boolean {
  return report.entries.length > 0 && report.quarantinedCount === 0;
}
