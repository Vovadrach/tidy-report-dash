import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { Client, Report, WorkDay, PaymentStatus, Worker, WorkDayAssignment } from "@/types/report";
import { User, Calendar, Clock, Plus, Euro, ArrowLeft, X, House, Check, Users, FileText, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { TimePickerWheel } from "@/components/TimePickerWheel";
import { useWorker } from "@/contexts/WorkerContext";
import { WorkerAssignmentDialog } from "@/components/WorkerAssignmentDialog";

// Helper functions to convert between hours:minutes format and decimal
const hoursToDecimal = (hoursStr: string): number => {
  if (!hoursStr) return 0;

  if (hoursStr.includes(':')) {
    const [hours, minutes] = hoursStr.split(':').map(s => parseInt(s) || 0);
    return Math.round((hours * 60 + minutes) * 100) / 6000;
  }

  return parseFloat(hoursStr) || 0;
};

const decimalToHours = (decimal: number): string => {
  if (!decimal) return "";
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}` : `${hours}:${minutes.toString().padStart(2, '0')}`;
};

const CreateReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { workers, addWorker } = useWorker();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [workPaymentStatus, setWorkPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [partialAmount, setPartialAmount] = useState("");
  const [customHourlyRate, setCustomHourlyRate] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [amountManuallyEntered, setAmountManuallyEntered] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  // Worker assignments state
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [workerAmounts, setWorkerAmounts] = useState<Record<string, string>>({});
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);

  // Planned work state
  const [isPlanned, setIsPlanned] = useState(false);
  const [workNote, setWorkNote] = useState("");

  // Editing planned work day
  const [editingWorkDayId, setEditingWorkDayId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  const addWorkerRef = useRef<HTMLDivElement>(null);
  
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const hoursScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const minutesScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const isScrolling = useRef({ hours: false, minutes: false });

  useEffect(() => {
    loadClients();
  }, []);

  // Set client from URL parameter
  useEffect(() => {
    const clientIdFromUrl = searchParams.get('clientId');
    if (clientIdFromUrl) {
      setSelectedClientId(clientIdFromUrl);
    }
  }, [searchParams]);

  // Load planned work day data from URL parameters
  useEffect(() => {
    const workDayId = searchParams.get('workDayId');
    const reportId = searchParams.get('reportId');
    const date = searchParams.get('date');

    if (workDayId && reportId) {
      setEditingWorkDayId(workDayId);
      setEditingReportId(reportId);

      // Load work day data
      api.getWorkDay(reportId, workDayId).then((workDay) => {
        if (workDay) {
          setWorkNote(workDay.note || "");
          setReportDate(workDay.date);
        }
      }).catch((error) => {
        console.error("Error loading planned work day:", error);
        toast.error("Помилка завантаження запланованої роботи");
      });
    } else if (date) {
      // Just set date if provided
      setReportDate(date);
    }
  }, [searchParams]);

  // Автоматично встановлюємо дефолтну ставку при виборі клієнта
  useEffect(() => {
    if (selectedClientId && clients.length > 0) {
      const defaultRate = getDefaultHourlyRate();
      setCustomHourlyRate(defaultRate.toString());
    } else if (!selectedClientId) {
      setCustomHourlyRate("");
    }
  }, [selectedClientId, clients]);

  const loadClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (error) {
      toast.error('Помилка завантаження клієнтів');
    }
  };

  const getClientHourlyRate = () => {
    // Якщо є кастомна ставка, використовуємо її
    if (customHourlyRate) {
      return parseFloat(customHourlyRate);
    }
    const client = clients.find((c) => c.id === selectedClientId);
    return client ? (client.hourlyRate || client.hourly_rate || 0) : 0;
  };

  const getDefaultHourlyRate = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    return client ? (client.hourlyRate || client.hourly_rate || 0) : 0;
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const minutesArray = [0, 10, 20, 30, 40, 50];

  const calculateEarnings = () => {
    if (!selectedClientId) return 0;
    const totalHours = hours + (minutes / 60);
    const rate = getClientHourlyRate();
    return Math.round(totalHours * rate);
  };

  const toggleWorker = (workerId: string) => {
    setSelectedWorkers(prev => {
      if (prev.includes(workerId)) {
        const updated = prev.filter(id => id !== workerId);
        const newAmounts = { ...workerAmounts };
        delete newAmounts[workerId];
        setWorkerAmounts(newAmounts);
        return updated;
      } else {
        // Save to localStorage for sorting
        const recentWorkers = JSON.parse(localStorage.getItem('recentWorkers') || '[]');
        const updatedRecent = [workerId, ...recentWorkers.filter((id: string) => id !== workerId)].slice(0, 10);
        localStorage.setItem('recentWorkers', JSON.stringify(updatedRecent));
        
        return [...prev, workerId];
      }
    });
  };

  // Sort workers by recent usage
  const getSortedWorkers = () => {
    const recentWorkers = JSON.parse(localStorage.getItem('recentWorkers') || '[]');
    
    return [...workers].sort((a, b) => {
      const aIndex = recentWorkers.indexOf(a.id);
      const bIndex = recentWorkers.indexOf(b.id);
      
      // If both are in recent, sort by recency
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is recent, a comes first
      if (aIndex !== -1) return -1;
      // If only b is recent, b comes first
      if (bIndex !== -1) return 1;
      // Otherwise maintain original order (primary first)
      return 0;
    });
  };

  const handleAddWorkerInDialog = async (name: string) => {
    try {
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      await addWorker({
        name: name,
        color: randomColor,
        is_primary: false
      });
      
      toast.success('Працівника додано');
    } catch (error) {
      toast.error('Помилка додавання працівника');
      console.error(error);
    }
  };

  const handleWorkersChange = (newSelectedWorkers: string[], newWorkerAmounts: Record<string, string>) => {
    setSelectedWorkers(newSelectedWorkers);
    setWorkerAmounts(newWorkerAmounts);
    
    // Update recent workers in localStorage
    if (newSelectedWorkers.length > 0) {
      const recentWorkers = JSON.parse(localStorage.getItem('recentWorkers') || '[]');
      const updatedRecent = [
        ...newSelectedWorkers.filter(id => !recentWorkers.includes(id)),
        ...recentWorkers.filter((id: string) => !newSelectedWorkers.includes(id))
      ].slice(0, 10);
      localStorage.setItem('recentWorkers', JSON.stringify(updatedRecent));
    }
  };

  const updateWorkerAmount = (workerId: string, amount: string) => {
    const newAmount = parseFloat(amount) || 0;
    const totalAmount = calculateEarnings();
    
    // Calculate already assigned amount (excluding this worker)
    const otherAssigned = selectedWorkers.reduce((sum, id) => {
      if (id === workerId) return sum;
      return sum + (parseFloat(workerAmounts[id] || '0'));
    }, 0);
    
    // Remaining amount available for this worker
    const available = totalAmount - otherAssigned;
    
    // If trying to assign more than available, auto-assign the remaining
    const finalAmount = newAmount > available ? available : newAmount;
    
    setWorkerAmounts(prev => ({
      ...prev,
      [workerId]: finalAmount > 0 ? finalAmount.toString() : amount
    }));
  };

  const getTotalAssignedAmount = () => {
    return selectedWorkers.reduce((sum, workerId) => {
      const amount = parseFloat(workerAmounts[workerId] || '0');
      return sum + amount;
    }, 0);
  };

  const getRemainingAmount = () => {
    const totalAmount = calculateEarnings();
    const assigned = getTotalAssignedAmount();
    return Math.max(0, totalAmount - assigned);
  };

  const isWorkerAssignmentValid = () => {
    if (selectedWorkers.length === 0) return true; // No workers selected is valid
    
    const totalAmount = calculateEarnings();
    const assignedAmount = getTotalAssignedAmount();
    
    // Check if total is fully distributed
    if (assignedAmount !== totalAmount) return false;
    
    // Check if all workers have amounts assigned
    for (const workerId of selectedWorkers) {
      const amount = parseFloat(workerAmounts[workerId] || '0');
      if (amount === 0) return false;
    }
    
    return true;
  };

  const handleDeletePlannedWork = async () => {
    if (!editingWorkDayId) return;

    if (!confirm("Ви впевнені, що хочете видалити цей запланований запис?")) {
      return;
    }

    try {
      await api.deleteWorkDay(editingWorkDayId);
      toast.success("Запис видалено");
      navigate("/");
    } catch (error) {
      toast.error("Помилка видалення запису");
      console.error(error);
    }
  };

  const handleSaveNote = async () => {
    if (!editingWorkDayId) return;

    try {
      await api.updateWorkDay(editingWorkDayId, {
        note: workNote ? workNote : null
      });
      toast.success("Нотатку збережено", { duration: 2000 });
    } catch (error) {
      toast.error("Помилка збереження нотатки");
      console.error("Error saving note:", error);
    }
  };

  const handlePlanWork = async () => {
    if (!selectedClientId) {
      toast.error("Оберіть клієнта");
      return;
    }

    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;

    // Create a planned work day with minimal data
    const workDays: WorkDay[] = [{
      id: `new-${Date.now()}`,
      date: reportDate,
      hours: 0,
      amount: 0,
      paymentStatus: "unpaid",
      day_paid_amount: 0,
      is_planned: true,
      note: workNote || undefined
    }];

    try {
      await api.addReport({
        clientId: selectedClientId,
        clientName: client.name,
        date: reportDate,
        status: "in_progress",
        paymentStatus: "unpaid",
        totalHours: 0,
        totalEarned: 0,
        paidAmount: 0,
        remainingAmount: 0,
        workDays,
      });

      toast.success("Роботу заплановано");
      navigate("/");
    } catch (error) {
      toast.error("Помилка планування роботи");
      console.error(error);
    }
  };

  const handleCreateReport = async () => {
    if (!selectedClientId) {
      toast.error("Оберіть клієнта");
      return;
    }

    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;

    // If editing an existing planned work day, update it instead of creating new
    if (editingWorkDayId && editingReportId) {
      try {
        let finalHours: number;

        if (amountInput && amountManuallyEntered) {
          const amount = parseFloat(amountInput);
          const rate = getClientHourlyRate();
          if (!isNaN(amount) && rate > 0) {
            finalHours = amount / rate;
          } else {
            finalHours = hours + (minutes / 60);
          }
        } else {
          finalHours = hours + (minutes / 60);
        }

        const hourlyRate = getClientHourlyRate();
        const amount = finalHours * hourlyRate;

        // Update the work day to convert from planned to normal
        await api.updateWorkDay(editingWorkDayId, {
          hours: finalHours,
          amount,
          payment_status: workPaymentStatus,
          day_paid_amount: workPaymentStatus === "partial" ? parseFloat(partialAmount) || 0 :
                           workPaymentStatus === "paid" ? amount : 0,
          is_planned: false,
          note: workNote || undefined
        });

        // Delete old assignments
        await api.deleteWorkDayAssignmentsByWorkDay(editingWorkDayId);

        // Create worker assignments
        if (selectedWorkers.length > 0) {
          // User manually selected workers - use their assignments
          for (const workerId of selectedWorkers) {
            const assignedAmount = parseFloat(workerAmounts[workerId] || '0');
            const assignedHours = assignedAmount / getClientHourlyRate();

            await api.addWorkDayAssignment({
              work_day_id: editingWorkDayId,
              worker_id: workerId,
              amount: assignedAmount,
              hours: assignedHours
            });
          }
        } else {
          // No workers selected - assign to primary worker automatically
          const primaryWorker = workers.find(w => w.is_primary || w.isPrimary);
          if (primaryWorker) {
            await api.addWorkDayAssignment({
              work_day_id: editingWorkDayId,
              worker_id: primaryWorker.id,
              amount: amount,
              hours: finalHours
            });
          }
        }

        toast.success("Запис оновлено", { duration: 2000 });
        navigate("/");
        return;
      } catch (error) {
        toast.error('Помилка оновлення запису');
        console.error(error);
        return;
      }
    }

    // Validate partial payment amount
    if (workPaymentStatus === "partial" && partialAmount) {
      const calculatedEarnings = calculateEarnings();
      const partialAmountValue = parseFloat(partialAmount);

      if (partialAmountValue > calculatedEarnings) {
        toast.error(`Сума не може бути більшою за ${calculatedEarnings}€`);
        return;
      }
    }

    // Validate worker assignments
    if (selectedWorkers.length > 0) {
      const totalAmount = calculateEarnings();
      const assignedAmount = getTotalAssignedAmount();
      
      if (assignedAmount > totalAmount) {
        toast.error(`Сума розподілу (${assignedAmount}€) перевищує загальну суму (${totalAmount}€)`);
        return;
      }
      
      // Check if all amounts are assigned
      if (assignedAmount !== totalAmount) {
        toast.error(`Розподіліть всю суму (${totalAmount}€). Залишок: ${totalAmount - assignedAmount}€`);
        return;
      }
      
      // Check if all selected workers have amounts
      for (const workerId of selectedWorkers) {
        const amount = parseFloat(workerAmounts[workerId] || '0');
        if (amount === 0) {
          const worker = workers.find(w => w.id === workerId);
          toast.error(`Введіть суму для ${worker?.name || 'працівника'}`);
          return;
        }
      }
    }

    const workDays: WorkDay[] = [];

    if (hours > 0 || minutes > 0) {
      let finalHours: number;
      
      if (amountInput && amountManuallyEntered) {
        const amount = parseFloat(amountInput);
        const rate = getClientHourlyRate();
        if (!isNaN(amount) && rate > 0) {
          finalHours = amount / rate;
        } else {
          finalHours = hours + (minutes / 60);
        }
      } else {
        finalHours = hours + (minutes / 60);
      }
      
      const hourlyRate = getClientHourlyRate();
      const amount = finalHours * hourlyRate;
      
      workDays.push({
        id: `new-${Date.now()}`,
        date: reportDate,
        hours: finalHours,
        amount,
        paymentStatus: workPaymentStatus,
        day_paid_amount: workPaymentStatus === "partial" ? parseFloat(partialAmount) || 0 :
                         workPaymentStatus === "paid" ? amount : 0,
        is_planned: isPlanned,
        note: workNote || undefined
      });
    }

    const totalHours = workDays.reduce((sum, day) => sum + day.hours, 0);
    const totalEarned = workDays.reduce((sum, day) => sum + day.amount, 0);
    const paidDays = workDays.filter((d) => d.paymentStatus === "paid");
    const paidAmount = paidDays.reduce((sum, day) => sum + day.amount, 0);
    
    // Add partial payments
    const partialDays = workDays.filter((d) => d.paymentStatus === "partial");
    const partialAmountTotal = partialDays.reduce((sum, day) => sum + (day.day_paid_amount || 0), 0);
    
    const totalPaidAmount = paidAmount + partialAmountTotal;

    let reportPaymentStatus: PaymentStatus = "unpaid";
    if (totalPaidAmount === totalEarned && totalEarned > 0) {
      reportPaymentStatus = "paid";
    } else if (totalPaidAmount > 0) {
      reportPaymentStatus = "partial";
    }

    try {
      const newReport = await api.addReport({
        clientId: client.id,
        clientName: client.name,
        date: reportDate,
        status: "in_progress",
        paymentStatus: reportPaymentStatus,
        totalHours,
        totalEarned,
        paidAmount: totalPaidAmount,
        remainingAmount: totalEarned - totalPaidAmount,
        workDays,
      } as Omit<Report, 'id'>);

      // Create worker assignments
      // If no workers selected, assign to primary worker (Лідія)
      if (newReport.workDays && newReport.workDays.length > 0) {
        const workDayId = newReport.workDays[0].id; // Use real ID from API response

        if (selectedWorkers.length > 0) {
          // User manually selected workers - use their assignments
          for (const workerId of selectedWorkers) {
            const assignedAmount = parseFloat(workerAmounts[workerId] || '0');
            const assignedHours = assignedAmount / getClientHourlyRate();

            await api.addWorkDayAssignment({
              work_day_id: workDayId,
              worker_id: workerId,
              amount: assignedAmount,
              hours: assignedHours
            });
          }
        } else {
          // No workers selected - assign to primary worker automatically
          const primaryWorker = workers.find(w => w.is_primary || w.isPrimary);
          if (primaryWorker) {
            const totalAmount = calculateEarnings();
            const totalHoursDecimal = hours + (minutes / 60);

            await api.addWorkDayAssignment({
              work_day_id: workDayId,
              worker_id: primaryWorker.id,
              amount: totalAmount,
              hours: totalHoursDecimal
            });
          }
        }
      }

      toast.success("Звіт створено", { duration: 2000 });
      navigate(`/`);
    } catch (error) {
      toast.error('Помилка створення звіту');
      console.error(error);
    }
  };

  // Update amount when time changes (only if user is not editing the amount field)
  useEffect(() => {
    const rate = getClientHourlyRate();
    if (rate > 0 && !isAmountFocused) {
      const totalHours = hours + (minutes / 60);
      const calculatedAmount = Math.round(totalHours * rate);
      setAmountInput(calculatedAmount.toString());
    }
  }, [hours, minutes, customHourlyRate, selectedClientId, isAmountFocused]);

  // Initialize scroll positions when hours/minutes change (from amount input)
  useEffect(() => {
    if (hoursRef.current && minutesRef.current && amountManuallyEntered) {
      const itemHeight = 40;
      const hoursIndex = hoursArray.indexOf(hours);
      const minutesIndex = minutesArray.indexOf(minutes);

      if (hoursIndex !== -1 && minutesIndex !== -1) {
        hoursRef.current.scrollTop = hoursIndex * itemHeight;
        minutesRef.current.scrollTop = minutesIndex * itemHeight;
      }
    }
  }, [hours, minutes, amountManuallyEntered]);

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

  const handleScroll = useCallback((
    ref: React.RefObject<HTMLDivElement>,
    items: number[],
    setter: (value: number) => void,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
    scrollingFlag: 'hours' | 'minutes'
  ) => {
    if (!ref.current) return;

    const container = ref.current;
    const itemHeight = 40;
    const scrollTop = container.scrollTop;
    const centerIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(centerIndex, items.length - 1));

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set flag that we're scrolling
    isScrolling.current[scrollingFlag] = true;

    // Debounce the value update and snap
    timeoutRef.current = setTimeout(() => {
      if (!ref.current) return;

      // Update value
      setter(items[clampedIndex]);
      setAmountManuallyEntered(false);

      const targetScroll = clampedIndex * itemHeight;
      const currentScroll = ref.current.scrollTop;

      // Snap to center if needed
      if (Math.abs(currentScroll - targetScroll) > 2) {
        ref.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }

      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrolling.current[scrollingFlag] = false;
      }, 150);
    }, 150);
  }, []);

  const handleAmountChange = (newAmount: string) => {
    setAmountInput(newAmount);
    setAmountManuallyEntered(true);
    
    // Calculate and update time when amount is entered
    if (newAmount && !isNaN(parseFloat(newAmount))) {
      const amount = parseFloat(newAmount);
      const rate = getClientHourlyRate();
      
      if (rate > 0) {
        const totalHours = amount / rate;
        const h = Math.floor(totalHours);
        const m = Math.round((totalHours - h) * 60);
        
        // Round minutes to nearest 10
        const roundedMinutes = Math.round(m / 10) * 10;
        const adjustedHours = roundedMinutes >= 60 ? h + 1 : h;
        const adjustedMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;
        
        setHours(Math.min(adjustedHours, 23));
        setMinutes(adjustedMinutes);
      }
    }
  };

  const handleAmountFocus = () => {
    setIsAmountFocused(true);
    setAmountInput("");
  };

  const handleAmountBlur = () => {
    setIsAmountFocused(false);
    const rate = getClientHourlyRate();
    if (!amountInput && rate > 0) {
      const totalHours = hours + (minutes / 60);
      const calculatedAmount = Math.round(totalHours * rate);
      setAmountInput(calculatedAmount.toString());
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="min-h-screen bg-background pb-20 pt-4">
      {/* Fixed top section with client info - Compact */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-sm">
        <div className="container mx-auto px-4 py-2.5">
          <h1 className="text-lg font-bold text-foreground text-center">
            {selectedClient?.name || "Завантаження..."}
          </h1>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-20 pb-6 max-w-md">
        <div className="space-y-3">
          {/* Date Card - Compact */}
          <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 flex items-center justify-center flex-shrink-0 border border-green-200/60 dark:border-green-700/60">
                <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="flex-1 h-8 rounded-md border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium"
              />
            </div>
          </div>

          {/* Main Time & Rate Card - Redesigned for Mobile */}
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            {/* Time Picker Wheels - Full Width */}
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center justify-between px-2">
                {/* Hours Wheel */}
                <div className="relative flex-1">
                  <div className="relative h-[120px] w-full">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] border-y-2 border-primary/30 bg-primary/5 pointer-events-none z-10 rounded-md" />
                    <div
                      ref={hoursRef}
                      className="h-full overflow-y-auto scrollbar-hide"
                      onScroll={() => handleScroll(hoursRef, hoursArray, setHours, hoursScrollTimeout, 'hours')}
                      style={{
                        paddingTop: '40px',
                        paddingBottom: '40px',
                        scrollBehavior: 'auto'
                      }}
                    >
                      {hoursArray.map((hour) => (
                        <div
                          key={hour}
                          className="h-[40px] flex items-center justify-center text-lg font-bold transition-all duration-150"
                          style={{
                            opacity: hour === hours ? 1 : 0.25,
                            transform: hour === hours ? 'scale(1.05)' : 'scale(0.85)',
                          }}
                        >
                          {hour}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-2xl font-bold text-primary px-3">:</div>

                {/* Minutes Wheel */}
                <div className="relative flex-1">
                  <div className="relative h-[120px] w-full">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] border-y-2 border-primary/30 bg-primary/5 pointer-events-none z-10 rounded-md" />
                    <div
                      ref={minutesRef}
                      className="h-full overflow-y-auto scrollbar-hide"
                      onScroll={() => handleScroll(minutesRef, minutesArray, setMinutes, minutesScrollTimeout, 'minutes')}
                      style={{
                        paddingTop: '40px',
                        paddingBottom: '40px',
                        scrollBehavior: 'auto'
                      }}
                    >
                      {minutesArray.map((minute) => (
                        <div
                          key={minute}
                          className="h-[40px] flex items-center justify-center text-lg font-bold transition-all duration-150"
                          style={{
                            opacity: minute === minutes ? 1 : 0.25,
                            transform: minute === minutes ? 'scale(1.05)' : 'scale(0.85)',
                          }}
                        >
                          {minute.toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount & Rate - One Line Below */}
            <div className="p-3">
              <div className="flex gap-3">
                {/* Amount Input - Left (2/3 width) */}
                {selectedClientId && getClientHourlyRate() > 0 && (
                  <div className="flex-[2] flex flex-col">
                    <div className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide text-center">
                      Сума
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        value={amountInput}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        onFocus={handleAmountFocus}
                        onBlur={handleAmountBlur}
                        placeholder=""
                        className="h-10 text-center text-base font-bold rounded-md pr-7"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Rate Input - Right (1/3 width) */}
                <div className="flex-1 flex flex-col">
                  <div className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide text-center">
                    Ставка
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      value={customHourlyRate}
                      onChange={(e) => setCustomHourlyRate(e.target.value)}
                      placeholder="0"
                      className="h-10 text-center text-base font-normal rounded-md pr-7"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                      <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Worker Assignment Button */}
          {(hours > 0 || minutes > 0) && selectedClientId && workers.length > 0 && (
            <button
              onClick={() => setWorkerDialogOpen(true)}
              className="w-full bg-card rounded-lg p-3 shadow-sm border border-border hover:border-green-500/50 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <span className="text-sm font-bold">
                  {selectedWorkers.length > 0 
                    ? `Працівники (${selectedWorkers.length})` 
                    : 'Додати працівників'}
                </span>
              </div>
              {selectedWorkers.length > 0 && (
                <div className="flex -space-x-2">
                  {selectedWorkers.slice(0, 3).map(workerId => {
                    const worker = workers.find(w => w.id === workerId);
                    if (!worker) return null;
                    return (
                      <div
                        key={workerId}
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                        style={{ backgroundColor: worker.color }}
                      />
                    );
                  })}
                  {selectedWorkers.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold">
                      +{selectedWorkers.length - 3}
                    </div>
                  )}
                </div>
              )}
            </button>
          )}

          {/* Worker Assignment Dialog */}
          <WorkerAssignmentDialog
            open={workerDialogOpen}
            onOpenChange={setWorkerDialogOpen}
            workers={workers}
            selectedWorkers={selectedWorkers}
            workerAmounts={workerAmounts}
            totalAmount={calculateEarnings()}
            onWorkersChange={handleWorkersChange}
            onAddWorker={handleAddWorkerInDialog}
          />

          {/* Payment Status Selection - Compact */}
          {(hours > 0 || minutes > 0) && selectedClientId && (
            <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setWorkPaymentStatus("paid")}
                  className={`h-10 rounded-lg text-xs font-bold transition-all ${
                    workPaymentStatus === "paid"
                      ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-100 shadow-md border border-green-300/60 dark:border-green-600/60"
                      : "bg-green-50/30 dark:bg-green-950/20 text-green-600/60 dark:text-green-400/60 border border-green-200/30 dark:border-green-800/30"
                  }`}
                >
                  Оплачено
                </button>

                <button
                  onClick={() => setWorkPaymentStatus("unpaid")}
                  className={`h-10 rounded-lg text-xs font-bold transition-all ${
                    workPaymentStatus === "unpaid"
                      ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 text-red-800 dark:text-red-100 shadow-md border border-red-300/60 dark:border-red-600/60"
                      : "bg-red-50/30 dark:bg-red-950/20 text-red-600/60 dark:text-red-400/60 border border-red-200/30 dark:border-red-800/30"
                  }`}
                >
                  Не оплачено
                </button>

                <button
                  onClick={() => setWorkPaymentStatus("partial")}
                  className={`h-10 rounded-lg text-xs font-bold transition-all ${
                    workPaymentStatus === "partial"
                      ? "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 text-orange-800 dark:text-orange-100 shadow-md border border-orange-300/60 dark:border-orange-600/60"
                      : "bg-orange-50/30 dark:bg-orange-950/20 text-orange-600/60 dark:text-orange-400/60 border border-orange-200/30 dark:border-orange-800/30"
                  }`}
                >
                  Частково
                </button>
              </div>

              {workPaymentStatus === "partial" && (
                <div className="mt-2 relative">
                  <Input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Введіть суму"
                    className="h-9 pr-8 text-center font-medium rounded-md"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Euro className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note Field */}
          {selectedClientId && (
            <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Нотатка
                  </label>
                </div>
                {editingWorkDayId && (
                  <Button
                    onClick={handleSaveNote}
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <Save className="w-3 h-3" />
                    Зберегти
                  </Button>
                )}
              </div>
              <Textarea
                value={workNote}
                onChange={(e) => setWorkNote(e.target.value)}
                placeholder="Додайте коментар або нотатку..."
                className="min-h-[80px] text-sm resize-none rounded-md"
              />
            </div>
          )}

          {/* Показуємо або "Запланувати роботу" або "Створити запис" або "Видалити" */}
          {hours === 0 && minutes === 0 && (!amountInput || amountInput === "0") ? (
            editingWorkDayId ? (
              // Delete Button - коли редагуємо заплановану роботу без годин
              <Button
                variant="ghost"
                size="lg"
                onClick={handleDeletePlannedWork}
                className="w-full h-12 text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Видалити запис
              </Button>
            ) : (
              // Plan Work Button - коли створюємо нову без годин/сум
              <Button
                variant="outline"
                size="lg"
                onClick={handlePlanWork}
                className="w-full h-12 text-sm font-bold rounded-lg border-2 border-dashed border-orange-400 dark:border-orange-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 hover:border-orange-500 dark:hover:border-orange-400 text-orange-700 dark:text-orange-300 transition-all shadow-sm hover:shadow-md"
                disabled={!selectedClientId}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Запланувати роботу
              </Button>
            )
          ) : (
            // Create Button - коли є години/сума
            <div className="flex gap-2">
              {editingWorkDayId && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleDeletePlannedWork}
                  className="h-12 px-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="default"
                size="lg"
                onClick={handleCreateReport}
                className={`h-12 text-sm font-bold rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg hover:shadow-xl ${editingWorkDayId ? 'flex-1' : 'w-full'}`}
                disabled={
                  !selectedClientId ||
                  (hours === 0 && minutes === 0) ||
                  (workPaymentStatus === "partial" && !partialAmount) ||
                  (workPaymentStatus === "partial" && partialAmount && parseFloat(partialAmount) > calculateEarnings()) ||
                  !isWorkerAssignmentValid()
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                {editingWorkDayId ? "Зберегти запис" : "Створити запис"}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Home Button - floating at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="absolute inset-0 pointer-events-none" style={{ height: '200px' }}>
          <div
            className="absolute inset-0 backdrop-blur-xl"
            style={{
              maskImage: 'linear-gradient(to top, black 0%, black 30%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 0%, black 30%, transparent 100%)'
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 via-30% to-transparent"></div>
        </div>

        <div className="px-6 pb-6 relative pointer-events-auto">
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="flex flex-col items-center justify-center gap-[2px] h-[56px] rounded-full transition-all duration-150 active:scale-95 px-8 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_16px_0_rgba(31,38,135,0.15),0_8px_24px_0_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.045)' }}
            >
              <House className="w-[27px] h-[27px]" style={{ color: '#007AFF' }} strokeWidth={2.5} fill="currentColor" />
              <span
                className="text-[10.5px] font-medium tracking-[-0.01em]"
                style={{ color: '#007AFF' }}
              >
                Головна
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Hide scrollbar CSS */}
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
    </div>
  );
};

export default CreateReport;
