import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ThemeMenu from "./ThemeMenu";

describe("theme menu", () => {
  it("applies dark mode when the user selects Dark", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    localStorage.setItem("huddle_theme", "light");

    render(<ThemeMenu />);

    await user.click(screen.getByRole("button", { name: "Theme: light" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Dark" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("huddle_theme")).toBe("dark");
  });
});
