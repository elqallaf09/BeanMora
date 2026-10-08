import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { saveMemberAvatar } from "../member-social";
const id = "11111111-1111-4111-8111-111111111111";
const attempt = "22222222-2222-4222-8222-222222222222";
const bytes = new Uint8Array([255, 216, 255, 10]);
function fixture() {
  const url = `https://fixture.supabase.co/storage/v1/object/public/avatars/${id}/${attempt}.jpg`;
  const auth = vi
    .fn()
    .mockResolvedValue({
      data: { user: { id, is_anonymous: false } },
      error: null,
    });
  const upload = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(),
    eq = vi.fn(),
    select = vi.fn(),
    single = vi
      .fn()
      .mockResolvedValue({ data: { id, avatar_url: url }, error: null });
  const chain = { update, eq, select, single };
  update.mockReturnValue(chain);
  eq.mockReturnValue(chain);
  select.mockReturnValue(chain);
  const db = {
    auth: { getUser: auth },
    storage: {
      from: vi.fn(() => ({
        upload,
        getPublicUrl: () => ({ data: { publicUrl: url } }),
      })),
    },
    from: vi.fn(() => chain),
  } as unknown as SupabaseClient;
  return { db, auth, upload, update, eq, single, url };
}
it("saves only the authenticated owner, with exact image bytes and a verified profile response", async () => {
  const f = fixture();
  const padded = new Uint8Array([0, ...bytes, 0]).subarray(1, 5);
  expect(await saveMemberAvatar(f.db, id, attempt, padded)).toBe(f.url);
  expect(f.upload).toHaveBeenCalledWith(`${id}/${attempt}.jpg`, bytes.buffer, {
    contentType: "image/jpeg",
    upsert: false,
  });
  expect(f.update).toHaveBeenCalledWith({ avatar_url: f.url });
  expect(f.eq).toHaveBeenCalledWith("id", id);
});
it("rejects another identity and invalid media before uploading", async () => {
  const f = fixture();
  f.auth.mockResolvedValue({
    data: { user: { id: "other", is_anonymous: false } },
    error: null,
  });
  await expect(saveMemberAvatar(f.db, id, attempt, bytes)).rejects.toThrow(
    "MEMBER_SIGN_IN_REQUIRED",
  );
  expect(f.upload).not.toHaveBeenCalled();
  const g = fixture();
  await expect(
    saveMemberAvatar(g.db, id, attempt, new Uint8Array([1, 2, 3])),
  ).rejects.toThrow("IMAGE_FORMAT");
  expect(g.upload).not.toHaveBeenCalled();
});
it("stops if identity changes after upload and permits an immutable retry after a lost response", async () => {
  const f = fixture();
  f.auth
    .mockResolvedValueOnce({
      data: { user: { id, is_anonymous: false } },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { user: { id: "other", is_anonymous: false } },
      error: null,
    });
  await expect(saveMemberAvatar(f.db, id, attempt, bytes)).rejects.toThrow(
    "MEMBER_SIGN_IN_REQUIRED",
  );
  expect(f.update).not.toHaveBeenCalled();
  const g = fixture();
  g.upload.mockResolvedValue({ error: { statusCode: "409" } });
  expect(await saveMemberAvatar(g.db, id, attempt, bytes)).toBe(g.url);
});
it("does not report success when upload fails or the profile write cannot be confirmed", async () => {
  const f = fixture();
  f.upload.mockResolvedValue({ error: { statusCode: "403" } });
  await expect(saveMemberAvatar(f.db, id, attempt, bytes)).rejects.toThrow(
    "IMAGE_UPLOAD_FAILED",
  );
  expect(f.update).not.toHaveBeenCalled();
  const g = fixture();
  g.single.mockResolvedValue({ data: null, error: null });
  await expect(saveMemberAvatar(g.db, id, attempt, bytes)).rejects.toThrow(
    "AVATAR_SAVE",
  );
});
