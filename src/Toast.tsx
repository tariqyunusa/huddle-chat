import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Alert02Icon,
  InformationCircleIcon,
  Cancel01Icon as CloseIcon,
} from "hugeicons-react";

type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastType, { icon: React.ElementType; bg: string; iconColor: string }> = {
  success: { icon: CheckmarkCircle02Icon, bg: "bg-emerald-50 border-emerald-200", iconColor: "text-emerald-600" },
  error: { icon: Cancel01Icon, bg: "bg-rose-50 border-rose-200", iconColor: "text-rose-600" },
  warning: { icon: Alert02Icon, bg: "bg-amber-50 border-amber-200", iconColor: "text-amber-600" },
  info: { icon: InformationCircleIcon, bg: "bg-stone-50 border-stone-200", iconColor: "text-stone-600" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((toast) => {
          const variant = VARIANT_STYLES[toast.type];
          const Icon = variant.icon;
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-2.5 border rounded-xl px-4 py-3 shadow-sm ${variant.bg}`}
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${variant.iconColor}`} />
              <p className="text-sm text-stone-800 flex-1">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-stone-400 hover:text-stone-600 shrink-0"
              >
                <CloseIcon size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx.showToast;
}