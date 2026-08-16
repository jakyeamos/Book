import { LocalAssetStore, R2AssetStore, type AssetStore, type LocalAssetStoreOptions } from "@/storage/asset-store";
import { readR2Environment, type BookEnvironment } from "@/server/env";

export interface AssetStoreFactoryOptions {
  local?: Partial<LocalAssetStoreOptions>;
}

/**
 * Selects the canonical production adapter when all R2 credentials are present.
 * Local storage is deliberately the only fallback and is intended for development
 * and isolated previews, never for a production deployment.
 */
export function createAssetStore(
  environment: BookEnvironment = process.env,
  options: AssetStoreFactoryOptions = {},
): AssetStore {
  const r2 = readR2Environment(environment);
  if (r2) {
    return new R2AssetStore({
      endpoint: r2.R2_ENDPOINT,
      bucket: r2.R2_BUCKET,
      accessKeyId: r2.R2_ACCESS_KEY_ID,
      secretAccessKey: r2.R2_SECRET_ACCESS_KEY,
    });
  }

  return new LocalAssetStore({
    rootDirectory: options.local?.rootDirectory ?? environment.BOOK_LOCAL_ASSET_DIR ?? ".local-assets",
    publicOrigin: options.local?.publicOrigin ?? environment.BOOK_PUBLIC_ORIGIN ?? "",
  });
}
