import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Client } from '@/types/report';
import { Pencil, Trash2, Plus, Euro, Users } from 'lucide-react';
import { toast } from 'sonner';
import { BottomNavigation } from '@/components/BottomNavigation';

const ClientManagement = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientRate, setEditClientRate] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (error) {
      toast.error('Помилка завантаження клієнтів');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!newClientName || !newClientRate) {
      toast.error('Заповніть всі поля');
      return;
    }

    try {
      await api.addClient({
        name: newClientName,
        hourlyRate: parseFloat(newClientRate),
      });
      
      await loadClients();
      setNewClientName('');
      setNewClientRate('');
      setIsAddDialogOpen(false);
      toast.success('Клієнта додано', { duration: 2000 });
    } catch (error) {
      toast.error('Помилка додавання клієнта');
      console.error(error);
    }
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setEditClientName(client.name);
    setEditClientRate((client.hourlyRate || client.hourly_rate || 0).toString());
    setIsEditDialogOpen(true);
  };

  const handleUpdateClient = async () => {
    if (!editingClient || !editClientName || !editClientRate) {
      toast.error('Заповніть всі поля');
      return;
    }

    try {
      await api.updateClient(editingClient.id, {
        name: editClientName,
        hourlyRate: parseFloat(editClientRate),
      });
      
      await loadClients();
      setIsEditDialogOpen(false);
      setEditingClient(null);
      toast.success('Клієнта оновлено', { duration: 2000 });
    } catch (error) {
      toast.error('Помилка оновлення клієнта');
      console.error(error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цього клієнта? Це також видалить всі пов\'язані звіти.')) {
      return;
    }

    try {
      await api.deleteClient(clientId);
      await loadClients();
      toast.success('Клієнта видалено', { duration: 2000 });
    } catch (error) {
      toast.error('Помилка видалення клієнта');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <p className="text-foreground text-lg">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-4">
      {/* Fixed top section */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-center text-foreground">Управління клієнтами</h1>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-20 max-w-4xl space-y-3">
        {/* Add Client Button */}
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="w-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-100 shadow-[0_4px_16px_0_rgba(34,197,94,0.25)] border-2 border-green-400 dark:border-green-600 rounded-xl p-4 font-semibold transition-all active:scale-[0.98] hover:shadow-[0_6px_20px_0_rgba(34,197,94,0.3)]"
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="text-base">Додати клієнта</span>
          </div>
        </button>

        {/* Clients List */}
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-center text-muted-foreground">Немає клієнтів</p>
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="bg-card rounded-xl p-4 shadow-sm border border-border"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Client Name */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">{client.name}</h3>
                </div>

                {/* Hourly Rate Badge */}
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg px-3 py-1.5 flex items-center gap-1.5 flex-shrink-0">
                  <Euro className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-black dark:text-white text-sm">
                    {client.hourlyRate || client.hourly_rate}€/год
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEditClick(client)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors active:scale-95"
                  >
                    <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition-colors active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-card border border-border shadow-xl max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground text-center">Додати клієнта</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Назва клієнта</Label>
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Введіть назву"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Ставка за годину (€)</Label>
              <Input
                type="number"
                value={newClientRate}
                onChange={(e) => setNewClientRate(e.target.value)}
                placeholder="Введіть ставку"
                className="h-11 rounded-lg"
              />
            </div>
            <button
              onClick={handleAddClient}
              className="w-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-100 shadow-[0_4px_16px_0_rgba(34,197,94,0.25)] border-2 border-green-400 dark:border-green-600 rounded-lg h-11 font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Додати</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border border-border shadow-xl max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground text-center">Редагувати клієнта</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Назва клієнта</Label>
              <Input
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                placeholder="Введіть назву"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Ставка за годину (€)</Label>
              <Input
                type="number"
                value={editClientRate}
                onChange={(e) => setEditClientRate(e.target.value)}
                placeholder="Введіть ставку"
                className="h-11 rounded-lg"
              />
            </div>
            <button
              onClick={handleUpdateClient}
              className="w-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-800 dark:text-blue-100 shadow-[0_4px_16px_0_rgba(59,130,246,0.25)] border-2 border-blue-400 dark:border-blue-600 rounded-lg h-11 font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              <span>Зберегти</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ClientManagement;
