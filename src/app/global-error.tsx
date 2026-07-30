"use client";

import { useEffect } from "react";
import { isChunkLoadError, tryReloadOnce } from "./lib/chunkRecovery";

/**
 * Dernier recours : seul `global-error` intercepte les exceptions levées par le root
 * layout et les providers (thème, auth, React Query), qui sont au-dessus de toute
 * autre error boundary. Une erreur à ce niveau vidait jusqu'ici l'écran entièrement.
 *
 * Il remplace le root layout : styles en ligne, pour ne dépendre ni du CSS global
 * ni d'un contexte applicatif qui vient précisément d'échouer.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Erreur critique:", error);
        if (isChunkLoadError(error)) tryReloadOnce();
    }, [error]);

    return (
        <html lang="fr">
            <body style={{ margin: 0 }}>
                <div
                    style={{
                        minHeight: "100vh",
                        display: "grid",
                        placeItems: "center",
                        padding: 20,
                        background: "#f9fafb",
                        fontFamily:
                            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: 380,
                            padding: 24,
                            textAlign: "center",
                            background: "#fff",
                            border: "1px solid #e4e4e7",
                            borderRadius: 14,
                            boxShadow: "0 4px 12px -3px rgba(16,16,20,0.08)",
                        }}
                    >
                        <img
                            src="/Logo.png"
                            alt="Joda Company"
                            style={{ height: 28, width: "auto", margin: "0 auto 20px" }}
                        />

                        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: "#18181b" }}>
                            L&apos;application n&apos;a pas pu démarrer
                        </h1>
                        <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "#71717a" }}>
                            Une erreur inattendue s&apos;est produite. Rechargez la page — si le problème
                            persiste, prévenez l&apos;administration.
                        </p>

                        {error.digest && (
                            <p style={{ margin: "12px 0 0", fontSize: 11, color: "#a1a1aa", fontFamily: "monospace" }}>
                                Réf. {error.digest}
                            </p>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
                            <button
                                onClick={reset}
                                style={{
                                    height: 44,
                                    width: "100%",
                                    border: "none",
                                    borderRadius: 10,
                                    background: "#dc2626",
                                    color: "#fff",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Réessayer
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    height: 44,
                                    width: "100%",
                                    border: "1px solid #e4e4e7",
                                    borderRadius: 10,
                                    background: "#fff",
                                    color: "#27272a",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Recharger la page
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
