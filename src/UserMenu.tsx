import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Settings,
  LogOut,
  Globe,
  HelpCircle,
  Shield,
  Grid3x3,
} from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  standard: "Standard",
  pro: "Pro",
};

export default function UserMenu({
  displayName,
  plan,
  onLogout,
}: {
  displayName: string;
  plan: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const items = [
    { icon: Settings, label: "Settings", onClick: () => {} },
    { icon: Globe, label: "Language", onClick: () => {} },
    { icon: HelpCircle, label: "Get help", onClick: () => {} },
    { icon: Shield, label: "Privacy policy", onClick: () => {} },
    { icon: Grid3x3, label: "Get apps & extensions", onClick: () => {} },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <div className="text-left">
          <p className="text-sm font-medium text-stone-700 leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-stone-400 leading-tight">
            {PLAN_LABELS[plan] ?? plan}
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <ChevronDown size={14} className="text-stone-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-50 origin-bottom-left"
          >
            {items.map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                onClick={() => {
                  onClick();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <Icon size={15} className="text-stone-400" />
                {label}
              </button>
            ))}
            <div className="h-px bg-stone-100 my-1" />
            <button
              onClick={() => {
                onLogout();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut size={15} />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}