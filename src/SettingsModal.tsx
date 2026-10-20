import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Brain, X, type LucideIcon } from "lucide-react";
import MemorySettings from "./MemorySettings";

type SettingsSectionConfig = {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  component: ComponentType;
};

const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: "memory",
    label: "Memory",
    icon: Brain,
    group: "Settings",
    component: MemorySettings,
  },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<string>(SETTINGS_SECTIONS[0]?.id ?? "");
  const [hasDirtyEdit, setHasDirtyEdit] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const ActiveComponent = SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.component;
  const groups = [...new Set(SETTINGS_SECTIONS.map((section) => section.group))];
  const closeWhenSafe = useCallback(() => {
    if (hasDirtyEdit && !window.confirm("Discard changes?")) return;
    onClose();
  }, [hasDirtyEdit, onClose]);
  const reportDirty = useCallback((dirty: boolean) => setHasDirtyEdit(dirty), []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWhenSafe();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeWhenSafe]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/45 p-0 md:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeWhenSafe();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        className="flex h-full w-full flex-col overflow-hidden border border-stone-200 bg-white text-stone-800 shadow-2xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 md:h-[80vh] md:max-w-5xl md:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-700 md:px-7">
          <h1 id="settings-title" className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Settings
          </h1>
          <button
            ref={closeButtonRef}
            onClick={closeWhenSafe}
            aria-label="Close settings"
            className="rounded-lg p-2 cursor-pointer text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 no-inset"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav
            aria-label="Settings sections"
            className="shrink-0 border-b border-stone-200 px-3 py-2 dark:border-stone-700 md:w-56 md:border-b-0 md:border-r md:px-4 md:py-5"
          >
            <div className="flex gap-1 overflow-x-auto md:block md:space-y-5">
              {groups.map((group) => {
                const sections = SETTINGS_SECTIONS.filter((section) => section.group === group);
                if (sections.length === 0) return null;
                return (
                  <div key={group} className="md:min-w-0">
                    <p className="hidden px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400 md:block dark:text-stone-500">
                      {group}
                    </p>
                    <div className="flex gap-1 md:block md:space-y-1">
                      {sections.map(({ id, label, icon: Icon }) => {
                        const active = activeSection === id;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              if (id === activeSection) return;
                              if (hasDirtyEdit && !window.confirm("Discard changes?")) return;
                              setActiveSection(id);
                            }}
                            aria-current={active ? "page" : undefined}
                            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors no-inset cursor-pointer md:w-full ${
                              active
                                ? "bg-stone-100 font-medium text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                                : "text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                            }`}
                          >
                            <Icon size={16} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-9 md:py-8">
            <h2 className="mb-6 text-xl font-semibold text-stone-900 dark:text-stone-100">
              {SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.label}
            </h2>
            {activeSection === "memory" ? <MemorySettings onDirtyChange={reportDirty} /> : ActiveComponent && <ActiveComponent />}
          </main>
        </div>
      </div>
    </div>
  );
}
