import { useEffect, useState } from "react";
import { ExternalLink, Globe, Lock } from "lucide-react";
import { useToast } from "./Toast";
import {
  getGithubInstallations, getGithubInstallUrl, getGithubRepos,
  type GithubInstallation, type GithubRepo,
} from "./api";

function manageUrl(i: GithubInstallation) {
  return i.account_type === "Organization"
    ? `https://github.com/organizations/${i.account}/settings/installations/${i.installation_id}`
    : `https://github.com/settings/installations/${i.installation_id}`;
}

export default function ConnectorsSettings() {
  const showToast = useToast();
  const [installs, setInstalls] = useState<GithubInstallation[] | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // repos first: it prunes uninstalled apps server-side, then installations reflects that
        const r = await getGithubRepos();
        const i = await getGithubInstallations();
        if (!cancelled) { setRepos(r); setInstalls(i); }
      } catch {
        if (!cancelled) { setInstalls([]); showToast("error", "Couldn't load your GitHub connection."); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function connect() {
    setBusy(true);
    try {
      window.location.href = await getGithubInstallUrl();
    } catch {
      showToast("error", "Couldn't start the GitHub connection.");
      setBusy(false);
    }
  }

  if (installs === null) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>;
  }

  const connectBtn = (label: string) => (
    <button
      onClick={connect}
      disabled={busy}
      className="new-session-button cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
    >
      {busy ? "Opening GitHub…" : label}
    </button>
  );

  if (installs.length === 0) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Connect GitHub so Talon can read your code. You choose exactly which repos Huddle can
          access, and it only gets read-only access.
        </p>
        {connectBtn("Connect GitHub")}
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Connected accounts</h3>
        {installs.map((i) => (
          <div key={i.installation_id}
            className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-700">
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{i.account}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {i.selection === "all" ? "All repositories" : "Selected repositories"}
              </p>
            </div>
            <a href={manageUrl(i)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100">
              Manage on GitHub <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Repositories Huddle can access ({repos.length})
        </h3>
        {repos.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No repositories granted yet. Use "Add or change repos" to pick some.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-700">
            {repos.map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-200">
                {r.private ? <Lock size={14} className="shrink-0 text-stone-400" />
                           : <Globe size={14} className="shrink-0 text-stone-400" />}
                <span className="truncate">{r.full_name}</span>
              </li>
            ))}
          </ul>
        )}
        {connectBtn("Add or change repos")}
        <p className="text-xs text-stone-500 dark:text-stone-400">
          To attach a repo to a chat, open that chat and use the repos button in its header.
        </p>
      </section>
    </div>
  );
}