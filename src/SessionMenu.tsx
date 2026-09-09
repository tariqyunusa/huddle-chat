import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { renameSession, deleteSession } from "./api";
import { useToast } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";

type SessionMenuProps = {
  sessionId: string;
  currentTitle: string;
  onRenamed: (sessionId: string, title: string) => void;
  onDeleted: (sessionId: string) => void;
};

export default function SessionMenu({
  sessionId,
  currentTitle,
  onRenamed,
  onDeleted,
}: SessionMenuProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const showToast = useToast();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setRenaming(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 144 }); // 144px = menu width (w-36)
    }
    setOpen((prev) => !prev);
  }

  async function handleRename() {
    if (!newTitle.trim() || newTitle === currentTitle) {
      setRenaming(false);
      return;
    }
    try {
      await renameSession(sessionId, newTitle.trim());
      onRenamed(sessionId, newTitle.trim());
      showToast("success", "Session renamed");
    } catch {
      showToast("error", "Couldn't rename session");
    } finally {
      setRenaming(false);
      setOpen(false);
    }
  }

  function handleDeleteClick() {
    setOpen(false);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    setConfirmOpen(false);
    try {
      await deleteSession(sessionId);
      onDeleted(sessionId);
      showToast("success", "Session deleted");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Couldn't delete session",
      );
    }
  }

  if (renaming) {
    return (
      <input
        autoFocus
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleRename()}
        onBlur={handleRename}
        className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-sm outline-none"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200 transition-opacity"
      >
        <MoreHorizontal size={14} />
      </button>

      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
            className="w-36 bg-white border border-stone-200 rounded-lg shadow-lg py-1 z-9999"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenaming(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
            >
              <Pencil size={13} /> Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>,
          document.body,
        )}

      {confirmOpen &&
        createPortal(
          <ConfirmDialog
            title="Delete session"
            message="This can't be undone. All messages in this session will be permanently deleted."
            confirmLabel="Delete"
            danger
            onConfirm={confirmDelete}
            onCancel={() => setConfirmOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}
