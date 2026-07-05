import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/ui/Button";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Заповніть усі поля");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate("/");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-accent-ink">
            ●
          </div>
          <h1 className="display text-3xl">Ясно</h1>
          <p className="caption mt-1">Легкий облік прибирання</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="caption">Email</label>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <label className="caption">Пароль</label>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" block disabled={loading}>
            {loading ? "Вхід…" : "Увійти"}
          </Button>
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="w-full py-2 text-sm font-medium text-accent"
            disabled={loading}
          >
            Немає акаунту? Зареєструватися
          </button>
        </form>
      </div>
    </div>
  );
}
