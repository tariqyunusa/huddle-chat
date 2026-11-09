import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { ToastProvider } from "./Toast";

vi.mock("./api", () => ({
  fetchSessions: vi.fn().mockResolvedValue([
    { id: "session-1", title: "Design review" },
  ]),
  getMe: vi.fn().mockResolvedValue({ plan: "free" }),
  createSession: vi.fn(),
  logout: vi.fn(),
  redeemSessionInviteLink: vi.fn(),
  renameSession: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("./chatView", () => ({
  default: ({ sessionId }: { sessionId: string }) => (
    <output aria-label="Active session">{sessionId}</output>
  ),
}));

vi.mock("./ThemeMenu", () => ({ default: () => null }));

function renderSignedInApp() {
  localStorage.setItem("huddle_user_id", "user-1");
  localStorage.setItem("huddle_email_verified", "true");

  return render(
    <ToastProvider>
      <App />
    </ToastProvider>,
  );
}

describe("session navigation", () => {
  it("opens a session when its focused row is activated with the keyboard", async () => {
    const user = userEvent.setup();
    renderSignedInApp();

    const session = await screen.findByRole("button", { name: "Design review" });
    session.focus();
    expect(session).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(await screen.findByLabelText("Active session")).toHaveTextContent(
      "session-1",
    );
  });

  it("exposes the mobile sessions drawer through an accessible toggle", async () => {
    const user = userEvent.setup();
    const { container } = renderSignedInApp();

    const toggle = screen.getByRole("button", { name: "Open sessions sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "session-sidebar");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const backdrop = container.querySelector('div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the primary create action for press feedback", async () => {
    renderSignedInApp();

    expect(
      await screen.findByRole("button", { name: "New session" }),
    ).toHaveClass("button-press");
  });
});
