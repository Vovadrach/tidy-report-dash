import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Client } from "@/types/report";
import { User, UserPlus, LogOut, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { HomeDock } from "@/components/HomeDock";

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
    <div className="min-h-screen bg-background">
      {/* Fixed top section */}
      <div className="fixed top-0 left-0 right-0 z-40 glass-header">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="icon-badge icon-badge-blue rounded-full">
                <User className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Оберіть клієнта</h1>
            </div>
            <button
              onClick={() => navigate('/client-management?returnTo=/select-client')}
              className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/15 transition-all active:scale-95 flex items-center justify-center"
              aria-label="Керування клієнтами"
            >
              <UserPlus className="w-5 h-5 text-primary stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-24 pb-dock-sm max-w-md space-y-3">
        {/* Search Input */}
        <div className="surface-card p-3">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-violet rounded-full">
              <Search className="w-5 h-5" />
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
                  onClick={() => navigate('/client-management?returnTo=/select-client')}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-md hover:shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2 font-semibold"
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
              className="surface-card surface-card-hover p-4 cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="icon-badge icon-badge-blue w-12 h-12 rounded-full">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground truncate">
                    {client.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="chip chip-blue">
                    <span>{client.hourlyRate || client.hourly_rate || 0}€</span>
                    <span className="font-medium opacity-70">/год</span>
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

      <HomeDock />
    </div>
  );
};

export default SelectClient;
