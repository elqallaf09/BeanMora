import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { PasswordInput } from "@/components/ui/password-input";

const enMessages = {
  auth: { showPassword: "Show password", hidePassword: "Hide password" },
};
const arMessages = {
  auth: { showPassword: "إظهار كلمة المرور", hidePassword: "إخفاء كلمة المرور" },
};

function renderPasswordInput(options?: {
  locale?: string;
  messages?: typeof enMessages;
  onSubmit?: (event: React.FormEvent) => void;
  defaultValue?: string;
}) {
  const { locale = "en", messages = enMessages, onSubmit, defaultValue } = options ?? {};
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <form onSubmit={onSubmit ?? (() => {})} dir={locale === "ar" ? "rtl" : "ltr"}>
        <PasswordInput
          aria-label="password"
          defaultValue={defaultValue}
          data-testid="password-field"
        />
      </form>
    </NextIntlClientProvider>,
  );
}

describe("PasswordInput", () => {
  it("is hidden (type=password) initially", () => {
    renderPasswordInput();
    expect(screen.getByTestId("password-field")).toHaveAttribute("type", "password");
  });

  it("switches the input to type=text when the show toggle is clicked", () => {
    renderPasswordInput();
    const toggle = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggle);
    expect(screen.getByTestId("password-field")).toHaveAttribute("type", "text");
  });

  it("switches back to type=password when clicked again", () => {
    renderPasswordInput();
    const toggle = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByTestId("password-field")).toHaveAttribute("type", "password");
  });

  it("preserves the typed value across a toggle", () => {
    renderPasswordInput();
    const input = screen.getByTestId("password-field");
    fireEvent.change(input, { target: { value: "s3cr3t!" } });
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByTestId("password-field")).toHaveValue("s3cr3t!");
  });

  it("does not submit the form when the toggle is clicked", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    renderPasswordInput({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders type=button so it can never act as a submit button", () => {
    renderPasswordInput();
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("sets aria-pressed to reflect visibility state", () => {
    renderPasswordInput();
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("uses the localized English label", () => {
    renderPasswordInput({ locale: "en", messages: enMessages });
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("uses the localized Arabic label", () => {
    renderPasswordInput({ locale: "ar", messages: arMessages });
    expect(screen.getByRole("button", { name: "إظهار كلمة المرور" })).toBeInTheDocument();
  });

  it("is a real, keyboard-focusable <button> (not a div/span with a click handler)", () => {
    renderPasswordInput();
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle).not.toHaveAttribute("tabindex", "-1");
    toggle.focus();
    expect(toggle).toHaveFocus();
  });

  it("positions the toggle with a logical (direction-agnostic) utility class, not a duplicated ltr:/rtl: pair", () => {
    renderPasswordInput();
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.className).toContain("end-0");
    expect(toggle.className).not.toMatch(/\bltr:/);
    expect(toggle.className).not.toMatch(/\brtl:/);
  });

  it("disables the toggle when the field is disabled", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <PasswordInput disabled aria-label="password" data-testid="password-field" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
    expect(screen.getByTestId("password-field")).toBeDisabled();
  });
});
