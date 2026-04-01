// Redesigned PIN Setting Modal — bottom sheet with dot indicators + custom numpad
// Matches TransactionForm modal style (Modal component)
import { useState, useCallback, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { PinDots } from "./PinDots";
import { PinNumpad } from "./PinNumpad";
import { useSecurityAction } from "@/hooks/useSettings";
import { showToast } from "@/components/ui/Toast";

const PIN_LENGTH = 4;

type Step = "current" | "new" | "confirm";

interface PinModalProps {
  pinSet: boolean;
  onClose: () => void;
}

export function PinModal({ pinSet, onClose }: PinModalProps) {
  const [mode, setMode] = useState<"set" | "remove">(pinSet ? "remove" : "set");

  // Steps: if pinSet → current → new → confirm; else new → confirm
  // For remove: just current
  const [step, setStep] = useState<Step>(pinSet && mode === "set" ? "current" : mode === "remove" ? "current" : "new");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const { mutateAsync, isPending } = useSecurityAction();

  // Reset state when mode changes
  useEffect(() => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    setShaking(false);
    if (mode === "set") {
      setStep(pinSet ? "current" : "new");
    } else {
      setStep("current");
    }
  }, [mode, pinSet]);

  // Current active pin value depending on step
  const activePin = step === "current" ? currentPin : step === "new" ? newPin : confirmPin;

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const handleDigit = useCallback((digit: string) => {
    setError("");
    if (step === "current" && currentPin.length < PIN_LENGTH) {
      const next = currentPin + digit;
      setCurrentPin(next);
      // Auto-advance when complete (for remove mode or set mode current step)
      if (next.length === PIN_LENGTH && mode === "remove") {
        // Will be submitted via confirm button
      }
    } else if (step === "new" && newPin.length < PIN_LENGTH) {
      setNewPin(newPin + digit);
    } else if (step === "confirm" && confirmPin.length < PIN_LENGTH) {
      setConfirmPin(confirmPin + digit);
    }
  }, [step, currentPin, newPin, confirmPin, mode]);

  const handleDelete = useCallback(() => {
    setError("");
    if (step === "current") setCurrentPin((p) => p.slice(0, -1));
    else if (step === "new") setNewPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  }, [step]);

  const handleConfirm = useCallback(async () => {
    if (isPending) return;

    if (mode === "remove") {
      if (currentPin.length < PIN_LENGTH) return;
      try {
        await mutateAsync({ action: "remove_pin", current_pin: currentPin });
        showToast("PIN berhasil dihapus", "success");
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "PIN salah";
        setError(msg);
        triggerShake();
        setCurrentPin("");
      }
      return;
    }

    // Set/Change mode
    if (step === "current") {
      if (currentPin.length < PIN_LENGTH) return;
      // Verify current PIN first by attempting set with it
      setStep("new");
    } else if (step === "new") {
      if (newPin.length < PIN_LENGTH) return;
      setStep("confirm");
    } else if (step === "confirm") {
      if (confirmPin.length < PIN_LENGTH) return;
      if (newPin !== confirmPin) {
        setError("PIN tidak cocok");
        triggerShake();
        setConfirmPin("");
        return;
      }
      try {
        await mutateAsync({
          action: "set_pin",
          pin: newPin,
          ...(pinSet && currentPin ? { current_pin: currentPin } : {}),
        });
        showToast("PIN berhasil " + (pinSet ? "diubah" : "dipasang"), "success");
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menyimpan PIN";
        setError(msg);
        triggerShake();
        // If error is about current PIN, go back to current step
        if (pinSet && msg.toLowerCase().includes("pin")) {
          setStep("current");
          setCurrentPin("");
          setNewPin("");
          setConfirmPin("");
        }
      }
    }
  }, [mode, step, currentPin, newPin, confirmPin, isPending, mutateAsync, pinSet, onClose, triggerShake]);

  // Step labels
  const stepTitle = (() => {
    if (mode === "remove") return "Hapus PIN";
    if (step === "current") return "PIN Saat Ini";
    if (step === "new") return pinSet ? "PIN Baru" : "Buat PIN";
    return "Konfirmasi PIN";
  })();

  const stepSubtitle = (() => {
    if (mode === "remove") return "Masukkan PIN untuk menghapus";
    if (step === "current") return "Masukkan PIN saat ini";
    if (step === "new") return "Masukkan PIN baru";
    return "Masukkan ulang PIN baru";
  })();

  // Step indicator
  const totalSteps = mode === "remove" ? 1 : pinSet ? 3 : 2;
  const currentStepNum = mode === "remove" ? 1 : step === "current" ? 1 : step === "new" ? (pinSet ? 2 : 1) : (pinSet ? 3 : 2);

  return (
    <Modal isOpen title={stepTitle} onClose={onClose}>
      <div className="flex flex-col items-center px-[17px] pt-3 pb-4">

        {/* Mode tabs (only shown when PIN is already set) */}
        {pinSet && (
          <div className="flex w-full rounded-[10px] overflow-hidden bg-[#F0EEE9] dark:bg-[#242522] border border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.07)] mb-5">
            <button
              type="button"
              onClick={() => setMode("set")}
              className={[
                "flex-1 py-2 text-[11px] font-bold transition-all duration-150",
                mode === "set"
                  ? "bg-accent-500 dark:bg-accent-dark text-white rounded-[8px] mx-0.5 my-0.5"
                  : "text-[#9E9B98] dark:text-[#4A4948]",
              ].join(" ")}
            >
              Ubah PIN
            </button>
            <button
              type="button"
              onClick={() => setMode("remove")}
              className={[
                "flex-1 py-2 text-[11px] font-bold transition-all duration-150",
                mode === "remove"
                  ? "bg-[#C94A1C] dark:bg-[#E87340] text-white rounded-[8px] mx-0.5 my-0.5"
                  : "text-[#9E9B98] dark:text-[#4A4948]",
              ].join(" ")}
            >
              Hapus PIN
            </button>
          </div>
        )}

        {/* Step indicator dots */}
        {totalSteps > 1 && (
          <div className="flex items-center gap-1.5 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={[
                  "h-1 rounded-full transition-all duration-200",
                  i + 1 === currentStepNum
                    ? "w-5 bg-accent-500 dark:bg-accent-dark"
                    : i + 1 < currentStepNum
                      ? "w-1.5 bg-accent-500/40 dark:bg-accent-dark/40"
                      : "w-1.5 bg-[#D8D6D2] dark:bg-[#3A3B38]",
                ].join(" ")}
              />
            ))}
          </div>
        )}

        {/* Subtitle */}
        <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96] mb-6">
          {stepSubtitle}
        </p>

        {/* PIN dots */}
        <div className="mb-3">
          <PinDots length={PIN_LENGTH} filled={activePin.length} error={shaking} />
        </div>

        {/* Error message */}
        <div className="h-5 flex items-center justify-center mb-4">
          {error && (
            <p className="text-[11px] font-semibold text-[#C94A1C] dark:text-[#E87340]">
              {error}
            </p>
          )}
        </div>

        {/* Numpad */}
        <PinNumpad
          onDigit={handleDigit}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
          confirmDisabled={activePin.length < PIN_LENGTH || isPending}
          variant="light"
        />

        {/* Footer */}
        <div className="w-full mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-[12px] font-semibold text-[#6B6864] dark:text-[#9E9B96] hover:text-[#1A1917] dark:hover:text-[#F0EEE9] transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </Modal>
  );
}
