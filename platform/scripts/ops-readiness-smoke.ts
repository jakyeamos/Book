import { AddressInfo } from "node:net";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { createBookServer } from "../api/src/server";

interface ReadinessBody {
  ok: boolean;
  checks: Record<string, boolean>;
  details?: {
    generatedAt?: string;
    reader?: {
      publishedChapterCount?: number;
    };
    database?: {
      mode?: string;
      postgresRequired?: boolean;
    };
    storage?: {
      assetDir?: string;
      writable?: boolean;
    };
  };
}

function setEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: http.Server): Promise<void> {
  if (!server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function run(): Promise<void> {
  const previousAudioAssetDir = process.env.AUDIO_ASSET_DIR;
  const assetDir = path.join(".planning", "data", `ops-readiness-assets-${Date.now()}`);
  const adminPassword = `ops-readiness-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  process.env.AUDIO_ASSET_DIR = assetDir;
  const server = await createBookServer({
    mode: "memory",
    bootstrapAdmin: {
      email: "ops-readiness-admin@example.com",
      password: adminPassword,
    },
  });

  try {
    const baseUrl = await listen(server);
    const response = await fetch(`${baseUrl}/api/deploy/readiness`);
    const body = await response.json() as ReadinessBody;
    if (response.status !== 200 || !body.ok) {
      throw new Error("Readiness endpoint did not return ok");
    }
    if (!body.details?.generatedAt) {
      throw new Error("Readiness endpoint missing generatedAt detail");
    }
    if (!body.details.reader?.publishedChapterCount) {
      throw new Error("Readiness endpoint missing published chapter count");
    }
    if (body.details.database?.mode !== "memory" || body.details.database.postgresRequired !== false) {
      throw new Error("Readiness endpoint missing database mode details");
    }
    if (body.details.storage?.assetDir !== assetDir || body.details.storage.writable !== true) {
      throw new Error("Readiness endpoint missing storage writability details");
    }
  } finally {
    await close(server);
    setEnv("AUDIO_ASSET_DIR", previousAudioAssetDir);
    fs.rmSync(assetDir, { recursive: true, force: true });
  }

  console.log("platform ops readiness smoke test: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
