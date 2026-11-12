import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/ui/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Тости — найвища площина: коротке підтвердження згори, без кнопки закриття,
 * зникає сам. Колір має лише іконка (успіх — зелений, помилка — червоний).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { dark } = useTheme();
  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      offset="calc(env(safe-area-inset-top) + 12px)"
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "flex w-full items-center gap-2.5 rounded-[18px] bg-overlay px-4 py-3.5 text-callout font-semibold text-ink shadow-float",
          title: "leading-5",
          description: "text-footnote font-normal text-ink-3",
          icon: "shrink-0",
          success: "[&_[data-icon]]:text-ok",
          error: "[&_[data-icon]]:text-alert",
          warning: "[&_[data-icon]]:text-warn",
          info: "[&_[data-icon]]:text-accent",
          actionButton: "ml-auto rounded-full bg-accent-tint px-3 py-1 text-footnote font-semibold text-accent-ink",
          cancelButton: "rounded-full bg-well px-3 py-1 text-footnote font-semibold text-ink-2",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
