import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, UserPlus, SignOut as LogOut, CaretRight as ChevronRight, MagnifyingGlass as Search } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { HomeDock } from "@/components/HomeDock";
import { useClients } from "@/data/queries";

const SelectClient = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: clients = [], isLoading } = useClients();
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg animate-pulse">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 app-bar">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="icon-badge icon-badge-time rounded-full">
                <User className="w-5 h-5" />
              </div>
              <h1 className="display text-xl text-foreground">Оберіть клієнта</h1>
            </div>
            <button
              onClick={() => navigate('/client-management?returnTo=/select-client')}
              className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/15 transition-all active:scale-95 flex items-center justify-center"
              aria-label="Керування клієнтами"
            >
              <UserPlus className="w-5 h-5 text-primary" />
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-24 pb-dock-sm max-w-md space-y-3">
        <div className="surface-card p-3">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-time rounded-full">
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

        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {searchQuery ? (
              <>
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-foreground mb-2">Нічого не знайдено</p>
                <p className="text-muted-foreground text-sm">Спробуйте інший запит</p>
              </>
            ) : (
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
            )}
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/create-report?clientId=${client.id}`)}
              className="surface-card surface-card-hover p-4 cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="icon-badge icon-badge-time w-12 h-12 rounded-full">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground truncate">
                    {client.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="chip chip-money">
                    <span>{client.hourlyRate}€</span>
                    <span className="font-medium opacity-70">/год</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))
        )}

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
