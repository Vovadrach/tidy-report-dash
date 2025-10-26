import { supabase } from './supabase';
import { Report, Client, WorkDay } from '@/types/report';

export const api = {
  // Clients
  getClients: async (): Promise<Client[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  addClient: async (client: Omit<Client, 'id'>): Promise<Client> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('clients')
      .insert([{ 
        name: client.name,
        hourly_rate: client.hourlyRate || client.hourly_rate,
        user_id: user.id 
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateClient: async (clientId: string, updates: Partial<Client>): Promise<Client> => {
    const updateData: Record<string, unknown> = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.hourlyRate) updateData.hourly_rate = updates.hourlyRate;
    if (updates.hourly_rate) updateData.hourly_rate = updates.hourly_rate;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteClient: async (clientId: string): Promise<void> => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) throw error;
  },

  // Reports
  getReports: async (): Promise<Report[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (reportsError) throw reportsError;

    const reportsWithWorkDays = await Promise.all(
      (reportsData || []).map(async (report) => {
        const { data: workDaysData, error: workDaysError } = await supabase
          .from('work_days')
          .select('*')
          .eq('report_id', report.id)
          .order('date', { ascending: true });

        if (workDaysError) throw workDaysError;

        return {
          ...report,
          workDays: workDaysData || [],
        };
      })
    );

    return reportsWithWorkDays;
  },

  addReport: async (report: Omit<Report, 'id'>): Promise<Report> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { workDays, ...reportData } = report;

    const reportToInsert = {
      user_id: user.id,
      client_id: reportData.clientId || reportData.client_id,
      client_name: reportData.clientName || reportData.client_name,
      date: reportData.date,
      status: reportData.status,
      payment_status: reportData.paymentStatus || reportData.payment_status,
      total_hours: reportData.totalHours || reportData.total_hours || 0,
      total_earned: reportData.totalEarned || reportData.total_earned || 0,
      paid_amount: reportData.paidAmount || reportData.paid_amount || 0,
      remaining_amount: reportData.remainingAmount || reportData.remaining_amount || 0,
    };

    const { data: newReport, error: reportError } = await supabase
      .from('reports')
      .insert([reportToInsert])
      .select()
      .single();

    if (reportError) throw reportError;

    if (workDays && workDays.length > 0) {
      const workDaysToInsert = workDays.map(day => ({
        report_id: newReport.id,
        date: day.date,
        hours: day.hours,
        amount: day.amount,
        payment_status: day.paymentStatus || day.payment_status || 'unpaid',
        note: day.note || null,
        day_paid_amount: day.day_paid_amount || 0,
      }));

      const { data: newWorkDays, error: workDaysError } = await supabase
        .from('work_days')
        .insert(workDaysToInsert)
        .select();

      if (workDaysError) throw workDaysError;

      return { ...newReport, workDays: newWorkDays || [] };
    }

    return { ...newReport, workDays: [] };
  },

  updateReport: async (reportId: string, updates: Partial<Report>): Promise<Report> => {
    const { workDays, ...reportUpdates } = updates;

    const updateData: Record<string, unknown> = {};
    if (reportUpdates.clientId) updateData.client_id = reportUpdates.clientId;
    if (reportUpdates.client_id) updateData.client_id = reportUpdates.client_id;
    if (reportUpdates.clientName) updateData.client_name = reportUpdates.clientName;
    if (reportUpdates.client_name) updateData.client_name = reportUpdates.client_name;
    if (reportUpdates.date) updateData.date = reportUpdates.date;
    if (reportUpdates.status) updateData.status = reportUpdates.status;
    if (reportUpdates.paymentStatus) updateData.payment_status = reportUpdates.paymentStatus;
    if (reportUpdates.payment_status) updateData.payment_status = reportUpdates.payment_status;
    if (reportUpdates.totalHours !== undefined) updateData.total_hours = reportUpdates.totalHours;
    if (reportUpdates.total_hours !== undefined) updateData.total_hours = reportUpdates.total_hours;
    if (reportUpdates.totalEarned !== undefined) updateData.total_earned = reportUpdates.totalEarned;
    if (reportUpdates.total_earned !== undefined) updateData.total_earned = reportUpdates.total_earned;
    if (reportUpdates.paidAmount !== undefined) updateData.paid_amount = reportUpdates.paidAmount;
    if (reportUpdates.paid_amount !== undefined) updateData.paid_amount = reportUpdates.paid_amount;
    if (reportUpdates.remainingAmount !== undefined) updateData.remaining_amount = reportUpdates.remainingAmount;
    if (reportUpdates.remaining_amount !== undefined) updateData.remaining_amount = reportUpdates.remaining_amount;

    const { data: updatedReport, error: reportError } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single();

    if (reportError) throw reportError;

    if (workDays) {
      for (const workDay of workDays) {
        if (workDay.id.startsWith('new-')) {
          await supabase
            .from('work_days')
            .insert([{ 
              report_id: reportId,
              date: workDay.date,
              hours: workDay.hours,
              amount: workDay.amount,
              payment_status: workDay.paymentStatus || workDay.payment_status || 'unpaid',
              note: workDay.note || null,
              day_paid_amount: workDay.day_paid_amount || 0,
            }]);
        } else {
          const updateWorkDayData: Record<string, unknown> = {};
          if (workDay.date) updateWorkDayData.date = workDay.date;
          if (workDay.hours !== undefined) updateWorkDayData.hours = workDay.hours;
          if (workDay.amount !== undefined) updateWorkDayData.amount = workDay.amount;
          if (workDay.paymentStatus) updateWorkDayData.payment_status = workDay.paymentStatus;
          if (workDay.payment_status) updateWorkDayData.payment_status = workDay.payment_status;
          if (workDay.note !== undefined) updateWorkDayData.note = workDay.note;
          if (workDay.day_paid_amount !== undefined) updateWorkDayData.day_paid_amount = workDay.day_paid_amount;

          await supabase
            .from('work_days')
            .update(updateWorkDayData)
            .eq('id', workDay.id);
        }
      }
    }

    const { data: workDaysData } = await supabase
      .from('work_days')
      .select('*')
      .eq('report_id', reportId);

    return { ...updatedReport, workDays: workDaysData || [] };
  },

  deleteReport: async (reportId: string): Promise<void> => {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
  },

  // Work Days
  getWorkDay: async (reportId: string, dayId: string): Promise<WorkDay | null> => {
    const { data, error } = await supabase
      .from('work_days')
      .select('*')
      .eq('report_id', reportId)
      .eq('id', dayId)
      .single();

    if (error) throw error;
    return data;
  },

  updateWorkDay: async (dayId: string, updates: Partial<WorkDay>): Promise<WorkDay> => {
    const updateData: Record<string, unknown> = {};
    if (updates.date) updateData.date = updates.date;
    if (updates.hours !== undefined) updateData.hours = updates.hours;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.paymentStatus) updateData.payment_status = updates.paymentStatus;
    if (updates.payment_status) updateData.payment_status = updates.payment_status;
    if (updates.note !== undefined) updateData.note = updates.note;
    if (updates.day_paid_amount !== undefined) updateData.day_paid_amount = updates.day_paid_amount;

    const { data, error } = await supabase
      .from('work_days')
      .update(updateData)
      .eq('id', dayId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteWorkDay: async (dayId: string): Promise<void> => {
    const { error } = await supabase
      .from('work_days')
      .delete()
      .eq('id', dayId);

    if (error) throw error;
  },

  getDayPaidAmount: async (dayId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('work_days')
      .select('day_paid_amount')
      .eq('id', dayId)
      .single();

    if (error) throw error;
    return data?.day_paid_amount || 0;
  },

  setDayPaidAmount: async (dayId: string, amount: number): Promise<void> => {
    const { error } = await supabase
      .from('work_days')
      .update({ day_paid_amount: amount })
      .eq('id', dayId);

    if (error) throw error;
  },
};
