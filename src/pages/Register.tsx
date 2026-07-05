import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirm) { toast.error("Заповніть усі поля"); return; }
    if (password !== confirm) { toast.error("Паролі не співпадають"); return; }
    if (password.length < 6) { toast.error("Пароль має бути не менше 6 символів"); return; }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Реєстрацію завершено! Перевір email."); navigate("/login"); }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles size={30} strokeWidth={2.2} />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Реєстрація</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Облік прибирання</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="px-1 text-sm font-semibold text-foreground">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" disabled={loading}
              autoComplete="email" className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none focus:border-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="px-1 text-sm font-semibold text-foreground">Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={loading}
              autoComplete="new-password" className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none focus:border-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="px-1 text-sm font-semibold text-foreground">Підтвердіть пароль</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" disabled={loading}
              autoComplete="new-password" className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base outline-none focus:border-primary" />
          </div>
          <button type="submit" disabled={loading} className="press w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground disabled:opacity-60">
            {loading ? "Реєстрація…" : "Зареєструватися"}
          </button>
          <button type="button" onClick={() => navigate("/login")} disabled={loading} className="press w-full py-2 text-sm font-semibold text-primary">
            Вже є акаунт? Увійти
          </button>
        </form>
      </div>
    </div>
  );
}
