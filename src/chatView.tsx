import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  type: "message" | "thinking" | "error";
  author?: string;
  content?: string;
};

const BACKEND_HOST = "huddle-6j42.onrender.com";
const SESSION_ID = "5def6cd0-5f1c-497d-8311-d30766a50df3"; // hardcoded for Brick F2
const DISPLAY_NAME = "WebUser"; // hardcoded for now — becomes dynamic in Brick F3/F5

// Distinct palette for other participants — deterministic per name, not random per message
const PARTICIPANT_COLORS = [
  "bg-emerald-700",
  "bg-amber-700",
  "bg-rose-700",
  "bg-violet-700",
  "bg-cyan-700",
  "bg-orange-700",
];

function colorForAuthor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PARTICIPANT_COLORS.length;
  return PARTICIPANT_COLORS[index];
}

export default function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `wss://${BACKEND_HOST}/ws/session/${SESSION_ID}?display_name=${DISPLAY_NAME}`,
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
  }, []);

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
    <div className="flex flex-col h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800 px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Huddle</h1>
        <p className="text-sm text-stone-500">Talon is in this session</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            isSelf={msg.author === DISPLAY_NAME}
          />
        ))}
        {thinking && (
          <div className="text-sm text-stone-500 italic">
            Talon is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="w-full px-6 py-4 flex justify-center items-center gap-3">
        <div className="w-full sm:w-[70%] flex justify-center items-center gap-3">
          <input
            className="flex-1 bg-stone-900 border border-stone-700 rounded-2xl px-4 py-2 text-sm outline-none focus:border-stone-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Send a message…"
          />
          <button
            onClick={sendMessage}
            className="bg-stone-100 text-stone-900 rounded-2xl  rounded-2xl px-4 py-2 text-sm font-medium hover:bg-white transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isSelf }: { msg: ChatMessage; isSelf: boolean }) {
  const isTalon = msg.author === "Talon";

  let bubbleColor: string;
  if (isSelf) {
    bubbleColor = "bg-blue-600";
  } else if (isTalon) {
    bubbleColor = "bg-stone-800 border border-stone-600";
  } else {
    bubbleColor = colorForAuthor(msg.author ?? "");
  }

  return (
    <div className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
      <span className="text-xs text-stone-500 mb-1 flex items-center gap-1">
        {isTalon && <span className="text-amber-400">★</span>}
        {msg.author}
      </span>
      <div
        className={`max-w-lg rounded-2xl px-4 py-2 text-sm text-white ${bubbleColor}`}
      >
        {msg.content}
      </div>
    </div>
  );
}
