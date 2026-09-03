import { useEffect, useRef, useState } from "react";
import {
  BACKEND_HOST,
  fetchParticipants,
  inviteToSession,
  searchUsers,
  type Participant,
} from "./api";
import { Plus, Link2, Mail, MessageCircle, Check } from "lucide-react";
import { useToast } from "./Toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "./MermaidDiagram";
import type {UserSearchResult} from "./api";


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
}: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [thinking, setThinking] = useState(false);
  const [copied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const showToast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<UserSearchResult[]>([]);
  const [inviting, setInviting] = useState(false);
  const inviteMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inviteQuery.includes("@") || inviteQuery.trim().length < 2) {
      setInviteResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchUsers(inviteQuery)
        .then(setInviteResults)
        .catch(() => setInviteResults([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [inviteQuery]);

  async function sendInvite(target: { email?: string; user_id?: string }) {
    setInviting(true);
    try {
      await inviteToSession(sessionId, target);
      showToast("success", "Invite sent");
      setInviteOpen(false);
      setInviteQuery("");
      setInviteResults([]);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Couldn't send invite",
      );
    } finally {
      setInviting(false);
    }
  }

  function getInviteUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("session", sessionId);
    return url.toString();
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(getInviteUrl());
    showToast("success", "Link copied to clipboard");
    setShareOpen(false);
  }

  function shareViaWhatsApp() {
    const text = encodeURIComponent(
      `Join my Huddle session: ${getInviteUrl()}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setShareOpen(false);
  }

  function shareViaEmail() {
    const subject = encodeURIComponent("Join my Huddle session");
    const body = encodeURIComponent(`Join here: ${getInviteUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(e.target as Node)
      ) {
        setShareOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMessages([]);
    const token = localStorage.getItem("huddle_token");
    const ws = new WebSocket(
      `wss://${BACKEND_HOST}/ws/session/${sessionId}?token=${token}`,
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
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShareOpen((prev) => !prev)}
              className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-stone-600 border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
            >
              <Link2 size={14} />
              Share
            </button>

            {shareOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-lg py-1 z-10">
                <button
                  onClick={copyInviteLink}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Link2 size={14} />}
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <button
                  onClick={shareViaWhatsApp}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </button>
                <button
                  onClick={shareViaEmail}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Mail size={14} />
                  Email
                </button>
              </div>
            )}
          </div>
          <div className="relative" ref={inviteMenuRef}>
            <button
              onClick={() => setInviteOpen((prev) => !prev)}
              className="outline-none border-none cursor-pointer"
            >
              <Plus size={16} />
            </button>

            {inviteOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-stone-200 rounded-xl shadow-lg p-3 z-10">
                <input
                  type="text"
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                  placeholder="Email or name…"
                  autoFocus
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
                {inviteQuery.includes("@") && (
                  <button
                    onClick={() => sendInvite({ email: inviteQuery })}
                    disabled={inviting}
                    className="w-full mt-2 bg-stone-800 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {inviting ? "Sending…" : `Invite ${inviteQuery}`}
                  </button>
                )}
                {inviteResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {inviteResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => sendInvite({ user_id: u.id })}
                        disabled={inviting}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-stone-50 disabled:opacity-50"
                      >
                        {u.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}


