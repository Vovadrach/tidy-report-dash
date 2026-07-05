import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAddClient, useUpdateClient } from "@/data/queries";
import type { Client } from "@/domain/types";
import { Sheet } from "@/ui/Sheet";
import { Button } from "@/ui/Button";

/** Додати / редагувати клієнта (імʼя + ставка) — нижній лист «Ясно». */
export function ClientFormSheet({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  client?: Client;
}) {
  const add = useAddClient();
  const update = useUpdateClient();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(client?.name ?? "");
    setRate(client ? String(client.hourlyRate) : "");
  }, [open, client]);

  const save = () => {
    const trimmed = name.trim();
    const hourlyRate = Math.max(0, parseFloat(rate.replace(",", ".")) || 0);
    if (!trimmed) {
      toast.error("Введіть імʼя клієнта");
      return;
    }
    if (client) {
      update.mutate(
        { id: client.id, name: trimmed, hourlyRate },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      add.mutate({ name: trimmed, hourlyRate }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={client ? "Редагувати клієнта" : "Новий клієнт"}
      footer={
        <Button block disabled={add.isPending || update.isPending} onClick={save}>
          Зберегти
        </Button>
      }
    >
      <div className="space-y-1.5">
        <label className="caption">Імʼя</label>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Напр. Марко Россі"
          autoFocus={!client}
        />
      </div>
      <div className="space-y-1.5">
        <label className="caption">Ставка за годину</label>
        <div className="relative">
          <input
            className="field pr-9"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">
            €/год
          </span>
        </div>
      </div>
    </Sheet>
  );
}
