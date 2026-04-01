// Pin dot indicator — shows filled/empty dots for PIN input
interface PinDotsProps {
  length: number;      // total digits (4 or 6)
  filled: number;      // how many digits entered
  error?: boolean;     // shake animation on error
}

export function PinDots({ length, filled, error }: PinDotsProps) {
  return (
    <div
      className={[
        "flex items-center justify-center gap-3",
        error ? "animate-shake" : "",
      ].join(" ")}
    >
      {Array.from({ length }, (_, i) => (
        <div
          key={i}
          className={[
            "w-3.5 h-3.5 rounded-full transition-all duration-150",
            i < filled
              ? "bg-accent-500 dark:bg-accent-dark scale-110"
              : "bg-[#D8D6D2] dark:bg-[#3A3B38]",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
