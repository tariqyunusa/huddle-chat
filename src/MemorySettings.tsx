import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConflictError,
  deleteMemoryDoc,
  getMemoryDocs,
  getMemoryProcedures,
  patchMemoryDoc,
  putProcedure,
  type MemoryDoc,
} from "./api";
import { Pencil, Trash2 } from "lucide-react";

type Draft = { name: string; description: string; content: string };
type Editor = {
  id: string;
  base: MemoryDoc | null;
  draft: Draft;
  busy: boolean;
  error: string;
  retryable: boolean;
  conflict: boolean;
  latestVersion?: number;
  deleteConfirm: boolean;
  closing: boolean;
};

function relativeTime(value: string): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Updated recently";
  const ageDays = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (ageDays < 7) {
    const day = ageDays === 0 ? "today" : ageDays === 1 ? "yesterday" : `${ageDays} days ago`;
    return `Updated ${day}`;
  }
  return `Updated ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(time)}`;
}

function humanizedTitle(path: string): string {
  const filename = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? path;
  return filename.split(/[-_\s]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function groupForPath(path: string): string {
  const parts = path.split("/");
  if (parts.length === 1) return "You";
  const folder = parts[0].toLowerCase();
  // if (folder === "procedures") return "Instructions";
  if (folder === "topics") return "Topics";
  if (folder === "project" || folder === "projects") return "Projects";
  return folder.charAt(0).toUpperCase() + folder.slice(1);
}

function groupOrder(group: string): number {
  const fixed = ["You", , "Topics", "Projects"];
  const index = fixed.indexOf(group);
  return index < 0 ? fixed.length : index;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function isNetworkError(error: unknown): boolean { return error instanceof TypeError; }

function hasUnsavedDraft(editor: Editor | null): boolean {
  if (!editor?.base || editor.deleteConfirm) return false;
  return editor.base.kind === "semantic"
    ? editor.draft.content !== factsFromContent(editor.base.content)
    : editor.draft.name !== editor.base.path.replace(/^procedures\//, "").replace(/\.md$/, "")
      || editor.draft.description !== editor.base.description
      || editor.draft.content !== editor.base.content;
}

function factsFromContent(content: string): string {
  return content.split("\n").map((line) => line.replace(/^- \[stated\] /, "").trim()).filter(Boolean).join("\n");
}

function slugFor(name: string): string {
  return `procedures/${name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9/_.-]/g, "").replace(/-{2,}/g, "-")}.md`;
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p aria-live="polite" className="mt-2 text-sm text-red-600 dark:text-red-400">{children}</p>;
}

function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">{label}{children}</label>;
}

function MemoryDocRow({
  doc, mode, editor, pathCollision, reducedMotion, saved, confirmDelete, deletePending, deleteError, exiting, onEdit, onCancel, onEscape, onDraft, onSave, onDeleteAsk, onCancelDelete, onDelete, onRetry, onRetryDelete, onReload,
}: {
  doc: MemoryDoc;
  mode: "semantic" | "procedural";
  editor: Editor | null;
  pathCollision: boolean;
  reducedMotion: boolean;
  saved: boolean;
  confirmDelete: boolean;
  deletePending: boolean;
  deleteError: string;
  exiting: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onEscape: () => void;
  onDraft: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onDeleteAsk: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onRetryDelete: () => void;
  onReload: () => void;
}) {
  const firstField = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const cancelDeleteButton = useRef<HTMLButtonElement>(null);
  const open = Boolean(editor && !editor.closing);
  const editing = Boolean(editor && !editor.deleteConfirm);
  const changed = Boolean(editor && (mode === "semantic"
    ? editor.draft.content !== factsFromContent(doc.content)
    : editor.draft.description !== doc.description || editor.draft.content !== doc.content));
  const path = editor ? slugFor(editor.draft.name) : doc.path;
  const invalidName = mode === "procedural" && (!editor?.draft.name.trim() || path.length > 80 || !/^[a-z0-9/_.-]+$/.test(path) || pathCollision);
  const invalidContent = Boolean(editor && (mode === "procedural" ? !editor.draft.content.trim() || editor.draft.content.length > 4000 : !editor.draft.content.trim()));
  const invalidDescription = Boolean(editor && mode === "procedural" && (!editor.draft.description.trim() || editor.draft.description.length > 150));
  const invalid = invalidName || invalidContent || invalidDescription;

  useEffect(() => { if (editing) firstField.current?.focus(); }, [editing]);
  useEffect(() => { if (confirmDelete && !deletePending) cancelDeleteButton.current?.focus(); }, [confirmDelete, deletePending]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onEscape(); }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); event.stopPropagation(); if (!invalid && changed && !editor?.busy) onSave(); }
  }

  return (
    <article
      className="grid overflow-hidden rounded-xl "
      style={{ gridTemplateRows: exiting ? "0fr" : "1fr", opacity: exiting ? 0 : 1, transition: reducedMotion ? "none" : "grid-template-rows 200ms ease-out, opacity 200ms ease-out" }}
    >
      <div className="min-h-0 overflow-hidden">
      <div
        data-memory-row={doc.id}
        onClick={() => {
          if (exiting || deletePending) return;
          if (confirmDelete) onCancelDelete();
          else onEdit();
        }}
        className="group grid cursor-pointer grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-3 px-2 py-4 text-left transition-colors  max-sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)_auto] max-sm:gap-2"
      >
        <span className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">{humanizedTitle(doc.path)}</span>
        <span className="truncate text-sm text-stone-500 dark:text-stone-400">{doc.description}</span>
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <span className="text-xs text-stone-400 dark:text-stone-500">{relativeTime(doc.updated_at)}</span>
          {confirmDelete ? <div className="flex items-center gap-1 text-sm" onClick={(event) => event.stopPropagation()}>
            <span className="mr-1 text-stone-600 dark:text-stone-300">Delete this?</span>
            <button ref={cancelDeleteButton} type="button" disabled={deletePending} onClick={onCancelDelete} className="rounded-lg px-2 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800">Cancel</button>
            <button type="button" disabled={deletePending} onClick={onDelete} className="rounded-lg px-2 py-1 font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950">
              {deletePending ? <span aria-label="Deleting" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-middle" /> : "Delete"}
            </button>
          </div> : <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
            <button id={`memory-edit-${doc.id}`} type="button" disabled={deletePending || exiting} aria-label={`Edit ${humanizedTitle(doc.path)}`} aria-expanded={open} aria-controls={`memory-panel-${doc.id}`} onClick={onEdit} className="flex items-center cursor-pointer gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-600 opacity-0 no-inset transition-opacity hover:bg-stone-100  group-hover:opacity-100  focus-visible:opacity-100 disabled:cursor-not-allowed [@media(hover:none)]:opacity-100 dark:text-stone-300 dark:hover:bg-gray-700">
              <Pencil size={14} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Delete ${humanizedTitle(doc.path)}`} disabled={deletePending || exiting} onClick={onDeleteAsk} className="rounded-lg p-1.5 text-stone-500 opacity-0 transition-opacity no-inset cursor-pointer hover:bg-rose-50 hover:text-rose-700 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed [@media(hover:none)]:opacity-100 dark:text-stone-400 dark:hover:bg-rose-950 dark:hover:text-rose-300">
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>}
        </div>
      </div>
      {deleteError && !open && <div className="px-3 pb-3" role="alert"><FieldError>{deleteError}</FieldError><button type="button" onClick={onRetryDelete} disabled={deletePending} className="mt-1 text-sm font-medium text-stone-600 underline disabled:opacity-50 dark:text-stone-300">Retry</button></div>}
      {saved && <p role="status" className="px-3 pb-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">Saved</p>}
      <div
        id={`memory-panel-${doc.id}`}
        aria-hidden={!open}
        className="grid overflow-hidden"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, transition: reducedMotion ? "none" : "grid-template-rows 200ms ease-out, opacity 200ms ease-out" }}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          {editing && editor ? <div className="px-3 pb-5 pt-2 sm:px-5" onKeyDown={onKeyDown}>
        <div className="space-y-4">
          {mode === "procedural" ? <>
            <EditorField label="Name">
              <input ref={firstField as React.RefObject<HTMLInputElement>} value={editor.draft.name} onChange={(event) => onDraft({ name: event.target.value })} maxLength={80} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100" />
            </EditorField>
            <p className="-mt-3 text-xs text-stone-500 dark:text-stone-400">Path preview: <code>{path}</code> ({path.length}/80)</p>
            {pathCollision && <FieldError>An instruction already uses this path.</FieldError>}
            {path.length > 80 && <FieldError>Name must produce a path of at most 80 characters.</FieldError>}
            <EditorField label="Description">
              <input value={editor.draft.description} onChange={(event) => onDraft({ description: event.target.value })} maxLength={150} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100" />
            </EditorField>
            <p className="-mt-3 text-right text-xs text-stone-400">{editor.draft.description.length}/150</p>
          </> : <>
            <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{doc.path}</p>
            <EditorField label="Facts, one per line">
              <textarea ref={firstField as React.RefObject<HTMLTextAreaElement>} value={editor.draft.content} onChange={(event) => onDraft({ content: event.target.value })} rows={5} className="mt-1 block w-full resize-y rounded-lg  bg-gray-50 px-3 py-2 text-sm leading-6 text-stone-800 outline-none  dark:bg-gray-300 dark:text-stone-100" />
            </EditorField>
            <p className="text-xs text-stone-500 dark:text-stone-400">Talon may add to this over time.</p>
            {!editor.draft.content.trim() && <button type="button" onClick={onDeleteAsk} className="text-left text-sm font-medium text-red-700 underline dark:text-red-300">Delete this document instead?</button>}
          </>}
          {mode === "procedural" ? <EditorField label="Instruction">
            <textarea value={editor.draft.content} onChange={(event) => onDraft({ content: event.target.value })} maxLength={4000} rows={5} className="mt-1 block w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm leading-6 text-stone-800 outline-none focus:border-stone-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100" />
          </EditorField> : null}
          {mode === "procedural" && <p className="-mt-3 text-right text-xs text-stone-400">{editor.draft.content.length}/4,000</p>}
          {editor.conflict && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p>This changed elsewhere (Talon may have saved a new fact).</p>
            <button type="button" onClick={onReload} className="mt-2 rounded-md px-2 py-1 font-medium underline">Reload</button>
            <p className="mt-2 text-xs">Your draft remains below so you can copy it.</p>
          </div>}
          {editor.error && <div><FieldError>{editor.error}</FieldError>{editor.retryable && <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-stone-600 underline dark:text-stone-300">Retry</button>}</div>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!changed || invalid || editor.busy} onClick={onSave} className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white dark:bg-red-700 transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-45  dark:text-stone-900 dark:hover:bg-white">{editor.busy ? "Saving…" : "Save"}</button>
            <button type="button" disabled={editor.busy} onClick={onCancel} className="rounded-lg px-3 py-2 text-sm  text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-100">Cancel</button>
            {editor.deleteConfirm ? <>
              <span className="text-sm text-stone-600 dark:text-stone-300">Delete this {mode === "semantic" ? "document" : "instruction"}?</span>
              <button type="button" disabled={deletePending} onClick={onDelete} className="rounded-lg px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950">{deletePending ? <span aria-label="Deleting" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-middle" /> : "Confirm delete"}</button>
              <button type="button" disabled={deletePending} onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800">Keep</button>
            </> : <button type="button" disabled={editor.busy} onClick={onDeleteAsk} className="ml-auto rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950">Delete {mode === "semantic" ? "document" : "instruction"}</button>}
          </div>
        </div>
        </div> : editor?.deleteConfirm && <div className="space-y-4 px-3 pb-5 pt-2 sm:px-5" role="alert">
          <p className="text-sm text-stone-600 dark:text-stone-300">Delete this {mode === "semantic" ? "document" : "instruction"}?</p>
          {editor.error && <><FieldError>{editor.error}</FieldError>{editor.retryable && <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-stone-600 underline dark:text-stone-300">Retry</button>}</>}
          <button type="button" disabled={deletePending} onClick={onDelete} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950">{deletePending ? <span aria-label="Deleting" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-middle" /> : "Delete"}</button>
          <button type="button" disabled={deletePending} onClick={onCancel} className="rounded-lg px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800">Cancel</button>
        </div>}
          {saved && <p role="status" className="px-3 pb-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">Saved</p>}
        </div>
      </div>
      </div>
    </article>
  );
}

function MemoryList({ docs, editor, savedId, reducedMotion, confirmDeleteId, deletePendingId, deleteErrors, exitingIds, onStart, onCancel, onEscape, onDraft, onSave, onDeleteAsk, onCancelDelete, onDelete, onRetry, onRetryDelete, onReload }: {
  docs: MemoryDoc[]; editor: Editor | null; savedId: string | null; reducedMotion: boolean;
  confirmDeleteId: string | null; deletePendingId: string | null; deleteErrors: Record<string, string>; exitingIds: string[];
  onStart: (doc: MemoryDoc) => void; onCancel: () => void; onEscape: () => void; onDraft: (patch: Partial<Draft>) => void;
  onSave: () => void; onDeleteAsk: (doc: MemoryDoc) => void; onCancelDelete: () => void; onDelete: (doc: MemoryDoc) => void; onRetry: () => void; onRetryDelete: (doc: MemoryDoc) => void; onReload: () => void;
}) {
  /* Disabled for now; re-enable when instruction creation returns.
  const [createDraft, setCreateDraft] = useState<Draft>({ name: "", description: "", content: "" });
  const [createError, setCreateError] = useState("");
  const [createRetryable, setCreateRetryable] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const path = slugFor(createDraft.name);
  const collision = docs.some((doc) => doc.path === path);
  const createInvalid = !createDraft.name.trim() || path.length > 80 || !/^[a-z0-9/_.-]+$/.test(path) || collision || !createDraft.description.trim() || createDraft.description.length > 150 || !createDraft.content.trim() || createDraft.content.length > 4000;

  function beginCreate() {
    setCreateDraft({ name: "", description: "", content: "" });
    setCreateError("");
    onCreate();
  }

  function handleCreateKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation();
      const hasDraft = Boolean(createDraft.name || createDraft.description || createDraft.content);
      if (hasDraft && !window.confirm("Discard changes?")) return;
      onCreateCancel();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); event.stopPropagation(); if (!createInvalid && !createBusy) void submitCreate(); }
  }

  async function submitCreate() {
    setCreateBusy(true); setCreateError("");
    try { await onCreateDraft(createDraft); setCreateRetryable(false); }
    catch (err) { setCreateError(err instanceof Error ? err.message : "Couldn't save instruction."); setCreateRetryable(isNetworkError(err)); }
    finally { setCreateBusy(false); }
  }
  */

  const groupNames = [...docs.map((doc) => groupForPath(doc.path))];
  const groups = Array.from(new Set(groupNames)).sort((a, b) => groupOrder(a) - groupOrder(b) || a.localeCompare(b));

  function renderRows(rows: MemoryDoc[]) {
    return <div>{rows.map((doc) => <MemoryDocRow key={doc.id} doc={doc} mode={doc.kind} editor={editor?.id === doc.id ? editor : null} pathCollision={Boolean(editor && editor.id === doc.id && docs.some((item) => item.id !== doc.id && item.path === slugFor(editor.draft.name)))} reducedMotion={reducedMotion} saved={savedId === doc.id} confirmDelete={confirmDeleteId === doc.id} deletePending={deletePendingId === doc.id} deleteError={deleteErrors[doc.id] ?? ""} exiting={exitingIds.includes(doc.id)} onEdit={() => onStart(doc)} onCancel={onCancel} onEscape={onEscape} onDraft={onDraft} onSave={onSave} onDeleteAsk={() => onDeleteAsk(doc)} onCancelDelete={onCancelDelete} onDelete={() => onDelete(doc)} onRetry={onRetry} onRetryDelete={() => onRetryDelete(doc)} onReload={onReload} />)}</div>;
  }

  return <div className="space-y-6">
    {docs.length === 0 ? <p className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">Nothing saved yet. Talon saves facts you state and instructions you add.</p> : null}
    {groups.map((group) => {
      const rows = docs.filter((doc) => groupForPath(doc.path) === group);
      return <section key={group}>
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-3 dark:border-stone-700">
      <h3 className="text-base font-semibold text-stone-800 dark:text-stone-100">{group}</h3>
      {/* Disabled for now; re-enable when instruction creation returns.
      {group === "Instructions" && <button type="button" onClick={beginCreate} disabled={maxed || Boolean(editor) || creating} title={maxed ? "You can have up to 5 instructions." : undefined} className="rounded-xl bg-stone-800 px-3 py-2 text-sm font-medium cursor-pointer no-inset text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white">New instruction</button>}
      */}
    </div>
    {/* Disabled for now; re-enable when instruction creation returns.
    {creating && group === "Instructions" && <div className="space-y-4 border-b border-stone-200 py-5 dark:border-stone-700" onKeyDown={handleCreateKeyDown}>
      <EditorField label="Name"><input autoFocus value={createDraft.name} onChange={(event) => setCreateDraft({ ...createDraft, name: event.target.value })} maxLength={80} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100" /></EditorField>
      <p className="-mt-3 text-xs text-stone-500 dark:text-stone-400">Path preview: <code>{path}</code> ({path.length}/80)</p>
      {collision && <FieldError>An instruction already uses this path.</FieldError>}
      <EditorField label="Description"><input value={createDraft.description} onChange={(event) => setCreateDraft({ ...createDraft, description: event.target.value })} maxLength={150} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100" /></EditorField>
      <p className="-mt-3 text-right text-xs text-stone-400">{createDraft.description.length}/150</p>
      <EditorField label="Instruction"><textarea value={createDraft.content} onChange={(event) => setCreateDraft({ ...createDraft, content: event.target.value })} maxLength={4000} rows={5} className="mt-1 block w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm leading-6 text-stone-800 outline-none focus:border-stone-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100" /></EditorField>
      <p className="-mt-3 text-right text-xs text-stone-400">{createDraft.content.length}/4,000</p>
      {createError && <><FieldError>{createError}</FieldError>{createRetryable && <button type="button" onClick={() => void submitCreate()} className="text-sm font-medium text-stone-600 underline dark:text-stone-300">Retry</button>}</>}
      <div className="flex gap-2"><button type="button" disabled={createInvalid || createBusy} onClick={() => void submitCreate()} className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-45 dark:bg-stone-100 dark:text-stone-900">{createBusy ? "Saving…" : "Save"}</button><button type="button" onClick={onCreateCancel} className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">Cancel</button></div>
    </div>}
    */}
    {renderRows(rows)}
      </section>;
    })}
    {/* Disabled for now; re-enable when instruction creation returns.
    {creating && !groups.includes("Instructions") && <section>
      <div className="flex justify-end border-b border-stone-200 pb-3 dark:border-stone-700"><button type="button" onClick={onCreateCancel} className="text-sm text-stone-600 dark:text-stone-300">Cancel</button></div>
    </section>}
    */}
  </div>;
}

function LoadingState() {
  return <div aria-label="Loading memory" className="space-y-6 animate-pulse">{[0, 1, 2].map((group) => <div key={group}><div className="mb-2 h-5 w-28 rounded bg-stone-100 dark:bg-stone-800" />{[0, 1].map((row) => <div key={row} className="grid grid-cols-[220px_minmax(0,1fr)_110px] gap-3 border-b border-stone-100 py-4 dark:border-stone-800"><div className="h-4 w-32 rounded bg-stone-100 dark:bg-stone-800" /><div className="h-4 w-4/5 rounded bg-stone-100 dark:bg-stone-800" /><div className="h-4 w-20 justify-self-end rounded bg-stone-100 dark:bg-stone-800" /></div>)}</div>)}</div>;
}

export default function MemorySettings({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const [semanticDocs, setSemanticDocs] = useState<MemoryDoc[]>([]);
  const [proceduralDocs, setProceduralDocs] = useState<MemoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  // Disabled for now; re-enable when instruction creation returns.
  // const [creating, setCreating] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const reducedMotion = useReducedMotion();
  const retryRef = useRef<(() => Promise<void>) | null>(null);
  const closeTimer = useRef<number | null>(null);

  const loadMemory = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [semantic, procedural] = await Promise.all([getMemoryDocs("semantic"), getMemoryProcedures()]);
      setSemanticDocs(semantic.filter((doc) => doc.scope_type === "user"));
      setProceduralDocs(procedural.filter((doc) => doc.scope_type === "user"));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Couldn't load memory."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadMemory(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMemory]);

  const dirty = Boolean(hasUnsavedDraft(editor));
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const closeEditor = useCallback((after?: () => void) => {
    const current = editor;
    // Disabled for now; re-enable when instruction creation returns.
    // setCreating(false);
    retryRef.current = null;
    if (!current || reducedMotion) {
      setEditor(null);
      if (current) document.getElementById(`memory-edit-${current.id}`)?.focus();
      after?.();
      return;
    }
    setEditor({ ...current, closing: true });
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setEditor((latest) => latest?.id === current.id ? null : latest);
      document.getElementById(`memory-edit-${current.id}`)?.focus();
      after?.();
    }, 205);
  }, [editor, reducedMotion]);

  useEffect(() => () => { if (closeTimer.current !== null) window.clearTimeout(closeTimer.current); }, []);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && deletePendingId !== confirmDeleteId) {
        event.preventDefault();
        setConfirmDeleteId(null);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (deletePendingId === confirmDeleteId) return;
      const target = event.target;
      if (target instanceof Element && !target.closest(`[data-memory-row="${confirmDeleteId}"]`)) setConfirmDeleteId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [confirmDeleteId, deletePendingId]);

  const cancel = useCallback(() => closeEditor(), [closeEditor]);
  const startEdit = useCallback((doc: MemoryDoc) => {
    const open = () => setEditor({ id: doc.id, base: doc, draft: { name: doc.path.replace(/^procedures\//, "").replace(/\.md$/, ""), description: doc.description, content: doc.kind === "semantic" ? factsFromContent(doc.content) : doc.content }, busy: false, error: "", retryable: false, conflict: false, deleteConfirm: false, closing: false });
    setConfirmDeleteId(null);
    if (editor?.id === doc.id) {
      if (hasUnsavedDraft(editor) && !window.confirm("Discard changes?")) return;
      closeEditor();
      return;
    }
    if (hasUnsavedDraft(editor) && !window.confirm("Discard changes?")) return;
    if (editor) closeEditor(open);
    else open();
  }, [editor, closeEditor]);
  const escapeEditor = useCallback(() => {
    if (hasUnsavedDraft(editor) && !window.confirm("Discard changes?")) return;
    closeEditor();
  }, [editor, closeEditor]);
  const updateDraft = useCallback((patch: Partial<Draft>) => setEditor((current) => current ? { ...current, draft: { ...current.draft, ...patch }, error: "" } : current), []);

  const save = useCallback(async () => {
    if (!editor?.base) return;
    const current = editor;
    setEditor({ ...current, busy: true, error: "", retryable: false });
    const action = async () => {
      if (current.base?.kind === "semantic") {
        const updated = await patchMemoryDoc(current.base.id, { content: current.draft.content, if_version: current.latestVersion ?? current.base.version });
        setSemanticDocs((docs) => docs.map((doc) => doc.id === updated.id ? updated : doc));
        setSavedId(updated.id);
        window.setTimeout(() => setSavedId((id) => id === updated.id ? null : id), 2200);
      } else {
        const newPath = slugFor(current.draft.name);
        const updated = await putProcedure(newPath, { description: current.draft.description, content: current.draft.content, if_version: newPath === current.base?.path ? current.base.version : undefined });
        if (newPath !== current.base?.path) await deleteMemoryDoc(current.base!.id);
        setProceduralDocs((docs) => newPath === current.base?.path ? docs.map((doc) => doc.id === updated.id ? updated : doc) : [...docs.filter((doc) => doc.id !== current.base!.id), updated]);
        setSavedId(updated.id);
        window.setTimeout(() => setSavedId((id) => id === updated.id ? null : id), 2200);
      }
      closeEditor();
    };
    retryRef.current = action;
    try { await action(); }
    catch (err) {
      if (err instanceof ConflictError) setEditor({ ...current, busy: false, conflict: true, latestVersion: err.current_version, error: "" });
      else setEditor({ ...current, busy: false, error: err instanceof Error ? err.message : "Couldn't save changes.", retryable: isNetworkError(err) });
    }
  }, [editor, closeEditor]);

  const deleteDocument = useCallback(async (doc: MemoryDoc) => {
    if (editor?.id !== doc.id) setConfirmDeleteId(doc.id);
    setDeletePendingId(doc.id);
    setDeleteErrors((current) => { const next = { ...current }; delete next[doc.id]; return next; });
    try {
      await deleteMemoryDoc(doc.id);
      setConfirmDeleteId(null);
      setExitingIds((current) => current.includes(doc.id) ? current : [...current, doc.id]);
      const finishDelete = () => {
        setSemanticDocs((docs) => docs.filter((item) => item.id !== doc.id));
        setProceduralDocs((docs) => docs.filter((item) => item.id !== doc.id));
        setExitingIds((current) => current.filter((id) => id !== doc.id));
        setDeletePendingId(null);
        setEditor((current) => current?.id === doc.id ? null : current);
      };
      if (reducedMotion) finishDelete();
      else window.setTimeout(finishDelete, 205);
    } catch (deleteError) {
      setDeletePendingId(null);
      setConfirmDeleteId(null);
      setDeleteErrors((current) => ({ ...current, [doc.id]: deleteError instanceof Error ? deleteError.message : "Couldn't delete this document." }));
      if (editor?.id === doc.id) closeEditor();
    }
  }, [reducedMotion, editor, closeEditor]);

  /* Disabled for now; re-enable when instruction creation returns.
  async function createProcedure(draft: Draft) {
    const created = await putProcedure(slugFor(draft.name), { description: draft.description, content: draft.content });
    setProceduralDocs((docs) => [...docs, created]); setCreating(false); setSavedId(created.id);
    window.setTimeout(() => setSavedId((id) => id === created.id ? null : id), 2200);
  }
  */

  async function reloadConflict() {
    const id = editor?.id;
    const version = editor?.latestVersion;
    if (!id || !version) return;
    try {
      const [semantic, procedural] = await Promise.all([getMemoryDocs("semantic"), getMemoryProcedures()]);
      const visibleSemantic = semantic.filter((doc) => doc.scope_type === "user");
      const visibleProcedural = procedural.filter((doc) => doc.scope_type === "user");
      setSemanticDocs(visibleSemantic);
      setProceduralDocs(visibleProcedural);
      const latest = [...visibleSemantic, ...visibleProcedural].find((doc) => doc.id === id);
      setEditor((current) => current ? { ...current, base: latest ?? current.base, latestVersion: latest?.version ?? version, conflict: true, error: "", retryable: false } : current);
    } catch (err) {
      retryRef.current = () => reloadConflict();
      setEditor((current) => current ? { ...current, error: err instanceof Error ? err.message : "Couldn't reload this document.", retryable: isNetworkError(err) } : current);
    }
  }

  function deleteAsk(doc: MemoryDoc) {
    setDeleteErrors((current) => { const next = { ...current }; delete next[doc.id]; return next; });
    if (!editor) setConfirmDeleteId(doc.id);
    else if (editor.id === doc.id) setEditor({ ...editor, deleteConfirm: true, error: "" });
  }

  function cancelDeleteConfirm() {
    if (deletePendingId) return;
    setConfirmDeleteId(null);
  }

  function retryRequest() {
    if (!editor || !retryRef.current) return;
    setEditor({ ...editor, busy: true, error: "", retryable: false });
    void retryRef.current();
  }

  return <div className="space-y-8">
    <p className="max-w-2xl text-sm leading-6 text-stone-500 dark:text-stone-400">Facts come from things you say in sessions and are only used when you are the one speaking.</p>
    {loading ? <LoadingState /> : error ? <div role="alert" className="rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900"><p className="text-sm text-stone-600 dark:text-stone-300">{error}</p><button onClick={() => void loadMemory()} className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 dark:text-stone-200 dark:hover:bg-stone-800">Retry</button></div> : <MemoryList
      docs={[...semanticDocs, ...proceduralDocs]}
      editor={editor}
      savedId={savedId}
      reducedMotion={reducedMotion}
      onStart={startEdit}
      onCancel={cancel}
      onEscape={escapeEditor}
      onDraft={updateDraft}
      onSave={() => void save()}
      confirmDeleteId={confirmDeleteId}
      deletePendingId={deletePendingId}
      deleteErrors={deleteErrors}
      exitingIds={exitingIds}
      onDeleteAsk={deleteAsk}
      onCancelDelete={cancelDeleteConfirm}
      onDelete={(doc) => void deleteDocument(doc)}
      onRetry={retryRequest}
      onRetryDelete={(doc) => void deleteDocument(doc)}
      onReload={() => void reloadConflict()}
    />}
    {/* Disabled for now; re-enable when instruction creation returns.
    onCreate={() => { if (!editor && proceduralDocs.length < 5) setCreating(true); }}
    onCreateCancel={cancel}
    onCreateDraft={createProcedure}
    maxed={proceduralDocs.length >= 5 || Boolean(editor)}
    */}
  </div>;
}
