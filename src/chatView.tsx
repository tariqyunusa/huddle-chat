import { useEffect, useRef, useState } from "react";
import { BACKEND_HOST, fetchParticipants, type Participant } from "./api";
import { Plus } from "lucide-react";
import { useToast } from "./Toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "./MermaidDiagram";
import InviteModal from "./InviteModal";

type ChatMessage = {
  type: "message" | "thinking" | "error";
  author?: string;
  content?: string;
};

type ChatViewProps = {
  sessionId: string;
  displayName: string;
  title: string | null;
  onTitleUpdate?: (sessionId: string, title: string) => void;
  onUsageUpdate?: (tokensUsed: number, tokensLimit: number) => void;
};

const PARTICIPANT_COLORS = [
  { text: "text-emerald-700", bg: "bg-emerald-700" },
  { text: "text-amber-700", bg: "bg-amber-700" },
  { text: "text-rose-700", bg: "bg-rose-700" },
  { text: "text-violet-700", bg: "bg-violet-700" },
  { text: "text-cyan-700", bg: "bg-cyan-700" },
];

function colorForAuthor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PARTICIPANT_COLORS[Math.abs(hash) % PARTICIPANT_COLORS.length];
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colorClass = colorForAuthor(name).bg;
  return (
    <div
      className={`w-7 h-7 rounded-full ${colorClass} text-white text-xs font-medium flex items-center justify-center border-2 border-white`}
      title={name}
    >
      {initial}
    </div>
  );
}

export default function ChatView({
  sessionId,
  displayName,
  title,
  onTitleUpdate,
  onUsageUpdate,
}: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [thinking, setThinking] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const showToast = useToast();

  useEffect(() => {
    setMessages([]);
    const token = localStorage.getItem("huddle_token");
    const isLocal =
      BACKEND_HOST.includes("localhost") || BACKEND_HOST.includes("127.0.0.1");
    const wsScheme = isLocal ? "ws" : "wss";
    const ws = new WebSocket(
      `${wsScheme}://${BACKEND_HOST}/ws/session/${sessionId}?token=${token}`,
    );
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "thinking") {
        setThinking(true);
        return;
      }
      if (data.type === "session_title") {
        onTitleUpdate?.(sessionId, data.title);
        return;
      }

      if (data.type === "usage") {
        onUsageUpdate?.(data.tokens_used, data.tokens_limit);
        return;
      }
      if (data.type === "error") {
        setThinking(false);
        showToast("error", data.content);
        return;
      }
      setThinking(false);
      setMessages((prev) => [...prev, data]);
    };
    ws.onerror = () => {
      showToast("error", "Connection lost. Try refreshing the page.");
    };

    ws.onclose = (event) => {
      if (event.code === 4001) {
        showToast("error", "Your session expired. Please log in again.");
      }
    };

    return () => ws.close();
  }, [sessionId, displayName]);

  useEffect(() => {
    fetchParticipants(sessionId)
      .then(setParticipants)
      .catch(() => showToast("error", "Couldn't load participants."));
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showToast("error", "Not connected. Try refreshing the page.");
      return;
    }
    wsRef.current.send(JSON.stringify({ content: trimmed }));
    setInput("");
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="border-b border-stone-200 px-6 py-3 flex justify-between items-center">
        <p className="text-sm font-medium text-stone-700">{title || "Talon"}</p>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {participants.map((p) => (
              <Avatar key={p.user_id} name={p.display_name} />
            ))}
          </div>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="outline-none border-none cursor-pointer"
          >
            <Plus size={16} />
          </button>
        </div>
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

      {inviteModalOpen && (
        <InviteModal
          sessionId={sessionId}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </div>
  );
}

const markdownComponents = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match?.[1];
    if (lang === "mermaid") {
      return <MermaidDiagram code={String(children).trim()} />;
    }
    return (
      <code className="bg-stone-100 rounded px-1 py-0.5 text-xs" {...props}>
        {children}
      </code>
    );
  },
  table({ children }: any) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="border-collapse border border-stone-200 text-sm">
          {children}
        </table>
      </div>
    );
  },
  th({ children }: any) {
    return (
      <th className="border border-stone-200 bg-stone-50 px-3 py-1.5 text-left font-medium">
        {children}
      </th>
    );
  },
  td({ children }: any) {
    return <td className="border border-stone-200 px-3 py-1.5">{children}</td>;
  },
};

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
          isTalon ? "text-stone-800" : colorForAuthor(msg.author ?? "").text
        }`}
      >
        {msg.author}
      </span>
      <div className="text-sm text-stone-700 leading-relaxed prose prose-sm prose-stone max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
