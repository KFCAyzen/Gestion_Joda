"use client";

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // TODO: Envoyer à un service de monitoring (Sentry, etc.)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md">
            <div className="joda-surface rounded-2xl p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-red-100 p-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              
              <h1 className="mb-2 text-2xl font-bold text-slate-900">
                Une erreur est survenue
              </h1>
              
              <p className="mb-6 text-sm text-slate-600">
                Nous sommes désolés, une erreur inattendue s'est produite. 
                Veuillez réessayer ou contacter le support si le problème persiste.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 rounded-lg bg-slate-100 p-4 text-left">
                  <p className="mb-2 text-xs font-semibold text-slate-700">
                    Détails de l'erreur (dev only):
                  </p>
                  <pre className="overflow-auto text-xs text-red-600">
                    {this.state.error.message}
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Réessayer
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/tableau-de-bord'}
                  className="flex-1"
                >
                  Retour à l'accueil
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
