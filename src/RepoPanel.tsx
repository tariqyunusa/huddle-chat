import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Lock, Trash2, X } from "lucide-react";
import { useToast } from "./Toast";
import {
  attachRepo, ConfirmPrivateError, getGithubInstallations, getGithubRepos,
  getSessionRepos, removeRepo, type GithubRepo, type SessionRepo,
} from "./api";

function describe(r: SessionRepo) {
  if (r.status === "failed") return r.error ?? "Import failed";
  if (r.status === "pending") return "Queued…";
  if (r.status === "syncing") return "Importing…";
  return r.indexed ? `${r.file_count} files · searchable` : `${r.file_count} files · indexing…`;
}

export default function RepoPanel({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const showToast = useToast();
  const [repos, setRepos] = useState<SessionRepo[] | null>(null);
  const [granted, setGranted] = useState<GithubRepo[]>([]);
  const [connected, setConnected] = useState(true);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<GithubRepo | null>(null);
  const ticks = useRef(0);

  const refresh = useCallback(async () => {
    try {
      setRepos(await getSessionRepos(sessionId));
    } catch {
      /* keep the last known state */
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getSessionRepos(sessionId);
        if (!cancelled) setRepos(list);
      } catch {
        if (!cancelled) {
          setRepos([]);
          showToast("error", "Couldn't load this session's repos.");
        }
      }
      try {
        const g = await getGithubRepos();            // first: it prunes uninstalled apps server-side
        const i = await getGithubInstallations();
        if (!cancelled) { setGranted(g); setConnected(i.length > 0); }
      } catch {
        /* GitHub unreachable: the attach list stays empty */
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Poll while anything is still importing or indexing, for at most ~2 minutes.
  useEffect(() => {
    if (!repos) return;
    const busy = repos.some(
      (r) => r.status === "pending" || r.status === "syncing" || (r.status === "ready" && !r.indexed),
    );
    if (!busy) { ticks.current = 0; return; }
    if (ticks.current >= 40) return;
    const t = setTimeout(() => { ticks.current += 1; refresh(); }, 3000);
    return () => clearTimeout(t);
  }, [repos, refresh]);

  async function attach(r: GithubRepo, confirmPrivate = false) {
    if (r.private && !confirmPrivate) { setConfirm(r); return; }
    setAttaching(r.full_name);
    try {
      await attachRepo(sessionId, {
        installation_id: r.installation_id,
        full_name: r.full_name,
        confirm_private: confirmPrivate,
      });
      ticks.current = 0;
      setConfirm(null);
      await refresh();
    } catch (e) {
      if (e instanceof ConfirmPrivateError) setConfirm(r);
      else showToast("error", e instanceof Error ? e.message : "Couldn't attach that repo.");
    } finally {
      setAttaching(null);
    }
  }

  async function remove(r: SessionRepo) {
    if (!window.confirm(`Remove ${r.name} from this session? Its imported code and index will be deleted.`)) return;
    try {
      await removeRepo(sessionId, r.id);
      await refresh();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Couldn't remove the repo.");
    }
  }

  const attachable = granted.filter(
    (g) => !(repos ?? []).some((r) => r.name.toLowerCase() === g.full_name.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-stone-950/45 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="repo-panel-title"
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-stone-800 shadow-2xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      >
        <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-700">
          <h2 id="repo-panel-title" className="text-base font-semibold">Code in this session</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="no-inset cursor-pointer rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto px-5 py-5">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Attached</h3>
            {repos === null ? (
              <p className="text-sm text-stone-500">Loading…</p>
            ) : repos.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No repo attached yet. Attach one so Talon can read and search your code.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-700">
                {repos.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className={`text-xs ${r.status === "failed" ? "text-rose-600" : "text-stone-500 dark:text-stone-400"}`}>
                        {describe(r)}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(r)}
                      aria-label={`Remove ${r.name}`}
                      className="no-inset cursor-pointer rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-rose-600 dark:hover:bg-stone-800"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Attach a repo</h3>
            {!connected ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Connect GitHub first: Settings → Connectors.
              </p>
            ) : attachable.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No other repos available. Grant more in Settings → Connectors.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-700">
                {attachable.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      {g.private ? <Lock size={14} className="shrink-0 text-stone-400" />
                                 : <Globe size={14} className="shrink-0 text-stone-400" />}
                      <span className="truncate">{g.full_name}</span>
                    </span>
                    <button
                      onClick={() => attach(g)}
                      disabled={attaching !== null}
                      className="no-inset cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      {attaching === g.full_name ? "Attaching…" : "Attach"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {confirm && (
            <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <p>
                <strong>{confirm.full_name}</strong> is private. Everyone in this session will be able to
                see its code through Talon. Attach it anyway?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm(null)}
                  className="no-inset cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  Cancel
                </button>
                <button
                  onClick={() => attach(confirm, true)}
                  className="new-session-button cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  Attach private repo
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}