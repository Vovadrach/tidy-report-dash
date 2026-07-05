import { useEffect, useRef, useState, useCallback } from "react";
import { Clock, Euro } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TimePickerWheelProps {
  value: string; // Format: "8:30"
  onChange: (value: string) => void;
  placeholder?: string;
  hourlyRate?: number; // Hourly rate for amount calculation
}

export const TimePickerWheel = ({ value, onChange, placeholder = "0:00", hourlyRate = 0 }: TimePickerWheelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [isUpdatingFromAmount, setIsUpdatingFromAmount] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [amountManuallyEntered, setAmountManuallyEntered] = useState(false);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Refs for scroll timeout management
  const hoursScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const minutesScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const isScrolling = useRef({ hours: false, minutes: false });

  // Parse initial value
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':').map(s => parseInt(s) || 0);
      setHours(h);
      // Round minutes to nearest 10
      setMinutes(Math.round(m / 10) * 10);
    }
  }, [value]);

  // Generate arrays for hours and minutes
  const hoursArray = Array.from({ length: 101 }, (_, i) => i); // 0-100 годин
  const minutesArray = [0, 10, 20, 30, 40, 50];

  const handleOpen = () => {
    setIsOpen(true);
    // Calculate initial amount
    if (hourlyRate > 0) {
      const totalHours = hours + (minutes / 60);
      const calculatedAmount = Math.round(totalHours * hourlyRate);
      setAmountInput(calculatedAmount.toString());
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setAmountInput("");
    setIsAmountFocused(false);
    setAmountManuallyEntered(false);
  };

  const handleConfirm = () => {
    let finalTime: string;

    // If user entered an amount, calculate time from it (exact, no rounding)
    if (amountInput && hourlyRate > 0 && amountManuallyEntered) {
      const amount = parseFloat(amountInput);
      if (!isNaN(amount)) {
        const totalHours = amount / hourlyRate;

        // Don't round - keep exact time to preserve the amount
        const h = Math.floor(totalHours);
        const m = Math.round((totalHours - h) * 60);

        // Handle edge case where minutes round to 60
        const adjustedHours = m >= 60 ? h + 1 : h;
        const adjustedMinutes = m >= 60 ? 0 : m;

        finalTime = `${adjustedHours}:${adjustedMinutes.toString().padStart(2, '0')}`;
      } else {
        finalTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
      }
    } else {
      finalTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    onChange(finalTime);
    handleClose();
  };

  // Update amount when time changes (only if user is not editing the amount field)
  useEffect(() => {
    if (isOpen && hourlyRate > 0 && !isUpdatingFromAmount && !isAmountFocused) {
      const totalHours = hours + (minutes / 60);
      const calculatedAmount = Math.round(totalHours * hourlyRate);
      setAmountInput(calculatedAmount.toString());
    }
  }, [hours, minutes, hourlyRate, isOpen, isUpdatingFromAmount, isAmountFocused]);

  // Update time when amount changes - only update visually, don't auto-update
  const handleAmountChange = (newAmount: string) => {
    setAmountInput(newAmount);
    if (newAmount) {
      setAmountManuallyEntered(true);
    }
  };

  // Handle focus on amount input - clear the field
  const handleAmountFocus = () => {
    setIsAmountFocused(true);
    setAmountInput("");
  };

  // Handle blur on amount input
  const handleAmountBlur = () => {
    setIsAmountFocused(false);
    // If field is empty, recalculate from current time
    if (!amountInput && hourlyRate > 0) {
      const totalHours = hours + (minutes / 60);
      const calculatedAmount = Math.round(totalHours * hourlyRate);
      setAmountInput(calculatedAmount.toString());
    }
  };

  // Optimized scroll handler with debouncing
  const handleScroll = useCallback((
    ref: React.RefObject<HTMLDivElement>,
    items: number[],
    setter: (value: number) => void,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
    scrollingFlag: 'hours' | 'minutes'
  ) => {
    if (!ref.current) return;

    const container = ref.current;
    const itemHeight = 48;
    const scrollTop = container.scrollTop;
    const centerIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(centerIndex, items.length - 1));

    // Update value immediately for visual feedback
    setter(items[clampedIndex]);

    // Reset manual amount entry flag when user scrolls time wheels
    setAmountManuallyEntered(false);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set flag that we're scrolling
    isScrolling.current[scrollingFlag] = true;

    // Debounce the smooth scroll to center
    timeoutRef.current = setTimeout(() => {
      if (!ref.current) return;

      const targetScroll = clampedIndex * itemHeight;
      const currentScroll = ref.current.scrollTop;

      // Only snap if not already centered
      if (Math.abs(currentScroll - targetScroll) > 3) {
        // Use requestAnimationFrame for smoother scroll
        requestAnimationFrame(() => {
          if (!ref.current) return;
          ref.current.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          });
        });
      }

      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrolling.current[scrollingFlag] = false;
      }, 200);
    }, 100);
  }, []);

  // Initialize scroll positions
  useEffect(() => {
    if (isOpen && hoursRef.current && minutesRef.current) {
      const itemHeight = 48;
      const hoursIndex = hoursArray.indexOf(hours);
      const minutesIndex = minutesArray.indexOf(minutes);

      // Use requestAnimationFrame for smooth initialization
      requestAnimationFrame(() => {
        if (hoursRef.current) {
          hoursRef.current.scrollTop = hoursIndex * itemHeight;
        }
        if (minutesRef.current) {
          minutesRef.current.scrollTop = minutesIndex * itemHeight;
        }
      });
    }
  }, [isOpen, hours, minutes, hoursArray, minutesArray]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoursScrollTimeout.current) {
        clearTimeout(hoursScrollTimeout.current);
      }
      if (minutesScrollTimeout.current) {
        clearTimeout(minutesScrollTimeout.current);
      }
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayValue = value || placeholder;

  return (
    <>
      {/* Input Display */}
      <div
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-2 py-2 rounded-lg border-2 border-purple-200/60 dark:border-purple-700/60 bg-transparent cursor-pointer hover:border-purple-400/60 dark:hover:border-purple-500/60 transition-all overflow-hidden"
        style={{ width: '100%', boxSizing: 'border-box' }}
      >
        <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground truncate flex-1 text-center">{displayValue}</span>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="bg-card rounded-2xl shadow-2xl p-6 w-[340px] max-h-[90vh] overflow-y-auto border border-border"
          >
            <h3 className="text-xl font-bold text-center text-foreground mb-6">
              Виберіть час
            </h3>

            {/* Wheel Pickers */}
            <div className="space-y-6">
              <div className="flex gap-4 justify-center">
                  {/* Hours Wheel */}
                  <div className="relative flex-1">
                    <div className="text-xs font-bold text-center text-muted-foreground mb-3">
                      Години
                    </div>
                    <div className="relative h-[144px] w-full">
                      {/* Selection indicator */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[48px] border-y-2 border-primary/40 bg-primary/10 pointer-events-none z-10 rounded-lg" />

                      {/* Scrollable list */}
                      <div
                        ref={hoursRef}
                        className="h-full overflow-y-auto scrollbar-hide"
                        onScroll={() => handleScroll(hoursRef, hoursArray, setHours, hoursScrollTimeout, 'hours')}
                        style={{
                          paddingTop: '48px',
                          paddingBottom: '48px',
                          scrollBehavior: 'auto'
                        }}
                      >
                        {hoursArray.map((hour) => (
                          <div
                            key={hour}
                            className="h-[48px] flex items-center justify-center text-xl font-bold transition-all duration-200"
                            style={{
                              opacity: hour === hours ? 1 : 0.3,
                              transform: hour === hours ? 'scale(1.1)' : 'scale(0.9)',
                              willChange: 'transform, opacity'
                            }}
                          >
                            {hour}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="flex items-center text-3xl font-bold text-primary pt-10">
                    :
                  </div>

                  {/* Minutes Wheel */}
                  <div className="relative flex-1">
                    <div className="text-xs font-bold text-center text-muted-foreground mb-3">
                      Хвилини
                    </div>
                    <div className="relative h-[144px] w-full">
                      {/* Selection indicator */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[48px] border-y-2 border-primary/40 bg-primary/10 pointer-events-none z-10 rounded-lg" />

                      {/* Scrollable list */}
                      <div
                        ref={minutesRef}
                        className="h-full overflow-y-auto scrollbar-hide"
                        onScroll={() => handleScroll(minutesRef, minutesArray, setMinutes, minutesScrollTimeout, 'minutes')}
                        style={{
                          paddingTop: '48px',
                          paddingBottom: '48px',
                          scrollBehavior: 'auto'
                        }}
                      >
                        {minutesArray.map((minute) => (
                          <div
                            key={minute}
                            className="h-[48px] flex items-center justify-center text-xl font-bold transition-all duration-200"
                            style={{
                              opacity: minute === minutes ? 1 : 0.3,
                              transform: minute === minutes ? 'scale(1.1)' : 'scale(0.9)',
                              willChange: 'transform, opacity'
                            }}
                          >
                            {minute.toString().padStart(2, '0')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              {/* Amount Input - always visible if hourlyRate provided */}
              {hourlyRate > 0 && (
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                  <label className="block text-sm font-bold text-center text-muted-foreground mb-3">
                    або введіть суму
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      value={amountInput}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      onFocus={handleAmountFocus}
                      onBlur={handleAmountBlur}
                      placeholder=""
                      className="flex-1 px-4 py-3 text-center text-xl font-bold rounded-lg border-2 border-blue-300 dark:border-blue-700 focus-visible:ring-blue-500"
                    />
                    <div className="flex items-center justify-center w-12 h-12 flex-shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700">
                      <Euro className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 font-bold hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all shadow-md hover:shadow-lg"
              >
                Скасувати
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground font-bold hover:from-primary/90 hover:to-primary/80 transition-all shadow-md hover:shadow-lg"
              >
                Підтвердити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hide scrollbar and optimize scrolling CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }
      `}</style>
    </>
  );
};
