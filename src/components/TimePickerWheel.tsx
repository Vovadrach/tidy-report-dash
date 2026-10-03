import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Clock, Euro as CurrencyEur } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calculateAmount, parseNumber, round2 } from '@/domain/money';
import { hoursToDecimal } from '@/domain/time';

interface TimePickerWheelProps {
  value: string;
  onChange: (value: string, exact?: { hours: number; amount: number; manual: boolean }) => void;
  placeholder?: string;
  hourlyRate?: number;
  exactHours?: number;
  currentAmount?: number;
  children?: ReactNode;
  triggerClassName?: string;
}
const HOURS = Array.from({ length: 101 }, (_, i) => i);
const MINUTES = [0, 10, 20, 30, 40, 50];
const ITEM_HEIGHT = 48;

export const TimePickerWheel = ({ value, onChange, placeholder = '0:00', hourlyRate = 0, exactHours, currentAmount, children, triggerClassName }: TimePickerWheelProps) => {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [manualAmount, setManualAmount] = useState<string | null>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const starting = useRef({ hours: 0, minutes: 0 });
  const original = useRef({ hours: 0, amount: 0 });
  const untouched = useRef(true);
  const positioning = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wheelHours = untouched.current ? original.current.hours : hours + minutes / 60;
  const amount = manualAmount === null ? (untouched.current ? original.current.amount : calculateAmount(wheelHours, hourlyRate)) : parseNumber(manualAmount);
  const finalHours = manualAmount === null || hourlyRate <= 0 ? wheelHours : amount / hourlyRate;
  const valid = Number.isFinite(finalHours) && finalHours > 0 && finalHours <= 100.999999 &&
    (hourlyRate <= 0 || Number.isFinite(amount) && amount > 0);
  const openPicker = () => {
    const actualHours = exactHours ?? hoursToDecimal(value);
    original.current = { hours: actualHours, amount: currentAmount ?? calculateAmount(actualHours, hourlyRate) };
    untouched.current = true; positioning.current = true;
    const totalMinutes = Math.round(actualHours * 60 / 10) * 10;
    const next = { hours: Math.min(100, Math.floor(totalMinutes / 60)), minutes: totalMinutes % 60 };
    starting.current = next; setHours(next.hours); setMinutes(next.minutes); setManualAmount(null); setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (hoursRef.current) hoursRef.current.scrollTop = starting.current.hours * ITEM_HEIGHT;
      if (minutesRef.current) minutesRef.current.scrollTop = MINUTES.indexOf(starting.current.minutes) * ITEM_HEIGHT;
      timers.current.push(setTimeout(() => { positioning.current = false; }, 50));
    });
    return () => { cancelAnimationFrame(frame); timers.current.forEach(clearTimeout); timers.current = []; };
  }, [open]);
  const scroll = (element: HTMLDivElement, values: number[], setter: (value: number) => void, index: number) => {
    if (positioning.current) return;
    const target = Math.max(0, Math.min(values.length - 1, Math.round(element.scrollTop / ITEM_HEIGHT)));
    if (values[target] === (index === 0 ? hours : minutes)) return;
    untouched.current = false;
    setter(values[target]); setManualAmount(null);
    clearTimeout(timers.current[index]);
    timers.current[index] = setTimeout(() => {
      if (Math.abs(element.scrollTop - target * ITEM_HEIGHT) > 2) element.scrollTo({ top: target * ITEM_HEIGHT, behavior: 'smooth' });
    }, 150);
  };
  const confirm = () => {
    if (!valid) return;
    const totalMinutes = Math.round(finalHours * 60);
    onChange(`${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`,
      { hours: finalHours, amount: hourlyRate > 0 ? round2(amount) : 0, manual: manualAmount !== null });
    setOpen(false);
  };
  return <>
    <button type="button" aria-label="Змінити години" onClick={openPicker}
      className={triggerClassName ?? "press flex w-full items-center justify-center gap-2 rounded-xl border border-border px-2 py-2 font-semibold"}>
      {children ?? <><Clock className="w-4 h-4 text-primary" />{value || placeholder}</>}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[340px] rounded-3xl p-6" data-no-swipe>
        <DialogHeader><DialogTitle className="text-center">Виберіть час</DialogTitle></DialogHeader>
        <div className="flex gap-4 items-center">
          {([['Години', HOURS, hours, setHours, hoursRef], ['Хвилини', MINUTES, minutes, setMinutes, minutesRef]] as const).map(([label, values, selected, setter, ref], index) => (
            <div className="flex-1" key={label}>
              <label className="block text-xs font-bold text-center text-muted-foreground mb-3">{label}</label>
              <div className="relative h-[144px]">
                <div className="absolute inset-x-0 top-[48px] h-[48px] border-y-2 border-primary/40 bg-primary/10 pointer-events-none rounded-lg" />
                <div ref={ref} className="h-full overflow-y-auto scrollbar-hide" style={{ paddingBlock: ITEM_HEIGHT }}
                  onScroll={event => scroll(event.currentTarget, values, setter, index)}>
                  {values.map(number => <div key={number} className="h-[48px] flex items-center justify-center text-xl font-bold" style={{ opacity: selected === number ? 1 : 0.3 }}>
                    {index === 1 ? String(number).padStart(2, '0') : number}
                  </div>)}
                </div>
              </div>
            </div>
          ))}
        </div>
        {hourlyRate > 0 && <label className="block text-sm font-bold text-center">або введіть суму
          <div className="flex items-center gap-2 mt-3">
            <Input type="number" min="0.01" step="0.01" aria-label="Сума за роботу" value={manualAmount ?? amount}
              onChange={event => { untouched.current = false; setManualAmount(event.target.value); }} className="text-center text-xl font-bold" />
            <CurrencyEur className="w-5 h-5" />
          </div>
        </label>}
        <div className="flex gap-3">
          <button className="flex-1 rounded-2xl bg-secondary p-3 font-bold" onClick={() => setOpen(false)}>Скасувати</button>
          <button disabled={!valid} className="flex-1 rounded-2xl bg-primary text-primary-foreground p-3 font-bold disabled:opacity-50" onClick={confirm}>Підтвердити</button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
};
