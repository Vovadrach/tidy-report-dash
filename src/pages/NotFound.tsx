import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="surface-card max-w-sm p-8 text-center">
        <p className="display mb-2 text-4xl">404</p>
        <p className="mb-5 text-ink-2">Такої сторінки немає.</p>
        <button type="button" onClick={() => navigate("/")} className="btn btn-accent mx-auto">
          На головну
        </button>
      </div>
    </div>
  );
}
