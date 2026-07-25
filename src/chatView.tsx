import { useEffect, useRef, useState } from "react";
import { BACKEND_HOST } from "./api";

type ChatMessage = {
  type: "message" | "thinking" | "error";
  author?: string;
  content?: string;
};

const PARTICIPANT_COLORS = [
  "text-emerald-700",
  "text-amber-700",
  "text-rose-700",
  "text-violet-700",
  "text-cyan-700",
];

function colorForAuthor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PARTICIPANT_COLORS[Math.abs(hash) % PARTICIPANT_COLORS.length];
}

type ChatViewProps = {
  sessionId: string;
  displayName: string;
};

export default function ChatView({ sessionId, displayName }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    const userId = localStorage.getItem("huddle_user_id");
    const ws = new WebSocket(
      `wss://${BACKEND_HOST}/ws/session/${sessionId}?display_name=${displayName}&user_id=${userId}`
    );
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data: ChatMessage = JSON.parse(event.data);
      if (data.type === "thinking") {
        setThinking(true);
        return;
      }
      setThinking(false);
      setMessages((prev) => [...prev, data]);
    };

    return () => ws.close();
  }, [sessionId, displayName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ content: trimmed }));
    setInput("");
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="border-b border-stone-200 px-6 py-3">
        <p className="text-sm font-medium text-stone-700">Talon</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
          {messages.map((msg, i) => (
            <MessageRow key={i} msg={msg} isSelf={msg.author === displayName} />
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <span className="font-medium text-stone-500">Talon</span>
              <span className="italic">is thinking…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-stone-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <input
            className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-stone-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message the session…"
          />
          <button
            onClick={sendMessage}
            className="bg-stone-800 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-stone-900 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ msg, isSelf }: { msg: ChatMessage; isSelf: boolean }) {
  const isTalon = msg.author === "Talon";

  if (isSelf) {
    return (
      <div className="flex justify-end">
        <div className="max-w-lg bg-stone-100 rounded-2xl px-4 py-2.5 text-sm text-stone-800">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`text-sm font-medium ${
          isTalon ? "text-stone-800" : colorForAuthor(msg.author ?? "")
        }`}
      >
        {msg.author}
      </span>
      <p className="text-sm text-stone-700 leading-relaxed">{msg.content}</p>
    </div>
  );
}