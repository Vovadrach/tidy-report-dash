import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '@/i18n';
import { calculateAmount, parseNumber, round2, toWholeEuros } from '@/domain/money';
import { decimalToHours, hoursToDecimal } from '@/domain/time';
import { cn } from '@/lib/utils';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { TextInput } from '@/ui/Field';
import { spring } from '@/ui/motion';

interface TimePickerWheelProps {
  value: string;
  onChange: (value: string, exact?: { hours: number; amount: number; manual: boolean }) => void;
  placeholder?: string;
  hourlyRate?: number;
  exactHours?: number;
  currentAmount?: number;
  children?: ReactNode;
  triggerClassName?: string;
  disabled?: boolean;
}
const HOURS = Array.from({ length: 101 }, (_, i) => i);
const MINUTES = [0, 10, 20, 30, 40, 50];
const PRESETS = [1, 1.5, 2, 2.5, 3, 4];
const ITEM_HEIGHT = 48;
const VISIBLE = 5;

/**
 * Години роботи — лист із двома колесами (години · хвилини).
 * Зверху живий підсумок «час · сума», нижче швидкі пресети, колеса прилипають
 * до значення по центру (смуга-колодязь). Альтернатива — ввести суму: тоді
 * години перераховуються за ставкою. Нічого не змінюється, доки не натиснуто
 * «Підтвердити»; без змін зберігаються точні години й сума запису.
 */
export const TimePickerWheel = ({ value, onChange, placeholder = '0:00', hourlyRate = 0, exactHours, currentAmount, children, triggerClassName, disabled }: TimePickerWheelProps) => {
  const { t } = useI18n();
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
  const amount = manualAmount === null ? (untouched.current ? original.current.amount : calculateAmount(wheelHours, hourlyRate)) : toWholeEuros(parseNumber(manualAmount));
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
  /** Пресет: колеса плавно докручуються до значення, підсумок оновлюється одразу. */
  const preset = (decimal: number) => {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    untouched.current = false; positioning.current = true;
    setHours(h); setMinutes(m); setManualAmount(null);
    hoursRef.current?.scrollTo({ top: h * ITEM_HEIGHT, behavior: 'smooth' });
    minutesRef.current?.scrollTo({ top: MINUTES.indexOf(m) * ITEM_HEIGHT, behavior: 'smooth' });
    timers.current.push(setTimeout(() => { positioning.current = false; }, 450));
  };
  const confirm = () => {
    if (!valid) return;
    const totalMinutes = Math.round(finalHours * 60);
    onChange(`${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`,
      { hours: finalHours, amount: hourlyRate > 0 ? round2(amount) : 0, manual: manualAmount !== null });
    setOpen(false);
  };

  const readout = Number.isFinite(finalHours) && finalHours > 0 ? decimalToHours(finalHours) : '0:00';
  const wheelValue = hours + minutes / 60;

  return <>
    <button type="button" aria-label="Змінити години" onClick={openPicker} disabled={disabled}
      className={triggerClassName ?? "press tap flex w-full items-center justify-center gap-2 rounded-[14px] bg-well px-3 py-2 font-semibold"}>
      {children ?? <><Clock className="h-4 w-4 text-accent-ink" />{value || placeholder}</>}
    </button>
    <Sheet open={open} onOpenChange={setOpen} title={t('hours.title')} hideClose
      footer={<>
        <Button variant="neutral" size="lg" block onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
        <Button variant="primary" size="lg" block disabled={!valid} onClick={confirm}>{t('common.confirm')}</Button>
      </>}>
      {/* Живий підсумок */}
      <div className="mb-4 flex items-end justify-center gap-3 rounded-[20px] bg-well px-4 py-4">
        <motion.span key={readout} initial={{ y: 6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} transition={spring.pop}
          className="num text-display text-ink">{readout}</motion.span>
        <span className="pb-1.5 text-callout font-semibold text-ink-3">{t('common.hoursShort')}</span>
        {hourlyRate > 0 && (
          <span className="mb-1 ml-auto rounded-full bg-accent-tint px-3 py-1 num text-callout font-semibold text-accent-ink">
            {Number.isFinite(amount) ? toWholeEuros(amount) : 0} €
          </span>
        )}
      </div>

      {/* Швидкі пресети */}
      <div className="mb-3 grid grid-cols-6 gap-1.5">
        {PRESETS.map((p) => {
          const active = manualAmount === null && Math.abs((untouched.current ? original.current.hours : wheelValue) - p) < 0.001;
          return (
            <button key={p} type="button" onClick={() => preset(p)} aria-pressed={active}
              className={cn('press h-10 rounded-[12px] num text-callout font-semibold', active ? 'bg-accent text-accent-on' : 'bg-well text-ink')}>
              {decimalToHours(p)}
            </button>
          );
        })}
      </div>

      {/* Колеса */}
      <div className="relative mb-4" style={{ height: ITEM_HEIGHT * VISIBLE }}>
        <div className="pointer-events-none absolute inset-x-0 rounded-[14px] bg-well" style={{ top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }} />
        <div className="relative flex h-full gap-2">
          {([[t('common.hours'), HOURS, hours, setHours, hoursRef], [t('hours.minutes'), MINUTES, minutes, setMinutes, minutesRef]] as const).map(([label, values, selected, setter, ref], index) => (
            <div className="relative flex-1" key={index}>
              <div ref={ref} aria-label={label} role="listbox"
                className="scrollbar-hide h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
                style={{ paddingBlock: ITEM_HEIGHT * 2, maskImage: 'linear-gradient(transparent, #000 32%, #000 68%, transparent)', WebkitMaskImage: 'linear-gradient(transparent, #000 32%, #000 68%, transparent)' }}
                onScroll={event => scroll(event.currentTarget, values as unknown as number[], setter, index)}>
                {values.map(number => (
                  <div key={number} role="option" aria-selected={selected === number}
                    className={cn('flex snap-center items-center justify-center num text-[1.375rem] transition-colors', selected === number ? 'font-semibold text-ink' : 'text-ink-4')}
                    style={{ height: ITEM_HEIGHT }}>
                    {index === 1 ? String(number).padStart(2, '0') : number}
                  </div>
                ))}
              </div>
              <span className="pointer-events-none absolute right-3 text-footnote font-semibold text-ink-3" style={{ top: ITEM_HEIGHT * 2, lineHeight: `${ITEM_HEIGHT}px` }}>
                {index === 0 ? t('common.hoursShort') : t('common.minutesShort')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Або сума */}
      {hourlyRate > 0 && (
        <div className="pb-2">
          <p className="mb-1.5 px-1 text-footnote font-semibold text-ink-3">{t('hours.orAmount')}</p>
          <TextInput inputMode="decimal" aria-label="Сума за роботу" suffix="€" placeholder="0"
            value={manualAmount ?? (Number.isFinite(amount) ? String(amount) : '')}
            onFocus={(event) => event.currentTarget.select()}
            onChange={event => { untouched.current = false; setManualAmount(event.target.value); }}
            className="num text-headline" />
          <p className="mt-1.5 px-1 text-caption text-ink-4">{t('hours.amountHint')}</p>
        </div>
      )}
    </Sheet>
  </>;
};
