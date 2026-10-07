import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type ThemePreference } from "./useTheme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeMenu() {
  const { theme, setTheme } = useTheme();
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

  const CurrentIcon = OPTIONS.find((o) => o.value === theme)?.icon ?? Monitor;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
        title="Theme"
        aria-label={`Theme: ${theme}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <CurrentIcon size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-50 origin-bottom-right"
            role="menu"
          >
            {OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                role="menuitemradio"
                aria-checked={theme === value}
              >
                <Icon size={15} className="text-stone-400" />
                <span className="flex-1 text-left">{label}</span>
                {theme === value && <Check size={14} className="text-stone-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
