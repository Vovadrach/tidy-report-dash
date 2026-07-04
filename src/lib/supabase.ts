import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://mtvhfmvlfgespkiorxvg.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_d78hpHRGXeNsCaKOj6WkRw_OGBp0LTt';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          hourly_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          hourly_rate: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          hourly_rate?: number;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          client_name: string;
          date: string;
          status: string;
          payment_status: string;
          total_hours: number;
          total_earned: number;
          paid_amount: number;
          remaining_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          client_name: string;
          date: string;
          status: string;
          payment_status: string;
          total_hours: number;
          total_earned: number;
          paid_amount: number;
          remaining_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          client_name?: string;
          date?: string;
          status?: string;
          payment_status?: string;
          total_hours?: number;
          total_earned?: number;
          paid_amount?: number;
          remaining_amount?: number;
          created_at?: string;
        };
      };
      work_days: {
        Row: {
          id: string;
          report_id: string;
          date: string;
          hours: number;
          amount: number;
          payment_status: string;
          note: string | null;
          day_paid_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          date: string;
          hours: number;
          amount: number;
          payment_status: string;
          note?: string | null;
          day_paid_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          date?: string;
          hours?: number;
          amount?: number;
          payment_status?: string;
          note?: string | null;
          day_paid_amount?: number;
          created_at?: string;
        };
      };
    };
  };
};
