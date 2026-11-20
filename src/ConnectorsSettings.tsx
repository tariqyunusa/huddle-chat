import { useEffect, useState } from "react";
import {
  Activity, Check, Clock3, Code2, ExternalLink, FileText, Globe, HardDrive,
  Layers3, Lock, MessageSquare, Search, Kanban,
} from "lucide-react";
import { useToast } from "./Toast";
import {
  getGithubInstallations, getGithubInstallUrl, getGithubRepos,
  type GithubInstallation, type GithubRepo,
} from "./api";

type Connector = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: typeof Code2;
  iconClass: string;
  availability: "available" | "coming-soon";
};

const CONNECTORS: Connector[] = [
  { id: "github", name: "GitHub", description: "Bring repositories and code into your conversations.", category: "Development", icon: Code2, iconClass: "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900", availability: "available" },
  { id: "google-drive", name: "Google Drive", description: "Find and discuss your documents, spreadsheets, and files.", category: "Files & content", icon: HardDrive, iconClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", availability: "coming-soon" },
  { id: "slack", name: "Slack", description: "Bring team conversations and shared context into Huddle.", category: "Communication", icon: MessageSquare, iconClass: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300", availability: "coming-soon" },
  { id: "notion", name: "Notion", description: "Connect notes, docs, and knowledge your team has collected.", category: "Files & content", icon: FileText, iconClass: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100", availability: "coming-soon" },
  { id: "linear", name: "Linear", description: "Give Huddle context from projects, issues, and roadmaps.", category: "Development", icon: Layers3, iconClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300", availability: "coming-soon" },
  { id: "jira", name: "Jira", description: "Explore project work and issue details alongside your team.", category: "Development", icon: Kanban, iconClass: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300", availability: "coming-soon" },
  { id: "atlassian", name: "Atlassian Confluence", description: "Make team documentation easier to find and discuss.", category: "Files & content", icon: Activity, iconClass: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300", availability: "coming-soon" },
];

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
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
    try { window.location.href = await getGithubInstallUrl(); }
    catch { showToast("error", "Couldn't start the GitHub connection."); setBusy(false); }
  }

  const connectButton = (label: string) => (
    <button onClick={connect} disabled={busy} className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white">
      {busy ? "Opening GitHub…" : label}
    </button>
  );

  const filtered = CONNECTORS.filter((item) =>
    `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const categories = [...new Set(filtered.map((item) => item.category))];

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500 dark:text-stone-400">Bring the tools your team uses into Huddle.</p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Connect a service to give conversations useful context.</p>
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-stone-200 px-3 text-stone-400 focus-within:border-stone-400 sm:max-w-64 dark:border-stone-700">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a connector" aria-label="Find a connector" className="min-w-0 flex-1 border-0 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400 dark:text-stone-100" />
        </label>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 px-5 py-10 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">No connectors match “{query}”. Try another search.</p>
      ) : categories.map((category) => (
        <section key={category} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">{category}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.filter((item) => item.category === category).map((item) => {
              const Icon = item.icon;
              const connected = item.id === "github" && installs !== null && installs.length > 0;
              const loading = item.id === "github" && installs === null;
              return (
                <article key={item.id} className="flex min-h-48 flex-col rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}><Icon size={19} strokeWidth={1.8} /></div>
                    {connected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Check size={12} /> Connected</span>
                    ) : item.availability === "coming-soon" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400"><Clock3 size={12} /> Coming soon</span>
                    ) : null}
                  </div>
                  <h4 className="mt-4 text-sm font-semibold text-stone-900 dark:text-stone-100">{item.name}</h4>
                  <p className="mt-1 flex-1 text-xs leading-5 text-stone-500 dark:text-stone-400">{item.description}</p>
                  {item.id === "github" ? (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      {loading ? <span className="text-xs text-stone-400">Checking connection…</span> : connected ? <span className="text-xs text-stone-500 dark:text-stone-400">{installs?.length ?? 0} {installs?.length === 1 ? "account" : "accounts"} · {repos.length} repos</span> : <span className="text-xs text-stone-500 dark:text-stone-400">Not connected</span>}
                      {!loading && connectButton(connected ? "Manage" : "Connect")}
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500"><Clock3 size={13} /> On our roadmap</div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {installs && installs.length > 0 && (
        <section className="space-y-4 border-t border-stone-200 pt-6 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">GitHub access</h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Choose which repositories Huddle can use. Access is read-only.</p>
          </div>
          <div className="space-y-2">
            {installs.map((installation) => (
              <div key={installation.installation_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-800">
                <div><p className="text-sm font-medium text-stone-800 dark:text-stone-100">{installation.account}</p><p className="text-xs text-stone-500 dark:text-stone-400">GitHub account</p></div>
                <a href={manageUrl(installation)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Manage on GitHub <ExternalLink size={12} /></a>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-800">
            <div><p className="text-sm font-medium text-stone-800 dark:text-stone-100">Accessible repositories</p><p className="text-xs text-stone-500 dark:text-stone-400">{repos.length} repositories · {repos.filter((repo) => repo.private).length} private</p></div>
            {connectButton("Add or change repos")}
          </div>
          {repos.length > 0 && <ul className="grid gap-2 sm:grid-cols-2">{repos.map((repo) => <li key={repo.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">{repo.private ? <Lock size={13} className="shrink-0 text-stone-400" /> : <Globe size={13} className="shrink-0 text-stone-400" />}<span className="truncate">{repo.full_name}</span></li>)}</ul>}
          <p className="text-xs text-stone-400 dark:text-stone-500">To attach a repository to a chat, use the repos button in that chat’s header.</p>
        </section>
      )}
    </div>
  );
}
