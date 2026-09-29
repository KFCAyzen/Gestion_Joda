"use client";

import { useState } from "react";
import LivreComptable from "../../../components/LivreComptable";
import BonsCaisse from "../../../components/BonsCaisse";

type Vue = "livre" | "bons";

export default function ComptabilitePage() {
    const [vue, setVue] = useState<Vue>("livre");

    // Chaque écran place le sélecteur dans son propre en-tête (ils occupent
    // toute la largeur, marges négatives comprises).
    const switcher = (
        <div className="inline-flex overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
            {([
                ["livre", "Livre comptable"],
                ["bons", "Bons de caisse"],
            ] as const).map(([id, label]) => (
                <button
                    key={id}
                    onClick={() => setVue(id)}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${
                        vue === id
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );

    return vue === "livre" ? <LivreComptable viewSwitcher={switcher} /> : <BonsCaisse viewSwitcher={switcher} />;
}
