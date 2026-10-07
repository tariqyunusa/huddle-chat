import { useEffect, useState } from "react";
import { X as CloseIcon, Mail, Link2, Check } from "lucide-react";
import {
  createSessionInviteLink,
  inviteToSession,
  searchUsers,
  type UserSearchResult,
} from "./api";
import { useToast } from "./Toast";
import {NewTwitterIcon, SnapchatIcon, WhatsappIcon} from 'hugeicons-react'

type InviteModalProps = {
  sessionId: string;
  onClose: () => void;
};

export default function InviteModal({ sessionId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [creatingInviteLink, setCreatingInviteLink] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    let cancelled = false;
    setCreatingInviteLink(true);
    createSessionInviteLink(sessionId)
      .then(({ token }) => {
        if (cancelled) return;
        const url = new URL(window.location.pathname, window.location.origin);
        url.searchParams.set("invite", token);
        setInviteUrl(url.toString());
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          showToast(
            "error",
            error instanceof Error ? error.message : "Couldn't create an invite link",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCreatingInviteLink(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, showToast]);

  async function handleNameSearch(value: string) {
    setNameQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const matches = await searchUsers(value);
      setResults(matches);
    } catch {
      setResults([]);
    }
  }

  async function sendEmailInvite() {
    if (!email.trim()) return;
    setSending(true);
    try {
      await inviteToSession(sessionId, { email });
      showToast("success", `Invite sent to ${email}`);
      setEmail("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Couldn't send invite");
    } finally {
      setSending(false);
    }
  }

  async function sendUserInvite(user: UserSearchResult) {
    setSending(true);
    try {
      await inviteToSession(sessionId, { user_id: user.id });
      showToast("success", `Invite sent to ${user.display_name}`);
      setNameQuery("");
      setResults([]);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Couldn't send invite");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      showToast("success", "Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("error", "Couldn't copy the invite link");
    }
  }

  function shareViaWhatsApp() {
    if (!inviteUrl) return;
    const text = encodeURIComponent(`Join my Huddle session: ${inviteUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function shareViaX() {
    if (!inviteUrl) return;
    const text = encodeURIComponent(`Join my Huddle session: ${inviteUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }

  function shareViaSnapchat() {
    if (!inviteUrl) return;
    const url = encodeURIComponent(inviteUrl);
    window.open(`https://www.snapchat.com/scan?attachmentUrl=${url}`, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-600"
        >
          <CloseIcon size={18} />
        </button>

        <h2 className="text-lg font-semibold text-stone-800 mb-1">Invite to this session</h2>
        <p className="text-sm text-stone-500 mb-5">
          Invite by email, username, or share a link.
        </p>

        {/* Email — default/primary */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium text-stone-500 flex items-center gap-1.5">
            <Mail size={13} /> Email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="someone@example.com"
              autoFocus
              className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
            <button
              onClick={sendEmailInvite}
              disabled={sending || !email.trim()}
              className="bg-stone-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        </div>

        {/* Username search */}
        <div className="space-y-2 mb-5">
          <label className="text-xs font-medium text-stone-500">Or invite by username</label>
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => handleNameSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400"
          />
          {results.length > 0 && (
            <div className="border border-stone-100 rounded-lg overflow-hidden">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => sendUserInvite(u)}
                  disabled={sending}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 disabled:opacity-50"
                >
                  {u.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Share options */}
        <div className="border-t border-stone-100 pt-4">
          <p className="text-xs font-medium text-stone-500 mb-3">Or share a link</p>
          <div className="flex items-center gap-3">
            <button
              onClick={copyLink}
              disabled={!inviteUrl || creatingInviteLink}
              className="flex flex-col items-center gap-1 text-xs text-stone-600 cursor-pointer disabled:opacity-50"
            >
              <span className="w-10 h-10 rounded-full bg-stone-100 flex items-center cursor-pointer justify-center">
                {copied ? <Check size={16} /> : <Link2 size={16} />}
              </span>
              {creatingInviteLink ? "Preparing…" : "Copy link"}
            </button>
            <button
              onClick={shareViaWhatsApp}
              disabled={!inviteUrl || creatingInviteLink}
              className="flex flex-col items-center gap-1 text-xs text-stone-600 cursor-pointer disabled:opacity-50"
            >
              <span className="w-10 h-10 rounded-full bg-stone-100 flex items-center cursor-pointer justify-center">
                <WhatsappIcon size={16} />
              </span>
              WhatsApp
            </button>
            <button
              onClick={shareViaX}
              disabled={!inviteUrl || creatingInviteLink}
              className="flex flex-col items-center gap-1 text-xs text-stone-600 cursor-pointer disabled:opacity-50"
            >
              <span className="w-10 h-10 rounded-full bg-stone-100 flex items-center cursor-pointer justify-center font-semibold text-sm">
                <NewTwitterIcon size={16} />
              </span>
              X
            </button>
            <button
              onClick={shareViaSnapchat}
              disabled={!inviteUrl || creatingInviteLink}
              className="flex flex-col items-center gap-1 cursor-pointer text-xs text-stone-600 disabled:opacity-50"
            >
              <span className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                <SnapchatIcon size={16} />
              </span>
              Snapchat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
