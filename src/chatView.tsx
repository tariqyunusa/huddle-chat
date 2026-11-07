import { useEffect, useRef, useState } from "react";
import { BACKEND_HOST, fetchParticipants, type Participant } from "./api";
import {
  Plus,
  GitCompareArrows,
  CornerDownLeft,
  Upload,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { useToast } from "./Toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "./MermaidDiagram";
import InviteModal from "./InviteModal";
import RepoPanel from "./RepoPanel";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type ChatMessage = {
  type: "message" | "thinking" | "error" | "document_shared";
  author?: string;
  content?: string;
  title?: string;
  shared_by?: string;
  thumb?: string;
  kind: "pdf" | "text";
};

type ChatViewProps = {
  sessionId: string;
  displayName: string;
  title: string | null;
  onTitleUpdate?: (sessionId: string, title: string) => void;
  onUsageUpdate?: (tokensUsed: number, tokensLimit: number) => void;
};

type Attachment = {
  id: string;
  name: string;
  kind: "pdf" | "text";
  status: "loading" | "ready";
  text: string;
  truncated: boolean;
  thumb?: string;
};

const MAX_DOC_CHARS = 20_000;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;

async function readPdf(file: File): Promise<{ text: string; thumb?: string }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  let total = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    const pageText = content.items
      .map((it: any) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
      .join("");
    pages.push(pageText);
    total += pageText.length;
    if (total > MAX_DOC_CHARS) break; // we only keep this much anyway
  }

  let thumb: string | undefined;
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 180 / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      thumb = canvas.toDataURL("image/jpeg", 0.7);
    }
  } catch {
    /* the thumbnail is optional */
  }
  return {
    text: pages
      .join("\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim(),
    thumb,
  };
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(
      content.items
        .map((it: any) =>
          "str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "",
        )
        .join(""),
    );
  }
  return pages
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const attachmentsRef = useRef<Attachment[]>([]);
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

  function updateAttachments(fn: (prev: Attachment[]) => Attachment[]) {
    const next = fn(attachmentsRef.current);
    attachmentsRef.current = next;
    setAttachments(next);
  }

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
    updateAttachments(() => []);

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
      if (data.type === "memory_status") {
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
      if (!attachMenuRef.current?.contains(event.target as Node))
        setAttachMenuOpen(false);
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

  async function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (fileInputRef.current) fileInputRef.current.value = ""; // lets you re-pick the same file

    for (const file of files) {
      if (attachmentsRef.current.length >= MAX_ATTACHMENTS) {
        showToast("error", `You can attach up to ${MAX_ATTACHMENTS} files.`);
        break;
      }
      const used = attachmentsRef.current.reduce(
        (n, a) => n + a.text.length,
        0,
      );
      const room = MAX_DOC_CHARS - used;
      if (room <= 0) {
        showToast(
          "error",
          "No room left. The combined limit is 20,000 characters.",
        );
        break;
      }
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (isPdf && file.size > MAX_PDF_BYTES) {
        showToast(
          "error",
          `${file.name} is too large. The PDF limit is 10 MB.`,
        );
        continue;
      }

      const id = crypto.randomUUID();
      updateAttachments((prev) => [
        ...prev,
        {
          id,
          name: file.name,
          kind: isPdf ? "pdf" : "text",
          status: "loading",
          text: "",
          truncated: false,
        },
      ]);

      try {
        let raw: string;
        let thumb: string | undefined;
        try {
          if (isPdf) ({ text: raw, thumb } = await readPdf(file));
          else raw = await file.text();
        } catch {
          throw new Error(
            isPdf
              ? `Couldn't read ${file.name}.`
              : `${file.name} doesn't look like text.`,
          );
        }
        if (!raw.trim()) {
          throw new Error(
            isPdf
              ? `No selectable text found in ${file.name}. It may be a scanned PDF.`
              : `${file.name} is empty.`,
          );
        }
        if (raw.includes("\0"))
          throw new Error(`${file.name} doesn't look like text.`);

        const truncated = raw.length > room;
        const text = truncated ? raw.slice(0, room) : raw;
        updateAttachments((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: "ready", text, truncated, thumb } : a,
          ),
        );
      } catch (e) {
        updateAttachments((prev) => prev.filter((a) => a.id !== id));
        showToast(
          "error",
          e instanceof Error ? e.message : `Couldn't attach ${file.name}.`,
        );
      }
    }
  }

  function removeAttachment(id: string) {
    updateAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  const anyLoading = attachments.some((a) => a.status === "loading");
  const canSend =
    !anyLoading && (input.trim().length > 0 || attachments.length > 0);

  function sendMessage() {
    const trimmed = input.trim();
    const ready = attachmentsRef.current.filter((a) => a.status === "ready");
    if (anyLoading || (!trimmed && ready.length === 0)) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showToast("error", "Not connected. Try refreshing the page.");
      return;
    }
    for (const a of ready) {
      wsRef.current.send(
        JSON.stringify({
          type: "share_document",
          title: a.truncated ? `${a.name} (truncated)` : a.name,
          content: a.text,
          kind: a.kind,
          thumb: a.thumb,
        }),
      );
    }
    if (trimmed) wsRef.current.send(JSON.stringify({ content: trimmed }));
    setInput("");
    updateAttachments(() => []);
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
          {messages.map((msg, i) =>
            msg.type === "document_shared" ? (
              <SharedDocument
                key={i}
                msg={msg}
                isSelf={msg.shared_by === displayName}
              />
            ) : (
              <MessageRow
                key={i}
                msg={msg}
                isSelf={msg.author === displayName}
              />
            ),
          )}
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
          <div
            ref={attachMenuRef}
            className="chat-composer relative rounded-2xl px-1 py-0.5 transition-colors"
          >
            {attachments.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-2 pt-2 pb-1">
                {attachments.map((a) => {
                  const label =
                    a.kind === "pdf"
                      ? "PDF"
                      : (a.name.split(".").pop() ?? "FILE")
                          .slice(0, 4)
                          .toUpperCase();
                  return (
                    <div
                      key={a.id}
                      className="attachment-tile group relative h-28 w-24 shrink-0 overflow-hidden rounded-lg"
                      title={
                        a.truncated ? `${a.name} (truncated to fit)` : a.name
                      }
                    >
                      {a.thumb ? (
                        <img
                          src={a.thumb}
                          alt=""
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center">
                          <FileText size={22} />
                          <span className="line-clamp-2 break-all text-[10px] leading-tight">
                            {a.name}
                          </span>
                        </div>
                      )}
                      <span className="attachment-badge absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                        {label}
                      </span>
                      {a.truncated && (
                        <span className="attachment-badge absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                          Truncated
                        </span>
                      )}
                      {a.status === "loading" && (
                        <div className="attachment-loading absolute inset-0 flex items-center justify-center">
                          <Loader2 size={18} className="animate-spin" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        aria-label={`Remove ${a.name}`}
                        className="attachment-remove no-inset absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-1">
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
                  <button
                    type="button"
                    role="menuitem"
                    className="composer-menu-item no-inset"
                    ref={(node) => {
                      menuItemsRef.current[0] = node;
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowDown" ||
                        event.key === "ArrowUp"
                      ) {
                        event.preventDefault();
                        menuItemsRef.current[1]?.focus();
                      }
                    }}
                    onClick={() => {
                      setAttachMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload size={16} />
                    <span>Upload from computer</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="composer-menu-item no-inset"
                    ref={(node) => {
                      menuItemsRef.current[1] = node;
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowDown" ||
                        event.key === "ArrowUp"
                      ) {
                        event.preventDefault();
                        menuItemsRef.current[0]?.focus();
                      }
                    }}
                    onClick={() => {
                      setAttachMenuOpen(false);
                      setRepoPanelOpen(true);
                    }}
                  >
                    <GitCompareArrows size={16} />
                    <span>Add from GitHub</span>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept=".pdf,.txt,.md,.markdown,.csv,.json,.yml,.yaml,.toml,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.sql,.sh,.log"
                onChange={(event) => void addFiles(event.target.files)}
              />

              <input
                className="min-w-0 flex-1 border-none bg-transparent px-2 py-2 text-base text-stone-800 outline-none placeholder:text-stone-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Write a message…"
              />

              <button
                onClick={sendMessage}
                disabled={!canSend}
                aria-label="Send"
                className="composer-send no-inset flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-opacity hover:bg-stone-200 disabled:cursor-default disabled:opacity-40"
              >
                <CornerDownLeft size={16} />
              </button>
            </div>
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
function SharedDocument({ msg, isSelf }: { msg: ChatMessage; isSelf: boolean }) {
  const title = msg.title ?? "Document";
  const base = title.replace(/ \(truncated\)$/, "");
  const label = msg.kind === "pdf" ? "PDF" : (base.split(".").pop() ?? "FILE").slice(0, 4).toUpperCase();
  return (
    <div className={`flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
      {!isSelf && (
        <span className={`text-sm font-medium ${colorForAuthor(msg.shared_by ?? "").text}`}>
          {msg.shared_by}
        </span>
      )}
      <div className="attachment-tile relative h-28 w-24 overflow-hidden rounded-lg" title={title}>
        {msg.thumb ? (
          <img src={msg.thumb} alt={`Preview of ${base}`} className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center">
            <FileText size={22} />
            <span className="line-clamp-2 break-all text-[10px] leading-tight">{base}</span>
          </div>
        )}
        <span className="attachment-badge absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold">
          {label}
        </span>
      </div>
      <span className="max-w-48 truncate text-xs text-stone-400">{title}</span>
    </div>
  );
}
