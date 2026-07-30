"use client";

import { useEffect } from "react";
import { isChunkLoadError, tryReloadOnce } from "../lib/chunkRecovery";

/**
 * Filet de sécurité pour toutes les routes localisées (/rapport, /login, /etudiant,
 * l'espace d'administration…). Sans lui, une exception de rendu démonte l'arbre React
 * et l'utilisateur ne voit qu'une page blanche, sans message ni moyen de repartir.
 */
export default function LocaleError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Erreur de rendu:", error);
        if (isChunkLoadError(error)) tryReloadOnce();
    }, [error]);

    return (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-gray-50 p-5">
            <div className="w-full max-w-[380px] rounded-[14px] border border-zinc-200 bg-white p-6 text-center shadow-[0_4px_12px_-3px_rgba(16,16,20,0.08)]">
                <img src="/Logo.png" alt="Joda Company" className="mx-auto mb-5 h-7 w-auto object-contain" />

                <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-zinc-900">
                    La page n&apos;a pas pu s&apos;afficher
                </h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-500">
                    Une erreur inattendue s&apos;est produite. Réessayez — si l&apos;écran reste vide,
                    rechargez la page ou prévenez l&apos;administration.
                </p>

                {error.digest && (
                    <p className="mt-3 font-mono text-[11px] text-zinc-400">Réf. {error.digest}</p>
                )}

                <div className="mt-5 flex flex-col gap-2">
                    <button
                        onClick={reset}
                        className="h-11 w-full rounded-[10px] bg-red-600 text-[14px] font-semibold text-white transition-colors hover:bg-red-700"
                    >
                        Réessayer
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="h-11 w-full rounded-[10px] border border-zinc-200 bg-white text-[14px] font-semibold text-zinc-800 transition-colors hover:bg-gray-50"
                    >
                        Recharger la page
                    </button>
                </div>
            </div>
        </div>
    );
}
