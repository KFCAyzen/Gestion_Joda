"use client";

import { QueryProvider } from "./lib/providers/query-provider";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PaymentConfigProvider } from "./context/PaymentConfigContext";
import { ReactNode } from 'react';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider>
            <QueryProvider>
                <AuthProvider>
                    <PaymentConfigProvider>
                        {children}
                    </PaymentConfigProvider>
                </AuthProvider>
            </QueryProvider>
        </ThemeProvider>
    );
}