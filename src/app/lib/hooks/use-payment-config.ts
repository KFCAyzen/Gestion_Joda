import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type { PaymentConfig, ServiceType } from '../schemas/payment-config.schema';
import { paymentConfigSchema } from '../schemas/payment-config.schema';

const supabase = createClient();

export const PAYMENT_CONFIG_KEY = ['payment_config'];

export function usePaymentConfigs() {
  return useQuery({
    queryKey: PAYMENT_CONFIG_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_config').select('*');
      if (error) throw error;
      return data as PaymentConfig[];
    },
  });
}

export function useUpsertPaymentConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: PaymentConfig) => {
      const parsed = paymentConfigSchema.parse(config);
      const { data, error } = await supabase
        .from('payment_config')
        .upsert(parsed, { onConflict: 'service_type' })
        .select()
        .single();
      if (error) throw error;
      return data as PaymentConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_CONFIG_KEY });
    },
  });
}
