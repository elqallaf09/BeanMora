import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  contributionImage,
  contributionPayload,
  requireMember,
  submitContribution,
  uploadContributionImage,
} from "../member-contributions";
import { archiveOwnedItem } from "../owned-inventory";
const recipe = {
  name: "My recipe",
  method: "v60",
  dose: "١٥",
  water: "٢٥٠",
  steps: "Bloom coffee\nPour remaining water",
  visibility: "private",
};
it("normalizes Arabic measurements while retaining explicit privacy and ordered steps", () => {
  const p = contributionPayload("recipe", recipe, "ar");
  expect(p.dose).toBe("15");
  expect(p.water).toBe("250");
  expect(p.steps).toEqual(["Bloom coffee", "Pour remaining water"]);
  expect(p.visibility).toBe("private");
});
it("rejects malformed HTTPS links, temperatures, dates and incomplete steps", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://insecure.test",
    "https://owner:secret@example.test",
    "https://example.test\\evil",
  ])
    expect(() =>
      contributionPayload("recipe", { ...recipe, source_url: url }, "en"),
    ).toThrow();
  expect(() =>
    contributionPayload("recipe", { ...recipe, temperature: "101" }, "en"),
  ).toThrow();
  expect(() =>
    contributionPayload("recipe", { ...recipe, steps: "x" }, "en"),
  ).toThrow();
  expect(() =>
    contributionPayload("recipe", { ...recipe, seconds: "0" }, "en"),
  ).toThrow();
  expect(() =>
    contributionPayload(
      "recipe",
      { ...recipe, steps: Array(15).fill("ق".repeat(1000)).join("\n") },
      "ar",
    ),
  ).toThrow();
  expect(() =>
    contributionPayload(
      "bean",
      {
        name: "Bean",
        roaster_name: "Roaster",
        origin: "Brazil",
        roast_date: "2026-02-30",
      },
      "en",
    ),
  ).toThrow();
});
it("checks real image signatures and byte limits rather than trusting extensions", () => {
  expect(contributionImage(new Uint8Array([255, 216, 255, 1])).mime).toBe(
    "image/jpeg",
  );
  expect(
    contributionImage(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])).mime,
  ).toBe("image/png");
  expect(() =>
    contributionImage(new TextEncoder().encode('<svg onload="alert(1)"/>')),
  ).toThrow("IMAGE_FORMAT");
  expect(() => contributionImage(new Uint8Array(5 * 1024 * 1024 + 1))).toThrow(
    "IMAGE_SIZE",
  );
});
it("rejects anonymous and changed accounts before RPC or upload", async () => {
  const rpc = vi.fn(),
    upload = vi.fn();
  const db = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: "owner", is_anonymous: true } },
          error: null,
        }),
    },
    rpc,
    storage: { from: () => ({ upload }) },
  } as unknown as SupabaseClient;
  await expect(
    submitContribution(db, "recipe", "owner", "id", {}),
  ).rejects.toThrow("MEMBER_SIGN_IN_REQUIRED");
  expect(rpc).not.toHaveBeenCalled();
  await expect(
    uploadContributionImage(db, "owner", "id", new Uint8Array([255, 216, 255])),
  ).rejects.toThrow();
  expect(upload).not.toHaveBeenCalled();
  vi.mocked(db.auth.getUser).mockResolvedValue({
    data: { user: { id: "other", is_anonymous: false } },
    error: null,
  } as never);
  await expect(requireMember(db, "owner")).rejects.toThrow();
});
it("only confirms RPC success for the same id and keeps retries idempotent", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: "attempt-id", error: null });
  const db = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: "owner", is_anonymous: false } },
          error: null,
        }),
    },
    rpc,
  } as unknown as SupabaseClient;
  await submitContribution(db, "recipe", "owner", "attempt-id", recipe);
  await submitContribution(db, "recipe", "owner", "attempt-id", recipe);
  expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  rpc.mockResolvedValue({ data: null, error: { message: "failed" } });
  await expect(
    submitContribution(db, "recipe", "owner", "attempt-id", recipe),
  ).rejects.toThrow("SUBMISSION_FAILED");
});
it("removal binds both owner and item, and treats zero-row writes as failure", async () => {
  const builder = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  for (const k of ["update", "eq", "select"] as const)
    builder[k].mockReturnValue(builder);
  const db = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: "owner", is_anonymous: false } },
          error: null,
        }),
    },
    from: vi.fn().mockReturnValue(builder),
  } as unknown as SupabaseClient;
  await expect(
    archiveOwnedItem(db, "user_equipment", "item", "owner", true),
  ).rejects.toThrow("INVENTORY_UPDATE_FAILED");
  expect(builder.eq.mock.calls).toEqual([
    ["id", "item"],
    ["user_id", "owner"],
  ]);
  expect(builder.update).toHaveBeenCalledWith(
    expect.objectContaining({ is_default: false }),
  );
});
