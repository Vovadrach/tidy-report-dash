import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Client, PaymentStatus } from "@/types/report";

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onApply: (filters: FilterState) => void;
}

export interface FilterState {
  paymentStatuses: PaymentStatus[];
  clientId?: string;
  month?: number;
  year?: number;
}

export const FilterPanel = ({ isOpen, onClose, clients, onApply }: FilterPanelProps) => {
  const [filters, setFilters] = useState<FilterState>({
    paymentStatuses: [],
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 0, label: "Січень" },
    { value: 1, label: "Лютий" },
    { value: 2, label: "Березень" },
    { value: 3, label: "Квітень" },
    { value: 4, label: "Травень" },
    { value: 5, label: "Червень" },
    { value: 6, label: "Липень" },
    { value: 7, label: "Серпень" },
    { value: 8, label: "Вересень" },
    { value: 9, label: "Жовтень" },
    { value: 10, label: "Листопад" },
    { value: 11, label: "Грудень" },
  ];

  const handlePaymentStatusToggle = (status: PaymentStatus) => {
    setFilters((prev) => ({
      ...prev,
      paymentStatuses: prev.paymentStatuses.includes(status)
        ? prev.paymentStatuses.filter((s) => s !== status)
        : [...prev.paymentStatuses, status],
    }));
  };

  const handleReset = () => {
    setFilters({ paymentStatuses: [] });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={onClose}>
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Фільтри</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">Статус оплати</Label>
              <div className="space-y-3">
                {[
                  { value: "paid" as PaymentStatus, label: "Оплачено" },
                  { value: "partial" as PaymentStatus, label: "Частково" },
                  { value: "unpaid" as PaymentStatus, label: "Не оплачено" },
                ].map((status) => (
                  <div key={status.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={status.value}
                      checked={filters.paymentStatuses.includes(status.value)}
                      onCheckedChange={() => handlePaymentStatusToggle(status.value)}
                    />
                    <Label htmlFor={status.value} className="cursor-pointer">
                      {status.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Клієнт</Label>
              <Select value={filters.clientId} onValueChange={(value) => setFilters({ ...filters, clientId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Всі клієнти" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі клієнти</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Місяць</Label>
              <Select
                value={filters.month?.toString()}
                onValueChange={(value) => setFilters({ ...filters, month: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Всі місяці" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі місяці</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Рік</Label>
              <Select
                value={filters.year?.toString()}
                onValueChange={(value) => setFilters({ ...filters, year: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Всі роки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі роки</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Скинути
            </Button>
            <Button variant="gradient" onClick={handleApply} className="flex-1">
              Застосувати
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
