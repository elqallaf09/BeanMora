import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import OnboardingPage from "@/app/[locale]/onboarding/page";
import { PostLikeButton, PostMoreMenu } from "@/app/[locale]/(app)/community/community-actions";
import { CommentBox } from "@/app/[locale]/(app)/community/[id]/comment-box";
import { SaveButton } from "@/components/coffee/save-button";
import { ProductWatchButton } from "@/app/[locale]/(app)/products/[slug]/product-watch-button";
import { WatchPreferences } from "@/app/[locale]/(app)/watchlist/watch-preferences";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), push: vi.fn(), refresh: vi.fn(), copy: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser: mocks.auth }, from: mocks.from }) }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
const owner = "00000000-0000-4000-8000-000000000099", attemptId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", postId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
type Reply = { data: unknown; error: { message: string } | null };
const ok = (data: unknown = null): Reply => ({ data, error: null });
const failed: Reply = { data: null, error: { message: "isolated write failure" } };
function query(reply: Reply | Promise<Reply>) {
  const pending = Promise.resolve(reply);
  return {
    update: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    single: () => pending, maybeSingle: () => pending, then: pending.then.bind(pending),
  };
}
function present(locale: "ar" | "en", child: React.ReactNode) {
  const m = locale === "ar" ? ar : en;
  render(<NextIntlClientProvider locale={locale} messages={m} timeZone="UTC">{child}</NextIntlClientProvider>);
  return m;
}
function lastStep(m: typeof ar | typeof en) {
  for (const label of [m.auth.experienceBeginner, m.common.next, m.onboarding.methodV60, m.common.next, m.onboarding.flavorFruity, m.common.next, m.onboarding.roastLight])
    fireEvent.click(screen.getByRole("button", { name: label }));
  return screen.getByRole("button", { name: m.common.done });
}
const preferenceLabels = { price: "Price", stock: "Stock", soldOut: "Sold out", remove: "Remove", error: "Retry preferences" };
beforeEach(() => {
  Object.values(mocks).forEach(mock => mock.mockReset());
  mocks.auth.mockResolvedValue({ data: { user: { id: owner, is_anonymous: false } }, error: null });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mocks.copy } });
  vi.stubGlobal("crypto", { randomUUID: () => attemptId });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

