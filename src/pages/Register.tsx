import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast.error('Заповніть всі поля');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Паролі не співпадають');
      return;
    }

    if (password.length < 6) {
      toast.error('Пароль має бути не менше 6 символів');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Реєстрацію завершено! Перевірте email для підтвердження.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card rounded-lg p-8 shadow-md max-w-md w-full border border-border">
        <h1 className="text-3xl font-bold text-center text-foreground mb-8">Реєстрація</h1>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              className="rounded-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="rounded-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Підтвердіть пароль</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="rounded-md"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full rounded-md" 
            size="lg"
            disabled={loading}
          >
            {loading ? 'Реєстрація...' : 'Зареєструватися'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              Вже є акаунт? Увійти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
