import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type {
  Employee,
  LeaveRequest,
  Payslip,
  DailyReport,
} from '../../types/hr';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
  createPayslipSchema,
  updatePayslipSchema,
  createDailyReportSchema,
  updateDailyReportSchema,
  type EmployeeInput,
  type EmployeeUpdate,
  type LeaveRequestInput,
  type LeaveReviewInput,
  type PayslipInput,
  type PayslipUpdate,
  type DailyReportInput,
  type DailyReportUpdate,
} from '../schemas/hr.schema';

const supabase = createClient();

export const EMPLOYEES_KEY = ['hr', 'employees'] as const;
export const LEAVE_REQUESTS_KEY = ['hr', 'leave_requests'] as const;
export const PAYSLIPS_KEY = ['hr', 'payslips'] as const;
export const DAILY_REPORTS_KEY = ['hr', 'daily_reports'] as const;

// ─── Employees ─────────────────────────────────────────────────────────────
export function useEmployees() {
  return useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('nom', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeInput) => {
      const parsed = createEmployeeSchema.parse(input);
      const payload = { ...parsed, email: parsed.email || null };
      const { data, error } = await supabase
        .from('employees')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeUpdate }) => {
      const parsed = updateEmployeeSchema.parse(data);
      const { data: row, error } = await supabase
        .from('employees')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return row as Employee;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEES_KEY });
      qc.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY });
      qc.invalidateQueries({ queryKey: PAYSLIPS_KEY });
      qc.invalidateQueries({ queryKey: DAILY_REPORTS_KEY });
    },
  });
}

// ─── Leave requests ────────────────────────────────────────────────────────
export function useLeaveRequests() {
  return useQuery({
    queryKey: LEAVE_REQUESTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeaveRequest[];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeaveRequestInput) => {
      const parsed = createLeaveRequestSchema.parse(input);
      const { data, error } = await supabase
        .from('leave_requests')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return data as LeaveRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY }),
  });
}

export function useReviewLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reviewerId,
      data,
    }: {
      id: string;
      reviewerId: string;
      data: LeaveReviewInput;
    }) => {
      const parsed = reviewLeaveRequestSchema.parse(data);
      const { data: row, error } = await supabase
        .from('leave_requests')
        .update({
          ...parsed,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return row as LeaveRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY }),
  });
}

export function useDeleteLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY }),
  });
}

// ─── Payslips ──────────────────────────────────────────────────────────────
export function usePayslips() {
  return useQuery({
    queryKey: PAYSLIPS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .order('annee', { ascending: false })
        .order('mois', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payslip[];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreatePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PayslipInput) => {
      const parsed = createPayslipSchema.parse(input);
      const { data, error } = await supabase
        .from('payslips')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return data as Payslip;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYSLIPS_KEY });
      qc.invalidateQueries({ queryKey: ['sorties_comptables'] });
    },
  });
}

export function useUpdatePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PayslipUpdate }) => {
      const parsed = updatePayslipSchema.parse(data);
      const { data: row, error } = await supabase
        .from('payslips')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return row as Payslip;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYSLIPS_KEY }),
  });
}

export function useDeletePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payslips').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYSLIPS_KEY });
      qc.invalidateQueries({ queryKey: ['sorties_comptables'] });
    },
  });
}

// ─── Daily reports ─────────────────────────────────────────────────────────
export function useDailyReports() {
  return useQuery({
    queryKey: DAILY_REPORTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DailyReport[];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DailyReportInput) => {
      const parsed = createDailyReportSchema.parse(input);
      const { data, error } = await supabase
        .from('daily_reports')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DAILY_REPORTS_KEY }),
  });
}

export function useUpdateDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: DailyReportUpdate;
    }) => {
      const parsed = updateDailyReportSchema.parse(data);
      const { data: row, error } = await supabase
        .from('daily_reports')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return row as DailyReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DAILY_REPORTS_KEY }),
  });
}

export function useDeleteDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DAILY_REPORTS_KEY }),
  });
}
