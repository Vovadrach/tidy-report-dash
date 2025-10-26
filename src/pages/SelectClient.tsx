import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Client } from "@/types/report";
import { User, UserPlus, LogOut, ArrowLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";

const SelectClient = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients();
      setClients(data);
    } catch (error) {
      toast.error('Помилка завантаження клієнтів');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (clientId: string) => {
    navigate(`/create-report?clientId=${clientId}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Вихід успішний");
      navigate("/login");
    } catch (error) {
      toast.error("Помилка виходу");
      console.error(error);
    }
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground text-lg">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-4">
      {/* Fixed top section */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Оберіть клієнта</h1>
            </div>
            <button
              onClick={() => navigate('/client-management')}
              className="h-10 w-10 rounded-md bg-primary/10 hover:bg-primary/20 transition-all shadow-sm hover:shadow flex items-center justify-center"
            >
              <UserPlus className="w-5 h-5 text-primary stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-24 max-w-md space-y-3">
        {/* Search Input */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 flex items-center justify-center flex-shrink-0 border border-purple-200/60 dark:border-purple-700/60">
              <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <Input
              type="text"
              placeholder="Пошук клієнта..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {searchQuery ? (
              <>
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-foreground mb-2">Нічого не знайдено</p>
                <p className="text-muted-foreground text-sm">Спробуйте інший запит</p>
              </>
            ) : clients.length === 0 ? (
              <>
                <User className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-foreground mb-2">Немає клієнтів</p>
                <p className="text-muted-foreground text-sm mb-4">Додайте першого клієнта</p>
                <button
                  onClick={() => navigate('/client-management')}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-950 dark:to-blue-900 text-blue-700 dark:text-blue-300 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all backdrop-blur-sm border border-blue-200/60 dark:border-blue-700/60 flex items-center gap-2 font-semibold"
                >
                  <UserPlus className="w-5 h-5" />
                  Додати клієнта
                </button>
              </>
            ) : null}
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleSelectClient(client.id)}
              className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center flex-shrink-0 border border-blue-200/60 dark:border-blue-700/60">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-base font-bold text-foreground truncate">
                    {client.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {client.hourlyRate || client.hourly_rate || 0}€
                    </span>
                    <span className="text-xs text-muted-foreground">/год</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))
        )}

        {/* Logout button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-3 mt-8"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Вийти</span>
        </button>
      </main>

      {/* Gradient fade effect for back button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none h-40">
        {/* Плавний градієнт розмиття - від сильного до відсутнього */}
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)'
          }}
        ></div>

        {/* Градієнтний фон */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 via-40% to-transparent"></div>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-950 dark:to-blue-900 text-blue-700 dark:text-blue-300 px-8 py-4 rounded-full shadow-md hover:shadow-lg transition-all backdrop-blur-sm border border-blue-200/60 dark:border-blue-700/60 pointer-events-auto"
      >
        <div className="flex items-center gap-2">
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span className="font-semibold text-base">Назад</span>
        </div>
      </button>
    </div>
  );
};

export default SelectClient;
