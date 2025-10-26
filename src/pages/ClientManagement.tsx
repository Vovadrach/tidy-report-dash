import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Client } from '@/types/report';
import { Edit2, Trash2, Plus } from 'lucide-react';
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
      toast.success('Клієнта додано');
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
      toast.success('Клієнта оновлено');
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
      toast.success('Клієнта видалено');
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
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border">
          <h1 className="text-2xl font-bold text-center text-foreground">Управління клієнтами</h1>
        </div>

        {/* Add Client Button */}
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="w-full bg-success hover:bg-success/90 text-white h-12 text-base font-semibold rounded-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Додати клієнта
        </Button>

        {/* Clients List */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border space-y-3">
          {clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Немає клієнтів</p>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className="bg-secondary/10 rounded-md p-5 flex items-center justify-between border border-border"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{client.name}</h3>
                  <p className="text-base text-primary font-medium">
                    {client.hourlyRate || client.hourly_rate}€/год
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(client)}
                    className="p-3 rounded-md hover:bg-primary/10 transition-smooth"
                  >
                    <Edit2 className="w-4 h-4 text-primary" />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-3 rounded-md hover:bg-destructive/10 transition-smooth"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-card border border-border shadow-xl max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Додати клієнта</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Назва клієнта</Label>
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Введіть назву"
                className="h-10 rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Ставка за годину (€)</Label>
              <Input
                type="number"
                value={newClientRate}
                onChange={(e) => setNewClientRate(e.target.value)}
                placeholder="Введіть ставку"
                className="h-10 rounded-md"
              />
            </div>
            <Button 
              onClick={handleAddClient} 
              className="w-full h-10 bg-success hover:bg-success/90 text-white text-base font-semibold rounded-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Додати
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border border-border shadow-xl max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Редагувати клієнта</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Назва клієнта</Label>
              <Input
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                placeholder="Введіть назву"
                className="h-10 rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Ставка за годину (€)</Label>
              <Input
                type="number"
                value={editClientRate}
                onChange={(e) => setEditClientRate(e.target.value)}
                placeholder="Введіть ставку"
                className="h-10 rounded-md"
              />
            </div>
            <Button 
              onClick={handleUpdateClient} 
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-base font-semibold rounded-md"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Зберегти
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ClientManagement;
