import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="card-flat max-w-sm p-8 text-center">
        <p className="font-display text-5xl font-semibold text-foreground">404</p>
        <p className="mb-6 mt-2 text-muted-foreground">{t("notFound.title")}</p>
        <button
          type="button"
          onClick={() => navigate("/", { viewTransition: true })}
          className="press rounded-2xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground"
        >
          {t("notFound.home")}
        </button>
      </div>
    </div>
  );
}
