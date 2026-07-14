import { expect, test } from "@playwright/test";

test("reader library and chapter expose the narrative surface", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Read with the room around the words." })).toBeVisible();
  await page.getByRole("link", { name: /The Ritual/ }).click();
  await expect(page.getByRole("heading", { name: "The Ritual" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Soundtrack transport" })).toBeVisible();
});

test("studio preview exposes scene and timeline controls", async ({ page }) => {
  await page.goto("/studio/chapters/chapter-1/composition");
  await expect(page.getByRole("heading", { name: "Shape the room around the words." })).toBeVisible();
  await expect(page.locator("aside[aria-label='Scenes']")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play preview" })).toBeVisible();
  await page.getByRole("button", { name: "Play preview" }).click();
  await expect(page.getByRole("button", { name: "Pause preview" })).toBeVisible();
  await expect(page.getByText("Cursor following text")).toBeVisible();
  await page.getByRole("link", { name: "Publish" }).click();
  await expect(page.getByRole("heading", { name: "Ready to publish" })).toBeVisible();
  await page.getByRole("link", { name: "Back to composition" }).click();
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "History you can trust." })).toBeVisible();
});

test("health route reports v2 service status", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ ok: true, service: "book-v2" });
});

test("reader mutations require a server session", async ({ request }) => {
  const response = await request.post("/api/reader/progress", { data: { chapterId: "chapter-1", revisionId: "revision-ritual-1", blockId: "b2", progressPercent: 20 } });
  expect(response.status()).toBe(401);
});
