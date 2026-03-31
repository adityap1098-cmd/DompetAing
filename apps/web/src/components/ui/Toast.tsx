import { useState, useEffect } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
  action?: ToastAction;
  duration?: number;
}

let listeners: Array<(toast: ToastItem) => void> = [];
let nextId = 0;

export function showToast(
  message: string,
  type: "success" | "error" = "success",
  action?: ToastAction,
  duration = 2500
) {
  const toast: ToastItem = { id: ++nextId, message, type, action, duration };
  listeners.forEach((fn) => fn(toast));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (toast: ToastItem) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration ?? 2500);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "max-w-sm w-full px-4 py-3 rounded-xl text-sm font-medium shadow-lg flex items-center justify-between gap-3",
            t.action ? "pointer-events-auto" : "",
            t.type === "success"
              ? "bg-[#1A1917] dark:bg-[#F0EEE9] text-white dark:text-[#1A1917]"
              : "bg-[#C94A1C] dark:bg-[#E87340] text-white",
          ].join(" ")}
        >
          <span>{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                setToasts((prev) => prev.filter((x) => x.id !== t.id));
              }}
              className={[
                "text-xs font-bold shrink-0 underline underline-offset-2",
                t.type === "success"
                  ? "text-white/80 dark:text-[#1A1917]/80 hover:text-white dark:hover:text-[#1A1917]"
                  : "text-white/80 hover:text-white",
              ].join(" ")}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