for (const locale of ["ar", "en"] as const) describe(locale + " persisted write feedback", () => {
  it("keeps onboarding choices after failure and redirects only after a confirmed retry", async () => {
    const profile = query(ok({ id: owner })), preferences = query(ok({ user_id: owner }));
    mocks.from.mockReturnValueOnce(profile).mockReturnValueOnce(query(failed)).mockReturnValueOnce(profile).mockReturnValueOnce(preferences);
    const m = present(locale, <OnboardingPage />), done = lastStep(m);
    fireEvent.click(done);
    expect(await screen.findByRole("alert")).toHaveTextContent(m.onboarding.saveError);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: m.onboarding.roastLight })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(done);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/home"));
    expect(preferences.upsert).toHaveBeenCalledWith({ user_id: owner, preferred_brew_methods: ["v60"], preferred_flavors: ["fruity"], preferred_roast_level: "light", onboarding_completed: true }, { onConflict: "user_id" });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
  it("rejects a successful profile response that affected zero rows", async () => {
    mocks.from.mockReturnValue(query(ok()));
    const m = present(locale, <OnboardingPage />);
    fireEvent.click(lastStep(m));
    expect(await screen.findByRole("alert")).toHaveTextContent(m.onboarding.saveError);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("does not claim onboarding was saved after an expired session", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    const m = present(locale, <OnboardingPage />);
    fireEvent.click(lastStep(m));
    expect(await screen.findByRole("alert")).toHaveTextContent(m.onboarding.saveError);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("leaves the like count unchanged on failure and confirms its retry", async () => {
    mocks.from.mockReturnValueOnce(query(failed)).mockReturnValueOnce(query(ok())).mockReturnValueOnce(query(ok({ id: attemptId })));
    const m = present(locale, <PostLikeButton postId={postId} initialLiked={false} initialCount={2} isAuthenticated />);
    const button = screen.getByRole("button", { name: new RegExp(m.community.like + "$") });
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent(m.community.likeError);
    expect(button).toHaveAttribute("aria-pressed", "false"); expect(button).toHaveTextContent("2");
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
    expect(button).toHaveTextContent("3"); expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("does not claim an unlike when the row is still present", async () => {
    mocks.from.mockReturnValueOnce(query(ok())).mockReturnValueOnce(query(ok({ id: attemptId })));
    const m = present(locale, <PostLikeButton postId={postId} initialLiked initialCount={2} isAuthenticated />);
    const button = screen.getByRole("button", { name: new RegExp(m.community.like + "$") });
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent(m.community.likeError);
    expect(button).toHaveAttribute("aria-pressed", "true"); expect(button).toHaveTextContent("2");
  });
  it("asks an anonymous guest to sign in before liking and sends no write", async () => {
    mocks.auth.mockResolvedValue({ data: { user: { id: owner, is_anonymous: true } }, error: null });
    const m = present(locale, <PostLikeButton postId={postId} initialLiked={false} initialCount={0} isAuthenticated />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(m.community.like + "$") }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(m.auth.guestUpgradeTitle);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("retries a report with the same ID and confirms it before showing success", async () => {
    const failure = query(failed), saved = query(ok());
    mocks.from.mockReturnValueOnce(failure).mockReturnValueOnce(saved).mockReturnValueOnce(query(ok({ id: attemptId })));
    const m = present(locale, <PostMoreMenu postId={postId} />);
    fireEvent.click(screen.getByRole("button", { name: m.community.postOptions }));
    fireEvent.click(screen.getByRole("button", { name: m.community.report }));
    expect(await screen.findByRole("alert")).toHaveTextContent(m.community.reportError);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: m.community.report }));
    expect(await screen.findByRole("status")).toHaveTextContent(m.community.reportSent);
    expect(failure.upsert.mock.calls[0][0]).toEqual(saved.upsert.mock.calls[0][0]);
    expect(saved.upsert.mock.calls[0][0]).toMatchObject({ id: attemptId, reporter_id: owner, target_id: postId });
  });
  it("keeps clipboard failure recoverable and restores focus after copying", async () => {
    mocks.copy.mockRejectedValueOnce(new Error("clipboard denied")).mockResolvedValueOnce(undefined);
    const m = present(locale, <PostMoreMenu postId={postId} />), trigger = screen.getByRole("button", { name: m.community.postOptions });
    fireEvent.click(trigger); fireEvent.click(screen.getByRole("button", { name: m.community.share }));
    expect(await screen.findByRole("alert")).toHaveTextContent(m.community.shareError);
    fireEvent.click(screen.getByRole("button", { name: m.community.share }));
    expect(await screen.findByRole("status")).toHaveTextContent(m.community.linkCopied); expect(trigger).toHaveFocus();
  });
  it("keeps a failed comment draft and ID until the confirmed retry", async () => {
    const failure = query(failed), saved = query(ok());
    mocks.from.mockReturnValueOnce(failure).mockReturnValueOnce(saved).mockReturnValueOnce(query(ok({ id: attemptId })));
    const m = present(locale, <CommentBox postId={postId} isAuthenticated />), input = screen.getByRole("textbox", { name: m.community.writeComment });
    fireEvent.change(input, { target: { value: "A useful coffee comment" } });
    fireEvent.click(screen.getByRole("button", { name: m.community.postComment }));
    expect(await screen.findByRole("alert")).toHaveTextContent(m.community.commentError); expect(input).toHaveValue("A useful coffee comment");
    expect(mocks.refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: m.community.postComment }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(input).toHaveValue(""); expect(failure.upsert.mock.calls[0][0]).toEqual(saved.upsert.mock.calls[0][0]);
  });
  it("catches a rejected comment session lookup and preserves the draft", async () => {
    mocks.auth.mockRejectedValue(new TypeError("offline"));
    const m = present(locale, <CommentBox postId={postId} isAuthenticated />), input = screen.getByRole("textbox", { name: m.community.writeComment });
    fireEvent.change(input, { target: { value: "My preserved draft" } }); fireEvent.click(screen.getByRole("button", { name: m.community.postComment }));
    expect(await screen.findByRole("alert")).toHaveTextContent(m.community.commentError); expect(input).toHaveValue("My preserved draft"); expect(mocks.from).not.toHaveBeenCalled();
  });
  for (const [table, column] of [["recipe_saves", "recipe_id"], ["bean_saves", "bean_id"], ["roaster_saves", "roaster_id"], ["post_saves", "post_id"]] as const) it(table + " confirms its bookmark after a failed retry", async () => {
    const written = query(ok()), confirmed = query(ok({ id: attemptId }));
    mocks.from.mockReturnValueOnce(query(failed)).mockReturnValueOnce(written).mockReturnValueOnce(confirmed);
    const m = present(locale, <SaveButton table={table} itemId={postId} isAuthenticated />), button = screen.getByRole("button", { name: m.common.save });
    fireEvent.click(button); expect(await screen.findByRole("alert")).toHaveTextContent(m.common.saveError); expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button); await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
    expect(written.upsert).toHaveBeenCalledWith({ user_id: owner, [column]: postId }, { onConflict: "user_id," + column, ignoreDuplicates: true });
    expect(confirmed.eq).toHaveBeenCalledWith("user_id", owner);
  });
  it("recovers a rejected watch request without leaving its button busy", async () => {
    mocks.auth.mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue({ data: { user: { id: owner, is_anonymous: false } }, error: null });
    mocks.from.mockReturnValueOnce(query(ok())).mockReturnValueOnce(query(ok({ id: attemptId })));
    present(locale, <ProductWatchButton productId={postId} userId={owner} initialWatching={false} labels={{ watch: "Watch", watching: "Watching", error: "Retry watching" }} />);
    const button = screen.getByRole("button", { name: "Watch" });
    fireEvent.click(button); expect(await screen.findByRole("alert")).toHaveTextContent("Retry watching"); expect(button).toBeEnabled(); expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button); await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
  });
  it("rejects a stale watch owner before sending a write", async () => {
    mocks.auth.mockResolvedValue({ data: { user: { id: postId, is_anonymous: false } }, error: null });
    present(locale, <ProductWatchButton productId={postId} userId={owner} initialWatching={false} labels={{ watch: "Watch", watching: "Watching", error: "Session changed" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Watch" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Session changed"); expect(mocks.from).not.toHaveBeenCalled();
  });
  it("keeps preferences after failure and confirms exact retry values", async () => {
    const saved = query(ok({ id: postId, alert_price_drop: false, alert_back_in_stock: true, alert_sold_out: false }));
    mocks.from.mockReturnValueOnce(query(failed)).mockReturnValueOnce(saved);
    present(locale, <WatchPreferences watchId={postId} initial={{ price: true, stock: true, soldOut: false }} labels={preferenceLabels} />);
    const checkbox = screen.getByRole("checkbox", { name: "Price" });
    fireEvent.click(checkbox); expect(await screen.findByRole("alert")).toHaveTextContent(preferenceLabels.error); expect(checkbox).toBeChecked();
    fireEvent.click(checkbox); await waitFor(() => expect(checkbox).not.toBeChecked()); expect(saved.eq).toHaveBeenCalledWith("user_id", owner);
  });
  it("does not accept preferences when no owned row was updated", async () => {
    mocks.from.mockReturnValue(query(ok()));
    present(locale, <WatchPreferences watchId={postId} initial={{ price: true, stock: true, soldOut: false }} labels={preferenceLabels} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Price" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(preferenceLabels.error); expect(screen.getByRole("checkbox", { name: "Price" })).toBeChecked();
  });
  it("does not refresh away a watch that remains after its deletion response", async () => {
    mocks.from.mockReturnValueOnce(query(ok())).mockReturnValueOnce(query(ok({ id: postId })));
    present(locale, <WatchPreferences watchId={postId} initial={{ price: true, stock: true, soldOut: false }} labels={preferenceLabels} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(preferenceLabels.error); expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
it("locks onboarding navigation and duplicate submission until the pending write settles", async () => {
  let release!: (reply: Reply) => void;
  mocks.from.mockReturnValueOnce(query(new Promise<Reply>(resolve => { release = resolve; }))).mockReturnValueOnce(query(ok({ user_id: owner })));
  const m = present("en", <OnboardingPage />), done = lastStep(m);
  fireEvent.click(done);
  await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(1));
  expect(done).toBeDisabled(); expect(screen.getByRole("button", { name: m.common.back })).toBeDisabled();
  expect(screen.getByRole("button", { name: m.common.skip })).toBeDisabled();
  fireEvent.click(done); expect(mocks.from).toHaveBeenCalledTimes(1);
  await act(async () => release(ok({ id: owner })));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/home"));
});
