import { CheckCircle, CircleNotch } from "@phosphor-icons/react";

interface SaveIndicatorProps {
  saving: boolean;
  savedAtLeastOnce: boolean;
}

/** Чесний стан автозбереження: «Зберігаю… → Збережено ✓» (FR-5.2). */
export const SaveIndicator = ({ saving, savedAtLeastOnce }: SaveIndicatorProps) => {
  if (!saving && !savedAtLeastOnce) return null;
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
        saving ? "text-muted-foreground" : "text-success"
      }`}
    >
      {saving ? (
        <>
          <CircleNotch className="w-3 h-3 animate-spin" />
          Зберігаю…
        </>
      ) : (
        <>
          <CheckCircle className="w-3 h-3" weight="fill" />
          Збережено
        </>
      )}
    </span>
  );
};
