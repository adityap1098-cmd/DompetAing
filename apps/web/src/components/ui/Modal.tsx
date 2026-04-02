import type { ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop — rgba(0,0,0,0.45) */}
      <div
        className={[
          "fixed inset-0 z-40 bg-[rgba(0,0,0,0.45)] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet — rounded-20px top, slide up */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={[
          "fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto max-h-[90dvh] flex flex-col",
          "bg-white dark:bg-[#1C1D1A] shadow-[0_-8px_32px_rgba(0,0,0,0.15)]",
          "rounded-t-[20px]",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        {/* Handle bar — 36px wide, 3px high, centered */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-[rgba(0,0,0,0.08)] dark:bg-[rgba(255,255,255,0.1)]" />
        </div>

        {/* Header — title left + X right, px-[18px] py-3 */}
        <div className="flex items-center justify-between px-[18px] py-3 border-b border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.07)] shrink-0">
          <h2
            id="modal-title"
            className="text-[15px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9]"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[8px] bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96] hover:opacity-80 transition-opacity text-sm"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Content — scroll area */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {isOpen ? children : null}
        </div>
      </div>
    </>
  );
}
