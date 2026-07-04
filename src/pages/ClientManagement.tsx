import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PencilSimple as Pencil, Trash as Trash2, Plus, CurrencyEur as Euro, UsersThree as Users } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useAddClient, useClients, useDeleteClient, useUpdateClient } from '@/data/queries';
import type { Client } from '@/domain/types';
import { ScreenSkeleton } from "@/ui/Skeleton";

const ClientManagement = () => {
  const { data: clients = [], isLoading } = useClients();
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientRate, setEditClientRate] = useState('');

  const handleAddClient = () => {
    if (!newClientName || !newClientRate) {
      toast.error('Заповніть всі поля');
      return;
    }
    addClient.mutate(
      { name: newClientName, hourlyRate: parseFloat(newClientRate) },
      {
        onSuccess: () => {
          setNewClientName('');
          setNewClientRate('');
          setIsAddDialogOpen(false);
        },
      },
    );
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setEditClientName(client.name);
    setEditClientRate(client.hourlyRate.toString());
    setIsEditDialogOpen(true);
  };

  const handleUpdateClient = () => {
    if (!editingClient || !editClientName || !editClientRate) {
      toast.error('Заповніть всі поля');
      return;
    }
    updateClient.mutate(
      { id: editingClient.id, name: editClientName, hourlyRate: parseFloat(editClientRate) },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingClient(null);
        },
      },
    );
  };

  if (isLoading) {
    return <ScreenSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 app-bar">
        <div className="container mx-auto px-4 py-4">
          <h1 className="display text-xl text-center text-foreground">Управління клієнтами</h1>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-20 pb-dock max-w-4xl space-y-3">
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="w-full bg-success text-success-foreground rounded-full p-4 font-bold shadow-md hover:shadow-lg hover:bg-success/90 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="text-base">Додати клієнта</span>
          </div>
        </button>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-center text-muted-foreground">Немає клієнтів</p>
          </div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="surface-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">{client.name}</h3>
                </div>

                <div className="chip chip-money flex-shrink-0">
                  <Euro className="w-3.5 h-3.5" />
                  <span>{client.hourlyRate}€/год</span>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEditClick(client)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 hover:bg-primary/15 transition-colors active:scale-95"
                  >
                    <Pencil className="w-4 h-4 text-primary" />
                  </button>
                  <button
                    onClick={() => setClientToDelete(client)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-destructive/10 hover:bg-destructive/15 transition-colors active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground text-center">Додати клієнта</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Назва клієнта</Label>
              <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Введіть назву" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Ставка за годину (€)</Label>
              <Input type="number" value={newClientRate} onChange={(e) => setNewClientRate(e.target.value)} placeholder="Введіть ставку" className="h-11 rounded-xl" />
            </div>
            <button
              onClick={handleAddClient}
              disabled={addClient.isPending}
              className="w-full bg-success text-success-foreground rounded-full h-11 font-bold shadow-sm hover:bg-success/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>Додати</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground text-center">Редагувати клієнта</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Назва клієнта</Label>
              <Input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} placeholder="Введіть назву" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Ставка за годину (€)</Label>
              <Input type="number" value={editClientRate} onChange={(e) => setEditClientRate(e.target.value)} placeholder="Введіть ставку" className="h-11 rounded-xl" />
            </div>
            <button
              onClick={handleUpdateClient}
              disabled={updateClient.isPending}
              className="w-full bg-primary text-primary-foreground rounded-full h-11 font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Pencil className="w-4 h-4" />
              <span>Зберегти</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation */}
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити клієнта «{clientToDelete?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Це також видалить всі пов'язані записи. Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToDelete && deleteClient.mutate(clientToDelete.id, { onSuccess: () => setClientToDelete(null) })}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  );
};

export default ClientManagement;
