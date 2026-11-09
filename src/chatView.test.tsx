import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatView from "./chatView";
import { ToastProvider } from "./Toast";

class TestWebSocket {
  static instances: TestWebSocket[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor() {
    TestWebSocket.instances.push(this);
  }

  close = vi.fn();

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

vi.mock("./api", () => ({
  BACKEND_HOST: "localhost",
  fetchParticipants: vi.fn().mockResolvedValue([]),
}));

function renderChat() {
  return render(
    <ToastProvider>
      <ChatView
        sessionId="session-1"
        displayName="Alex"
        title="Design review"
      />
    </ToastProvider>,
  );
}

describe("conversation scrolling", () => {
  beforeEach(() => {
    TestWebSocket.instances = [];
    vi.stubGlobal("WebSocket", TestWebSocket);
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    }
  });

  it("keeps the reader in place and offers a jump when a new message arrives", async () => {
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const { container } = renderChat();
    const scroller = container.querySelector(".overflow-y-auto") as HTMLDivElement;
    Object.defineProperties(scroller, {
      scrollHeight: { configurable: true, value: 1200 },
      clientHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });
    fireEvent.scroll(scroller);
    await waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));
    scrollIntoView.mockClear();

    act(() => {
      TestWebSocket.instances[0].emit({
        type: "message",
        author: "Sam",
        content: "A new reply",
        kind: "text",
      });
    });

    expect(await screen.findByRole("button", { name: "Jump to latest" })).toBeVisible();
    expect(scrollIntoView).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Jump to latest" }));

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("continues to follow new messages when the reader is already at the bottom", async () => {
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const { container } = renderChat();
    const scroller = container.querySelector(".overflow-y-auto") as HTMLDivElement;
    Object.defineProperties(scroller, {
      scrollHeight: { configurable: true, value: 1200 },
      clientHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, writable: true, value: 700 },
    });
    fireEvent.scroll(scroller);
    await waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));
    scrollIntoView.mockClear();

    act(() => {
      TestWebSocket.instances[0].emit({
        type: "message",
        author: "Sam",
        content: "A new reply",
        kind: "text",
      });
    });

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Jump to latest" })).toBeNull();
  });
});
