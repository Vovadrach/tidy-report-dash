import { Compass } from "lucide-react";
import { useI18n } from "@/i18n";
import { useGo } from "@/ui/nav";
import { EmptyState } from "@/ui/Screen";
import { Button } from "@/ui/Button";

export default function NotFound() {
  const go = useGo();
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <EmptyState tone="neutral" icon={<Compass size={26} strokeWidth={2} />} title="404" subtitle={t("notFound.title")}
        action={<Button variant="primary" size="lg" onClick={() => go("/", "back")}>{t("notFound.home")}</Button>} />
    </div>
  );
}
