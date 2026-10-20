import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Settings,
  LogOut,
  HelpCircle,
  Grid3x3,
  CreditCard,
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
  onBilling,
  onSettings,
  settingsFocusRef,
}: {
  displayName: string;
  plan: string;
  onLogout: () => void;
  onBilling: () => void;
  onSettings: () => void;
  settingsFocusRef: MutableRefObject<(() => void) | null>;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsItemRef = useRef<HTMLButtonElement>(null);

  const focusSettingsItem = useCallback(() => {
    setOpen(true);
    window.requestAnimationFrame(() => settingsItemRef.current?.focus());
  }, []);

  settingsFocusRef.current = focusSettingsItem;

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
    { icon: Settings, label: "Settings", onClick: onSettings },
    
    { icon: HelpCircle, label: "Get help", onClick: () => {} },
    { icon: Grid3x3, label: "Get apps & extensions", onClick: () => {} },
  ];

  return (
    <div className="menu-no-inset relative" ref={menuRef}>
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
            className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl border pt-2 pb-2 pl-1.5 pr-1.5 border-stone-200 shadow-lg py-1 z-50 origin-bottom-left"
          >
            <div>
              <p>{}</p>
            </div>
            {items.map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                ref={label === "Settings" ? settingsItemRef : undefined}
                onClick={() => {
                  onClick();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-base font-normal  text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer rounded-lg"
              >
                <Icon size={14} className="text-stone-600" />
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                onBilling();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-base font-normal text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer rounded-lg"
            >
              <CreditCard size={15} className="text-stone-600" />
              Upgrade Plan
            </button>
            <div className="h-px bg-stone-200 my-1" />
            <button
              onClick={() => {
                onLogout();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-base font-normal text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer rounded-lg"
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
