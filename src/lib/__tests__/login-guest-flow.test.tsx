import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import arMessages from "../../../messages/ar.json";
// Vitest hoists vi.mock() calls below to the top of the module, above every
// import (including this one) — see https://vitest.dev/api/vi.html#vi-mock.
import LoginPage from "@/app/[locale]/(auth)/login/page";

// Deferred so tests can control exactly when signInAnonymously resolves —
// needed to assert the loading/double-click-guard behavior mid-flight.
const mockSignInAnonymously = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInAnonymously: mockSignInAnonymously,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function renderLogin(locale: "en" | "ar" = "en") {
  const messages = locale === "en" ? enMessages : arMessages;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LoginPage />
    </NextIntlClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Login page — Continue as guest", () => {
  beforeEach(() => {
    mockSignInAnonymously.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignInWithOAuth.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
  });

  it("calls supabase.auth.signInAnonymously with locale + source metadata", async () => {
    mockSignInAnonymously.mockResolvedValue({ data: { user: {}, session: {} }, error: null });
    renderLogin("en");

    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

    await waitFor(() => expect(mockSignInAnonymously).toHaveBeenCalledTimes(1));
    expect(mockSignInAnonymously).toHaveBeenCalledWith({
      options: { data: { language: "en", source: "guest_login" } },
    });
  });

  it("redirects to the localized home route and refreshes the router on success", async () => {
    mockSignInAnonymously.mockResolvedValue({ data: { user: {}, session: {} }, error: null });
    renderLogin("en");

    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/home"));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("resets the loading state after a successful guest sign-in", async () => {
    mockSignInAnonymously.mockResolvedValue({ data: { user: {}, session: {} }, error: null });
    renderLogin("en");

    const button = screen.getByRole("button", { name: /continue as guest/i });
    fireEvent.click(button);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("resets the loading state after a failed guest sign-in and shows a localized error", async () => {
    mockSignInAnonymously.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Anonymous sign-ins are disabled", name: "AuthApiError", status: 422 },
    });
    renderLogin("en");

    const button = screen.getByRole("button", { name: /continue as guest/i });
    fireEvent.click(button);

    await screen.findByText("Guest access is currently unavailable.");
    expect(button).not.toBeDisabled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a localized error and does not crash when signInAnonymously throws (network failure)", async () => {
    mockSignInAnonymously.mockRejectedValue(new TypeError("Failed to fetch"));
    renderLogin("en");

    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

    await screen.findByText("Check your internet connection and try again.");
    // If the exception had escaped the handler, this render call would
    // have thrown out of the test entirely rather than reaching here.
  });

  it("cannot be double-clicked while a guest sign-in is already in flight", async () => {
    const gate = deferred<{ data: { user: object; session: object }; error: null }>();
    mockSignInAnonymously.mockReturnValue(gate.promise);
    renderLogin("en");

    const button = screen.getByRole("button", { name: /continue as guest/i });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);
    fireEvent.click(button);

    gate.resolve({ data: { user: {}, session: {} }, error: null });
    await waitFor(() => expect(mockPush).toHaveBeenCalled());

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("renders the guest button and its label in Arabic", () => {
    renderLogin("ar");
    expect(screen.getByRole("button", { name: "الدخول كضيف" })).toBeInTheDocument();
  });
});
