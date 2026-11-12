/** Green while it fills, ending in gold so the last stretch reads as nearly there. */
export function ProgressBar({
  percent,
  label,
  size = "md",
}: {
  percent: number;
  label: string;
  size?: "md" | "lg";
}) {
  const width = Math.max(Math.min(percent, 100), 0);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      className={`w-full overflow-hidden rounded-full bg-black/[0.07] ${size === "lg" ? "h-3.5" : "h-2.5"}`}
    >
      <div
        className={`grow-bar h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300 ${
          size === "lg" && width < 100 ? "shimmer" : ""
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
