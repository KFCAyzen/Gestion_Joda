"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { createClient } from "../lib/supabase/client";
import {
    PaymentConfig,
    ServiceType,
    DEFAULT_PAYMENT_CONFIGS,
    getBourseServiceType,
} from "../types/payment-config";

interface PaymentConfigContextValue {
    configs: Record<ServiceType, PaymentConfig>;
    isLoading: boolean;
    getConfig: (serviceType: ServiceType) => PaymentConfig;
    getBourseConfig: (niveau?: string) => PaymentConfig;
    refresh: () => Promise<void>;
}

const PaymentConfigContext = createContext<PaymentConfigContextValue>({
    configs: DEFAULT_PAYMENT_CONFIGS,
    isLoading: false,
    getConfig: (t) => DEFAULT_PAYMENT_CONFIGS[t],
    getBourseConfig: (n) => DEFAULT_PAYMENT_CONFIGS[getBourseServiceType(n)],
    refresh: async () => {},
});

export function PaymentConfigProvider({ children }: { children: ReactNode }) {
    const supabase = createClient();
    const [configs, setConfigs] = useState<Record<ServiceType, PaymentConfig>>(DEFAULT_PAYMENT_CONFIGS);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("payment_config")
                .select("*");

            if (error) {
                if (process.env.NODE_ENV === "development") {
                    const msg = error.message ?? String(error);
                    if (
                        msg.includes("does not exist") ||
                        error.code === "PGRST205" ||
                        msg.includes("schema cache")
                    ) {
                        console.warn(
                            "[PaymentConfig] Table payment_config absente ou introuvable. Exécute migrations/add_payment_config.sql dans le SQL Editor Supabase.",
                            error,
                        );
                    } else {
                        console.warn("[PaymentConfig]", msg, error);
                    }
                }
                return;
            }
            if (!data) return;

            const merged = { ...DEFAULT_PAYMENT_CONFIGS };
            for (const row of data) {
                const st = row.service_type as ServiceType;
                if (merged[st]) {
                    merged[st] = {
                        ...merged[st],
                        ...row,
                        tranches: row.tranches ?? merged[st].tranches,
                    };
                }
            }
            setConfigs(merged);
        } catch {
            // Fallback silencieux sur les defaults
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => { load(); }, [load]);

    const getConfig = useCallback(
        (serviceType: ServiceType): PaymentConfig => configs[serviceType] ?? DEFAULT_PAYMENT_CONFIGS[serviceType],
        [configs]
    );

    const getBourseConfig = useCallback(
        (niveau?: string): PaymentConfig => getConfig(getBourseServiceType(niveau)),
        [getConfig]
    );

    return (
        <PaymentConfigContext.Provider value={{ configs, isLoading, getConfig, getBourseConfig, refresh: load }}>
            {children}
        </PaymentConfigContext.Provider>
    );
}

export function usePaymentConfig() {
    return useContext(PaymentConfigContext);
}
