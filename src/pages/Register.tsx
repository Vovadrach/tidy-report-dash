import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { useGo } from "@/ui/nav";
import { AuthLayout } from "@/ui/AuthLayout";
import { FieldLabel, TextInput } from "@/ui/Field";
import { Button } from "@/ui/Button";

export default function Register() {
  const go = useGo();
  const { signUp } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password || !confirm) { toast.error(t("auth.fillAll")); return; }
    if (password !== confirm) { toast.error(t("auth.passMismatch")); return; }
    if (password.length < 6) { toast.error(t("auth.passShort")); return; }
    setLoading(true);
    try {
      const { error } = await signUp(email.trim(), password);
      if (error) toast.error(error.message);
      else { toast.success(t("auth.registerDone")); go("/login", "back"); }
    } catch { toast.error(t("toast.loadError")); } finally { setLoading(false); }
  };

  return (
    <AuthLayout title={t("auth.register")} subtitle={t("auth.subtitle")}>
      <form onSubmit={submit} className="space-y-4">
        <div className="card space-y-4 p-4">
          <div>
            <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
            <TextInput id="email" type="email" aria-label={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" disabled={loading} autoComplete="email" />
          </div>
          <div>
            <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
            <TextInput id="password" type="password" aria-label={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={loading} autoComplete="new-password" />
          </div>
          <div>
            <FieldLabel htmlFor="confirm">{t("auth.confirmPassword")}</FieldLabel>
            <TextInput id="confirm" type="password" aria-label={t("auth.confirmPassword")} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" disabled={loading} autoComplete="new-password" />
          </div>
        </div>
        <Button type="submit" variant="primary" size="lg" block disabled={loading}>{loading ? t("auth.registering") : t("auth.signUp")}</Button>
        <Button variant="ghost" block onClick={() => go("/login", "back")} disabled={loading} className="text-accent-ink">{t("auth.haveAccount")}</Button>
      </form>
    </AuthLayout>
  );
}
