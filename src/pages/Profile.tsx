import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Download, LogOut, Plus, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAddWorker, useDeleteWorker, useWorkDays, useWorkers } from "@/data/queries";
import { todayLocal } from "@/domain/dates";
import { AppBar } from "@/ui/AppBar";
import { Button } from "@/ui/Button";

const csvEscape = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: workers = [] } = useWorkers();
  const { data: days = [] } = useWorkDays();
  const addWorker = useAddWorker();
  const delWorker = useDeleteWorker();
  const [newWorker, setNewWorker] = useState("");

  const addHelper = () => {
    const name = newWorker.trim();
    if (!name) return;
    addWorker.mutate({ name, makePrimary: workers.length === 0 });
    setNewWorker("");
  };

  const exportCsv = () => {
    const header = "дата,клієнт,години,сума,оплачено,статус,нотатка";
    const rows = [...days]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((d) =>
        [
          d.date,
          csvEscape(d.clientName),
          d.hours,
          d.amount,
          d.paidAmount,
          d.status,
          csvEscape(d.note ?? ""),
        ].join(","),
      );
    const blob = new Blob(["﻿" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yasno-${todayLocal()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Експортовано CSV");
  };

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        left={
          <button
            type="button"
            aria-label="Назад"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 active:bg-surface-inset"
          >
            <ArrowLeft size={20} />
          </button>
        }
        title="Профіль"
      />

      <div className="container space-y-6 px-4 pb-10 pt-4">
        {/* Акаунт */}
        <section className="space-y-2">
          <p className="caption px-1">Акаунт</p>
          <div className="surface-card flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-tint text-lg font-semibold text-accent">
              {(user?.email ?? "Я").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user?.email ?? "Демо-режим"}</p>
              <p className="caption">Ясно 4.0</p>
            </div>
          </div>
        </section>

        {/* Помічниці (команда опційно) */}
        <section className="space-y-2">
          <p className="caption px-1">Помічниці</p>
          <div className="surface-card divide-y divide-line overflow-hidden">
            {workers.length === 0 && (
              <p className="px-4 py-3 text-sm text-ink-3">
                Соло-режим. Додай помічницю, щоб ділити роботу й оплату.
              </p>
            )}
            {workers.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: w.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {w.name}
                  {w.isPrimary && <span className="caption ml-2">основна</span>}
                </span>
                {!w.isPrimary && (
                  <button
                    type="button"
                    aria-label="Видалити помічницю"
                    onClick={() => delWorker.mutate(w.id)}
                    className="text-ink-3 active:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 px-3 py-2">
              <UserPlus size={16} className="text-ink-3" />
              <input
                className="field !border-0 !bg-transparent !px-1"
                value={newWorker}
                onChange={(e) => setNewWorker(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHelper()}
                placeholder="Імʼя помічниці"
              />
              <button
                type="button"
                aria-label="Додати"
                onClick={addHelper}
                disabled={!newWorker.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Дані */}
        <section className="space-y-2">
          <p className="caption px-1">Дані</p>
          <Button variant="ghost" block onClick={exportCsv}>
            <Download size={18} /> Експортувати CSV
          </Button>
        </section>

        {/* Вихід */}
        <Button variant="ghost" block onClick={logout} className="!text-danger">
          <LogOut size={18} /> Вийти
        </Button>
      </div>
    </div>
  );
}
