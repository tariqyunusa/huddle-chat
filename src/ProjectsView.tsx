import { useEffect, useState } from "react";
import { ArrowLeft, FolderKanban, Plus, Trash2 } from "lucide-react";
import {
  createProject,
  deleteProject,
  fetchProject,
  fetchProjects,
  updateProject,
  type ProjectDetail,
  type ProjectSummary,
} from "./api";
import ConfirmDialog from "./ConfirmDialog";

type ProjectsViewProps = {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onOpenSession: (sessionId: string) => void;
  onCreateSession: (projectId: string) => Promise<void>;
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently updated"
    : `Updated ${date.toLocaleDateString()}`;
}

export default function ProjectsView({
  selectedProjectId,
  onSelectProject,
  onOpenSession,
  onCreateSession,
}: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      setProjects(await fetchProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      return;
    }
    let current = true;
    setLoading(true);
    setError("");
    fetchProject(selectedProjectId)
      .then((loaded) => {
        if (current) {
          setProject(loaded);
          setName(loaded.name);
          setDescription(loaded.description ?? "");
        }
      })
      .catch((err: unknown) => {
        if (current) setError(err instanceof Error ? err.message : "Couldn't load project");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, [selectedProjectId]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 100) {
      setError("Project name must be between 1 and 100 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await createProject({ name: cleanName, description: description.trim() || null });
      setProjects((current) => [created, ...current]);
      setDialogOpen(false);
      setName("");
      setDescription("");
      onSelectProject(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create project");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!project) return;
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 100) {
      setError("Project name must be between 1 and 100 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateProject(project.id, {
        name: cleanName,
        description: description.trim() || null,
      });
      setProject((current) => current ? { ...current, ...updated } : current);
      setProjects((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update project");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    setSaving(true);
    setError("");
    try {
      await deleteProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setDeleteOpen(false);
      onSelectProject(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete project");
      setDeleteOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleNewSession() {
    if (!project) return;
    setCreatingSession(true);
    setError("");
    try {
      await onCreateSession(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create session");
    } finally {
      setCreatingSession(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      {selectedProjectId ? (
        <>
          <button type="button" onClick={() => onSelectProject(null)} className="mb-6 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800">
            <ArrowLeft size={16} /> All projects
          </button>
          {loading ? <p className="py-12 text-center text-sm text-stone-500">Loading project…</p> : project ? (
            <>
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="mb-4 text-2xl font-semibold text-stone-800">Project details</h1>
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="project-name">Name</label>
                  <input id="project-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} className="mb-4 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400" />
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="project-description">Description</label>
                  <textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400" />
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>
                    <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"><Trash2 size={15} /> Delete</button>
                  </div>
                </div>
                <button type="button" onClick={handleNewSession} disabled={creatingSession} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50">
                  <Plus size={16} /> {creatingSession ? "Creating…" : "New session in this project"}
                </button>
              </div>
              <div className="border-t border-stone-200 pt-6">
                <h2 className="mb-3 text-lg font-semibold text-stone-800">Sessions</h2>
                {project.sessions.length === 0 ? <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">No sessions in this project yet.</p> : (
                  <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200">
                    {project.sessions.map((session) => <li key={session.id}><button type="button" onClick={() => onOpenSession(session.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50"><span className="truncate text-sm font-medium text-stone-700">{session.title || "Untitled session"}</span><span className="shrink-0 text-xs text-stone-400">{new Date(session.created_at).toLocaleDateString()}</span></button></li>)}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div><h1 className="text-2xl font-semibold text-stone-800">Projects</h1><p className="mt-1 text-sm text-stone-500">Keep related Huddle sessions together.</p></div>
            <button type="button" onClick={() => { setError(""); setName(""); setDescription(""); setDialogOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-900"><Plus size={16} /> Create project</button>
          </div>
          {loading ? <p className="py-12 text-center text-sm text-stone-500">Loading projects…</p> : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 px-5 py-14 text-center"><FolderKanban className="mx-auto mb-3 text-stone-400" size={28} /><p className="mb-1 font-medium text-stone-700">No projects yet</p><p className="mb-5 text-sm text-stone-500">Create a project to group related sessions.</p><button type="button" onClick={() => setDialogOpen(true)} className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900">Create project</button></div>
          ) : <div className="grid gap-3 sm:grid-cols-2">{projects.map((item) => <button key={item.id} type="button" onClick={() => onSelectProject(item.id)} className="rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"><span className="block truncate font-medium text-stone-800">{item.name}</span><span className="mt-1 block min-h-5 truncate text-sm text-stone-500">{item.description || "No description"}</span><span className="mt-4 flex justify-between text-xs text-stone-400"><span>{item.session_count} {item.session_count === 1 ? "session" : "sessions"}</span><span>{dateLabel(item.updated_at)}</span></span></button>)}</div>}
        </>
      )}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={handleCreate} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 className="mb-4 text-lg font-semibold text-stone-800">Create project</h2><label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="new-project-name">Name</label><input id="new-project-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} autoFocus className="mb-4 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400" /><label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="new-project-description">Description</label><textarea id="new-project-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400" />{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDialogOpen(false)} className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50">{saving ? "Creating…" : "Create project"}</button></div></form></div>}
      {deleteOpen && <ConfirmDialog title="Delete this project?" message="The project will be deleted, but its sessions will be kept as standalone sessions." confirmLabel={saving ? "Deleting…" : "Delete project"} danger onConfirm={() => void handleDelete()} onCancel={() => setDeleteOpen(false)} />}
    </section>
  );
}
