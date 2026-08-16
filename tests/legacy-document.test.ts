import { describe, expect, it } from "vitest";

import { importLegacyHtmlDocument } from "@/migrations/legacy-document";

describe("legacy HTML import", () => {
  it("produces stable text blocks and removes executable markup", () => {
    const html = `<h1>Arrival</h1><p>At <em>dawn</em>.</p><script>alert('x')</script>`;
    const first = importLegacyHtmlDocument("chapter-arrival", html);
    const second = importLegacyHtmlDocument("chapter-arrival", html);

    expect(second).toEqual(first);
    expect(first.blocks).toHaveLength(2);
    expect(first.blocks[0]).toMatchObject({ type: "heading", text: "Arrival" });
    expect(first.blocks[1]).toMatchObject({ type: "paragraph", text: "At dawn." });
    expect(JSON.stringify(first)).not.toContain("script");
  });
});
