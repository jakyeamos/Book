import { describe, expect, it } from "vitest";

import { discoverMigrationVersions } from "@/db/migrate";

describe("v2 migration discovery", () => {
  it("discovers numbered SQL files in application order", async () => {
    const versions = await discoverMigrationVersions();

    expect(versions).toEqual(expect.arrayContaining(["0001_v2_foundation", "0002_v2_audit_and_reader", "0003_v2_asset_metadata", "0004_v2_identity"]));
    expect(versions).toEqual([...versions].sort((left, right) => left.localeCompare(right, undefined, { numeric: true })));
  });
});
