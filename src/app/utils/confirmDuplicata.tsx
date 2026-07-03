// Boîte de dialogue impérative (promesse) pour laisser un admin choisir, au
// moment du clic « télécharger le reçu », s'il veut la version AVEC ou SANS
// duplicata. Rendue à la volée via createRoot pour rester utilisable depuis
// n'importe quel handler sans modifier la mise en page des composants appelants.
//
// Résout :
//   true  -> télécharger avec duplicata
//   false -> télécharger sans duplicata
//   null  -> annulé (ne rien télécharger)

import { createRoot, type Root } from "react-dom/client";

type Lang = "fr" | "en";

const L: Record<Lang, {
    title: string; message: string; withDup: string; withoutDup: string; cancel: string;
}> = {
    fr: {
        title: "Télécharger le reçu",
        message: "Souhaitez-vous inclure le duplicata (deuxième exemplaire) ?",
        withDup: "Avec duplicata",
        withoutDup: "Sans duplicata",
        cancel: "Annuler",
    },
    en: {
        title: "Download receipt",
        message: "Do you want to include the duplicate (second copy)?",
        withDup: "With duplicate",
        withoutDup: "Without duplicate",
        cancel: "Cancel",
    },
};

function Dialog({ lang, onChoose }: { lang: Lang; onChoose: (v: boolean | null) => void }) {
    const t = L[lang];
    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => { if (e.target === e.currentTarget) onChoose(null); }}
            style={{
                position: "fixed", inset: 0, zIndex: 100000,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)",
                padding: "16px",
            }}
        >
            <div style={{
                width: "100%", maxWidth: "360px", background: "#ffffff",
                borderRadius: "14px", boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                overflow: "hidden", fontFamily: "Arial, sans-serif",
            }}>
                <div style={{ background: "#dc2626", color: "#fff", padding: "14px 18px", fontSize: "15px", fontWeight: 800 }}>
                    {t.title}
                </div>
                <div style={{ padding: "18px", color: "#334155", fontSize: "14px", lineHeight: 1.5 }}>
                    {t.message}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "0 18px 18px" }}>
                    <button
                        type="button"
                        onClick={() => onChoose(true)}
                        style={{
                            width: "100%", padding: "11px", borderRadius: "10px", border: "none",
                            background: "#dc2626", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                        }}
                    >
                        {t.withDup}
                    </button>
                    <button
                        type="button"
                        onClick={() => onChoose(false)}
                        style={{
                            width: "100%", padding: "11px", borderRadius: "10px",
                            border: "1.5px solid #dc2626", background: "#fff", color: "#dc2626",
                            fontSize: "14px", fontWeight: 700, cursor: "pointer",
                        }}
                    >
                        {t.withoutDup}
                    </button>
                    <button
                        type="button"
                        onClick={() => onChoose(null)}
                        style={{
                            width: "100%", padding: "9px", borderRadius: "10px", border: "none",
                            background: "transparent", color: "#64748b", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                        }}
                    >
                        {t.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function confirmDuplicata(lang: Lang = "fr"): Promise<boolean | null> {
    if (typeof window === "undefined") return Promise.resolve(null);
    return new Promise((resolve) => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        let root: Root | null = createRoot(host);

        const cleanup = (v: boolean | null) => {
            resolve(v);
            // Démonter hors du cycle d'événement React en cours.
            setTimeout(() => {
                root?.unmount();
                root = null;
                host.remove();
            }, 0);
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { document.removeEventListener("keydown", onKey); cleanup(null); }
        };
        document.addEventListener("keydown", onKey);

        root.render(
            <Dialog
                lang={lang}
                onChoose={(v) => { document.removeEventListener("keydown", onKey); cleanup(v); }}
            />,
        );
    });
}
