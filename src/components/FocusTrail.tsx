import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type FocusTrailProps = Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

const trailClasses = [
  "text-[10px] opacity-10 blur-[2px]",
  "text-[10px] opacity-10 blur-[2px]",
  "text-xs opacity-30 blur-[1px]",
  "text-sm opacity-50",
  "text-[15px] opacity-70",
  "text-base opacity-90",
];

export const FocusTrail = forwardRef<HTMLInputElement, FocusTrailProps>(function FocusTrail(
  { value, onChange, className, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const words = value.split(" ");
  const currentWord = words.pop() ?? "";
  const previousWords = words.slice(-6).filter(Boolean);
  const totalPrevious = previousWords.length;

  return (
    <div
      className={cn(
        "focus-trail relative flex h-16 min-w-0 flex-1 items-center justify-end overflow-hidden rounded-2xl border px-4 transition-all duration-300",
        focused ? "border-primary ring-2 ring-primary/20" : "border-input",
        className,
      )}
      style={{
        background: "var(--background)",
        boxShadow: "var(--inset-shadow)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 45%, black 100%)",
        maskImage: "linear-gradient(to right, transparent 0%, black 45%, black 100%)",
      }}
    >
      <input
        {...props}
        ref={ref}
        type="text"
        value={value}
        autoComplete="off"
        spellCheck={false}
        aria-label={props["aria-label"] ?? "Digite o que você lembra"}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 outline-none"
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />

      <div className="pointer-events-none flex min-w-0 items-center justify-end overflow-hidden whitespace-nowrap">
        <div className="mr-4 flex min-w-0 items-center gap-3 overflow-hidden">
          {previousWords.map((word, index) => {
            const distance = totalPrevious - 1 - index;
            const trailClass = trailClasses[Math.min(distance, trailClasses.length - 1)];
            return (
              <span
                key={`${word}-${index}`}
                className={cn("shrink-0 font-medium text-navy transition-all duration-300", trailClass)}
              >
                {word}
              </span>
            );
          })}
        </div>

        {value && (
          <div className="flex min-w-[80px] max-w-[min(50vw,260px)] items-center justify-center overflow-hidden rounded-2xl border-2 border-primary bg-card px-3 py-2 text-lg font-bold text-navy shadow-soft transition-all duration-300">
            <span className="truncate">{currentWord || " "}</span>
          </div>
        )}
      </div>
    </div>
  );
});

FocusTrail.displayName = "FocusTrail";

