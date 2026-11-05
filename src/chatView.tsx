import { useEffect, useRef, useState } from "react";
import { BACKEND_HOST, fetchParticipants, type Participant } from "./api";
import { Plus, GitCompareArrows, CornerDownLeft, Upload,  } from "lucide-react";
import { useToast } from "./Toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "./MermaidDiagram";
import InviteModal from "./InviteModal";
import RepoPanel from "./RepoPanel";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

type ChatMessage = {
  type: "message" | "thinking" | "error" | "document_shared";
  author?: string;
  content?: string;
  title?: string;
  shared_by?: string;
};

type ChatViewProps = {
  sessionId: string;
  displayName: string;
  title: string | null;
  onTitleUpdate?: (sessionId: string, title: string) => void;
  onUsageUpdate?: (tokensUsed: number, tokensLimit: number) => void;
};

const MAX_DOC_CHARS = 20_000
const MAX_PDF_BYTES = 10 * 1024 * 1024

async function exractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []
  for (let i = 1;i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    pages.push(
      content.items
      .map((it: any) => ("str" in it ? it.str + (it.hasEOL ? "\n" :" ") : ""))
      .join("")
    )
  }
  return pages.join("\n\n").replace(/[ \t]+\n/g, "\n").trim()
}

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
  const [repoPanelOpen, setRepoPanelOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [thinking, setThinking] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [memorySaving, setMemorySaving] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const MIN_STATUS_MS = 800;
  const statusShownAt = useRef(0);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showStatus(label: string) {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    const wait = Math.max(
      0,
      MIN_STATUS_MS - (Date.now() - statusShownAt.current),
    );
    statusTimer.current = setTimeout(() => {
      setThinking(true);
      setStatusLabel(label);
      statusShownAt.current = Date.now();
    }, wait);
  }

  function clearStatus() {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setThinking(false);
    setStatusLabel(null);
    statusShownAt.current = 0;
  }

  const showToast = useToast();

  useEffect(() => {
    setMessages([]);
    setThinking(false);
    setStatusLabel(null);
    setMemorySaving(false);

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
      if (data.type === "document_shared") {
        setMessages((prev) => [...prev, data]);
        return;
      }
      if (data.type === "talon_status") {
        if (data.phase === "idle") clearStatus();
        else showStatus(data.label);
        return;
      }
      if (data.type === "memory_saving") {
        setMemorySaving(data.active);
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
        setStatusLabel(null);
        showToast("error", data.content);
        return;
      }
      setThinking(false);
      setStatusLabel(null);
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
    if (!attachMenuOpen) return;
    menuItemsRef.current[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!attachMenuRef.current?.contains(event.target as Node)) setAttachMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAttachMenuOpen(false);
        attachButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [attachMenuOpen]);

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

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        showToast("error", "Not connected. Try refreshing the page.");
      } else if (!text.trim()) {
        showToast("error", "That file is empty.");
      } else if (text.includes("\0")) {
        showToast("error", "That file doesn't look like text.");
      } else if (text.length > 20_000) {
        showToast("error", "That file is too long. The limit is 20,000 characters.");
      } else {
        wsRef.current.send(JSON.stringify({ type: "share_document", title: file.name, content: text }));
        showToast("success", `Shared ${file.name} with the session.`);
      }
    } catch {
      showToast("error", "That file doesn't look like text.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className=" px-6 py-3 flex justify-between items-center">
        <p className="text-sm font-medium text-stone-700">{title || "Talon"}</p>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {participants.map((p) => (
              <Avatar key={p.user_id} name={p.display_name} />
            ))}
          </div>
          <button
            onClick={() => setRepoPanelOpen(true)}
            title="Code repositories"
            aria-label="Code repositories"
            className="no-inset outline-none border-none cursor-pointer"
          >
            <GitCompareArrows size={16} />
          </button>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="no-inset outline-none border-none cursor-pointer"
          >
            <Plus size={16} />
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto w-full">
        <div className="chat-fog-edge chat-fog-top" aria-hidden="true" />
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
          {messages.map((msg, i) => msg.type === "document_shared" ? (
            <div key={i} className="text-center text-xs text-stone-400">{msg.shared_by} shared “{msg.title}”</div>
          ) : <MessageRow key={i} msg={msg} isSelf={msg.author === displayName} />)}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <span className="font-medium text-stone-500">Talon</span>
              <span className="italic">
                {statusLabel ? `${statusLabel.toLowerCase()}…` : "is thinking…"}
              </span>
            </div>
          )}
          {memorySaving && !thinking && (
            <div className="text-xs italic text-stone-400">
              Saving to memory…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="chat-input-area px-6 py-4">
        <div className="chat-fog-input" aria-hidden="true" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div ref={attachMenuRef} className="chat-composer relative flex items-center gap-1 rounded-2xl px-1 py-0.5 transition-colors">
            <button
              type="button"
              ref={attachButtonRef}
              aria-label="Add"
              aria-haspopup="menu"
              aria-expanded={attachMenuOpen}
              onClick={() => setAttachMenuOpen((open) => !open)}
              className="composer-btn no-inset flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors"
            >
              <Plus size={18} />
            </button>

            {attachMenuOpen && (
              <div className="composer-menu" role="menu">
                <button type="button" role="menuitem" className="composer-menu-item no-inset" ref={(node) => { menuItemsRef.current[0] = node; }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); menuItemsRef.current[1]?.focus(); }
                  }}
                  onClick={() => { setAttachMenuOpen(false); fileInputRef.current?.click(); }}>
                  <Upload size={16} /><span>Upload from computer</span>
                </button>
                <button type="button" role="menuitem" className="composer-menu-item no-inset" ref={(node) => { menuItemsRef.current[1] = node; }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); menuItemsRef.current[0]?.focus(); }
                  }}
                  onClick={() => { setAttachMenuOpen(false); setRepoPanelOpen(true); }}>
                  <GitCompareArrows size={16} /><span>Add from GitHub</span>
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" hidden accept=".txt,.md,.markdown,.csv,.json,.yml,.yaml,.toml,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.sql,.sh,.log" onChange={(event) => void uploadFile(event.target.files?.[0])} />

            <input
              className="min-w-0 flex-1 border-none bg-transparent px-2 py-2 text-base text-stone-800 outline-none placeholder:text-stone-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Write a message…"
            />

            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              aria-label="Send"
              className="composer-send  no-inset flex h-9 w-9 shrink-0 cursor-pointer hover:bg-stone-200 items-center justify-center rounded-xl transition-opacity disabled:cursor-default disabled:opacity-40"
            >
              <CornerDownLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {inviteModalOpen && (
        <InviteModal
          sessionId={sessionId}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
      {repoPanelOpen && (
        <RepoPanel
          sessionId={sessionId}
          onClose={() => setRepoPanelOpen(false)}
        />
      )}
    </div>
  );
}

const markdownComponents = {
  pre({ children }: any) {
    // Mermaid diagrams render their own container, so don't wrap them
    const child: any = Array.isArray(children) ? children[0] : children;
    if (/language-mermaid/.test(child?.props?.className || ""))
      return <>{children}</>;
    return (
      <pre className="my-3 overflow-x-auto rounded-lg bg-stone-900 p-4 text-[13px] leading-relaxed text-stone-100 dark:bg-black/60">
        {children}
      </pre>
    );
  },
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match?.[1];
    const text = String(children);
    if (lang === "mermaid") {
      return <MermaidDiagram code={text.trim()} />;
    }
    const isBlock = !!lang || text.includes("\n");
    if (isBlock) {
      return (
        <code className="bg-transparent p-0 font-mono text-inherit" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-stone-100 px-1 py-0.5 text-xs text-stone-800 dark:bg-stone-800 dark:text-stone-100"
        {...props}
      >
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
        <div className="max-w-lg rounded-2xl bg-stone-100 px-4 py-2.5 text-sm text-stone-800 dark:bg-black dark:text-white">
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
