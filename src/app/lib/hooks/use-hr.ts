import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type {
  Employee,
  LeaveRequest,
  Payslip,
  DailyReport,
  DeductionRule,
  DeductionOccurrence,
  PaymentSchedule,
  EmployeePayConfig,
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
  createDeductionRuleSchema,
  updateDeductionRuleSchema,
  createDeductionOccurrenceSchema,
  updateDeductionOccurrenceSchema,
  createPaymentScheduleSchema,
  updatePaymentScheduleSchema,
  upsertEmployeePayConfigSchema,
  type EmployeeInput,
  type EmployeeUpdate,
  type LeaveRequestInput,
  type LeaveReviewInput,
  type PayslipInput,
  type PayslipUpdate,
  type DailyReportInput,
  type DailyReportUpdate,
  type DeductionRuleInput,
  type DeductionRuleUpdate,
  type DeductionOccurrenceInput,
  type DeductionOccurrenceUpdate,
  type PaymentScheduleInput,
  type PaymentScheduleUpdate,
  type EmployeePayConfigInput,
} from '../schemas/hr.schema';

const supabase = createClient();

export const EMPLOYEES_KEY = ['hr', 'employees'] as const;
export const LEAVE_REQUESTS_KEY = ['hr', 'leave_requests'] as const;
export const PAYSLIPS_KEY = ['hr', 'payslips'] as const;
export const DAILY_REPORTS_KEY = ['hr', 'daily_reports'] as const;
export const DEDUCTION_RULES_KEY = ['hr', 'deduction_rules'] as const;
export const DEDUCTION_OCC_KEY = ['hr', 'deduction_occurrences'] as const;
export const PAYMENT_SCHEDULES_KEY = ['hr', 'payment_schedules'] as const;
export const PAY_CONFIGS_KEY = ['hr', 'pay_configs'] as const;

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

// ─── Deduction rules ───────────────────────────────────────────────────────
export function useDeductionRules() {
  return useQuery({
    queryKey: DEDUCTION_RULES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_deduction_rules')
        .select('*')
        .order('label', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeductionRule[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDeductionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeductionRuleInput) => {
      const parsed = createDeductionRuleSchema.parse(input);
      const { data, error } = await supabase
        .from('hr_deduction_rules')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return data as DeductionRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DEDUCTION_RULES_KEY }),
  });
}

export function useUpdateDeductionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DeductionRuleUpdate }) => {
      const parsed = updateDeductionRuleSchema.parse(data);
      const { data: row, error } = await supabase
        .from('hr_deduction_rules')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return row as DeductionRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DEDUCTION_RULES_KEY }),
  });
}

export function useDeleteDeductionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_deduction_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DEDUCTION_RULES_KEY }),
  });
}

// ─── Deduction occurrences ────────────────────────────────────────────────
export function useDeductionOccurrences() {
  return useQuery({
    queryKey: DEDUCTION_OCC_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_deduction_occurrences')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeductionOccurrence[];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateDeductionOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeductionOccurrenceInput) => {
      const parsed = createDeductionOccurrenceSchema.parse(input);
      const { data, error } = await supabase
        .from('hr_deduction_occurrences')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return data as DeductionOccurrence;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DEDUCTION_OCC_KEY }),
  });
}

export function useUpdateDeductionOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DeductionOccurrenceUpdate }) => {
      const parsed = updateDeductionOccurrenceSchema.parse(data);
      const { data: row, error } = await supabase
        .from('hr_deduction_occurrences')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return row as DeductionOccurrence;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DEDUCTION_OCC_KEY }),
  });
}

export function useDeleteDeductionOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_deduction_occurrences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DEDUCTION_OCC_KEY }),
  });
}

// ─── Payment schedules ─────────────────────────────────────────────────────
export function usePaymentSchedules() {
  return useQuery({
    queryKey: PAYMENT_SCHEDULES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_payment_schedules')
        .select('*')
        .order('day_of_month', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PaymentSchedule[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePaymentSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentScheduleInput) => {
      const parsed = createPaymentScheduleSchema.parse(input);
      const payload = {
        ...parsed,
        target_department: parsed.scope === 'department' ? parsed.target_department : null,
        target_employee_id: parsed.scope === 'employee' ? parsed.target_employee_id : null,
      };
      const { data, error } = await supabase
        .from('hr_payment_schedules')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as PaymentSchedule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENT_SCHEDULES_KEY }),
  });
}

export function useUpdatePaymentSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PaymentScheduleUpdate }) => {
      const parsed = updatePaymentScheduleSchema.parse(data);
      const { data: row, error } = await supabase
        .from('hr_payment_schedules')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return row as PaymentSchedule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENT_SCHEDULES_KEY }),
  });
}

export function useDeletePaymentSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_payment_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENT_SCHEDULES_KEY }),
  });
}

// ─── Employee pay configs ─────────────────────────────────────────────────
export function useEmployeePayConfigs() {
  return useQuery({
    queryKey: PAY_CONFIGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employee_pay_config')
        .select('*');
      if (error) throw error;
      return (data ?? []) as EmployeePayConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertEmployeePayConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeePayConfigInput) => {
      const parsed = upsertEmployeePayConfigSchema.parse(input);
      const { data, error } = await supabase
        .from('hr_employee_pay_config')
        .upsert(parsed, { onConflict: 'employee_id' })
        .select()
        .single();
      if (error) throw error;
      return data as EmployeePayConfig;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PAY_CONFIGS_KEY }),
  });
}

// ─── Payslip generation (auto) ────────────────────────────────────────────
export function useGenerateDuePayslips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/hr/generate-payslips', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Génération échouée');
      return json as { generated: Array<{ payslip_id: string; employee_id: string; net_a_payer: number }> };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYSLIPS_KEY });
      qc.invalidateQueries({ queryKey: PAYMENT_SCHEDULES_KEY });
      qc.invalidateQueries({ queryKey: DEDUCTION_OCC_KEY });
      qc.invalidateQueries({ queryKey: ['sorties_comptables'] });
    },
  });
}
