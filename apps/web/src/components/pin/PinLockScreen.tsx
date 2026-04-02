// Redesigned Lock Screen — full screen overlay with custom numpad
// Shows when app opens and PIN is set
import { useState, useCallback, useEffect, useRef } from "react";
import { PinDots } from "./PinDots";
import { PinNumpad } from "./PinNumpad";
import { useSecurityAction } from "@/hooks/useSettings";

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

interface PinLockScreenProps {
  onUnlock: () => void;
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { mutate, isPending } = useSecurityAction();

  const isLockedOut = lockoutRemaining > 0;

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining > 0) {
      lockoutTimer.current = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            if (lockoutTimer.current) clearInterval(lockoutTimer.current);
            setAttempts(0);
            setError("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (lockoutTimer.current) clearInterval(lockoutTimer.current);
    };
  }, [lockoutRemaining]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  // Auto-verify when PIN is complete
  const verifyPin = useCallback((fullPin: string) => {
    if (isPending || isLockedOut) return;

    mutate(
      { action: "verify_pin", pin: fullPin },
      {
        onSuccess: () => {
          onUnlock();
        },
        onError: () => {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setPin("");
          triggerShake();

          if (newAttempts >= MAX_ATTEMPTS) {
            setError(`Terlalu banyak percobaan`);
            setLockoutRemaining(LOCKOUT_SECONDS);
          } else {
            setError(`PIN salah (${MAX_ATTEMPTS - newAttempts} percobaan lagi)`);
          }
        },
      }
    );
  }, [isPending, isLockedOut, mutate, attempts, onUnlock, triggerShake]);

  const handleDigit = useCallback((digit: string) => {
    if (isLockedOut || isPending) return;
    setError("");
    if (pin.length < PIN_LENGTH) {
      const next = pin + digit;
      setPin(next);
      // Auto-submit when complete
      if (next.length === PIN_LENGTH) {
        // Small delay so the last dot fills visually before API call
        setTimeout(() => verifyPin(next), 150);
      }
    }
  }, [pin, isLockedOut, isPending, verifyPin]);

  const handleDelete = useCallback(() => {
    if (isLockedOut) return;
    setError("");
    setPin((p) => p.slice(0, -1));
  }, [isLockedOut]);

  const handleForgotPin = useCallback(() => {
    // Redirect to login for re-authentication
    window.location.href = "/login";
  }, []);

  // Format lockout countdown
  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s} detik`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-[#111210] select-none">

      {/* Top section — logo & text */}
      <div className="flex-1 flex flex-col items-center justify-end pb-6 pt-12">
        {/* Logo */}
        <div className="w-16 h-16 rounded-[18px] bg-white/10 flex items-center justify-center mb-5">
          <span className="text-3xl">💰</span>
        </div>

        {/* App name */}
        <h1 className="text-[18px] font-extrabold text-white mb-1.5 tracking-tight">
          DompetAing
        </h1>

        {/* Status text */}
        <p className="text-[13px] text-white/60 mb-8">
          {isLockedOut ? "Akun terkunci sementara" : "Masukkan PIN"}
        </p>

        {/* PIN dots */}
        <PinDots length={PIN_LENGTH} filled={pin.length} error={shaking} />

        {/* Error / lockout message */}
        <div className="h-10 flex flex-col items-center justify-center mt-3">
          {isLockedOut ? (
            <>
              <p className="text-[12px] font-semibold text-[#E87340]">
                Terlalu banyak percobaan
              </p>
              <p className="text-[12px] text-white/50 mt-0.5">
                Coba lagi dalam{" "}
                <span className="font-mono font-bold text-white/80">
                  {formatCountdown(lockoutRemaining)}
                </span>
              </p>
            </>
          ) : error ? (
            <p className="text-[12px] font-semibold text-[#E87340]">
              {error}
            </p>
          ) : isPending ? (
            <div className="flex items-center gap-2">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full" />
              <p className="text-[12px] text-white/50">Memeriksa...</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom section — numpad + forgot PIN */}
      <div className="pb-8 pt-2">
        <div className={isLockedOut ? "opacity-30 pointer-events-none" : ""}>
          <PinNumpad
            onDigit={handleDigit}
            onDelete={handleDelete}
            variant="dark"
          />
        </div>

        {/* Forgot PIN link */}
        <button
          type="button"
          onClick={handleForgotPin}
          className="mt-6 w-full text-center text-[12px] font-medium text-white/40 hover:text-white/60 transition-colors"
        >
          Lupa PIN? <span className="underline">Masuk ulang dengan Google</span>
        </button>
      </div>
    </div>
  );
}
