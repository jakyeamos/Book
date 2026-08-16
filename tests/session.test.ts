import { describe, expect, it } from "vitest";

import { createSessionToken, hashSessionToken, sessionCookie } from "@/server/auth/session";

describe("session boundary", () => {
  it("creates opaque tokens and stores only their digest", () => {
    const token = createSessionToken();
    expect(token).toHaveLength(43);
    expect(hashSessionToken(token)).toHaveLength(64);
    expect(hashSessionToken(token)).not.toBe(token);
  });

  it("returns a secure production cookie contract", () => {
    expect(sessionCookie("token", true)).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });
});
