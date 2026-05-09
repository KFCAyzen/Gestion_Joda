export const DEFAULT_PHONE_COUNTRY_CODE = "+237";

export const PHONE_COUNTRY_CODES = [
    { code: "+237", country: "Cameroun" },
    { code: "+236", country: "Centrafrique" },
    { code: "+235", country: "Tchad" },
    { code: "+240", country: "Guinée équatoriale" },
    { code: "+221", country: "Sénégal" },
    { code: "+225", country: "Côte d'Ivoire" },
    { code: "+226", country: "Burkina Faso" },
    { code: "+223", country: "Mali" },
    { code: "+224", country: "Guinée" },
    { code: "+227", country: "Niger" },
    { code: "+228", country: "Togo" },
    { code: "+229", country: "Bénin" },
    { code: "+233", country: "Ghana" },
    { code: "+234", country: "Nigeria" },
    { code: "+241", country: "Gabon" },
    { code: "+242", country: "Congo" },
    { code: "+243", country: "RDC" },
    { code: "+244", country: "Angola" },
    { code: "+250", country: "Rwanda" },
    { code: "+257", country: "Burundi" },
    { code: "+254", country: "Kenya" },
    { code: "+255", country: "Tanzanie" },
    { code: "+256", country: "Ouganda" },
    { code: "+251", country: "Éthiopie" },
    { code: "+252", country: "Somalie" },
    { code: "+253", country: "Djibouti" },
    { code: "+249", country: "Soudan" },
    { code: "+211", country: "Soudan du Sud" },
    { code: "+20", country: "Égypte" },
    { code: "+212", country: "Maroc" },
    { code: "+213", country: "Algérie" },
    { code: "+216", country: "Tunisie" },
    { code: "+218", country: "Libye" },
    { code: "+27", country: "Afrique du Sud" },
    { code: "+260", country: "Zambie" },
    { code: "+263", country: "Zimbabwe" },
    { code: "+261", country: "Madagascar" },
    { code: "+230", country: "Maurice" },
    { code: "+269", country: "Comores" },
    { code: "+33", country: "France" },
    { code: "+32", country: "Belgique" },
    { code: "+41", country: "Suisse" },
    { code: "+352", country: "Luxembourg" },
    { code: "+49", country: "Allemagne" },
    { code: "+34", country: "Espagne" },
    { code: "+39", country: "Italie" },
    { code: "+351", country: "Portugal" },
    { code: "+31", country: "Pays-Bas" },
    { code: "+44", country: "Royaume-Uni" },
    { code: "+353", country: "Irlande" },
    { code: "+43", country: "Autriche" },
    { code: "+46", country: "Suède" },
    { code: "+47", country: "Norvège" },
    { code: "+45", country: "Danemark" },
    { code: "+358", country: "Finlande" },
    { code: "+48", country: "Pologne" },
    { code: "+420", country: "Tchéquie" },
    { code: "+40", country: "Roumanie" },
    { code: "+30", country: "Grèce" },
    { code: "+90", country: "Turquie" },
    { code: "+7", country: "Russie" },
    { code: "+380", country: "Ukraine" },
    { code: "+1", country: "États-Unis" },
    { code: "+1", country: "Canada" },
    { code: "+52", country: "Mexique" },
    { code: "+55", country: "Brésil" },
    { code: "+54", country: "Argentine" },
    { code: "+56", country: "Chili" },
    { code: "+57", country: "Colombie" },
    { code: "+51", country: "Pérou" },
    { code: "+86", country: "Chine" },
    { code: "+852", country: "Hong Kong" },
    { code: "+853", country: "Macao" },
    { code: "+886", country: "Taïwan" },
    { code: "+81", country: "Japon" },
    { code: "+82", country: "Corée du Sud" },
    { code: "+91", country: "Inde" },
    { code: "+92", country: "Pakistan" },
    { code: "+880", country: "Bangladesh" },
    { code: "+62", country: "Indonésie" },
    { code: "+60", country: "Malaisie" },
    { code: "+65", country: "Singapour" },
    { code: "+66", country: "Thaïlande" },
    { code: "+84", country: "Vietnam" },
    { code: "+63", country: "Philippines" },
    { code: "+61", country: "Australie" },
    { code: "+64", country: "Nouvelle-Zélande" },
    { code: "+971", country: "Émirats arabes unis" },
    { code: "+966", country: "Arabie saoudite" },
    { code: "+974", country: "Qatar" },
    { code: "+965", country: "Koweït" },
    { code: "+972", country: "Israël" },
    { code: "+961", country: "Liban" },
];

export function normalizePhoneNumber(countryCode: string, localNumber: string) {
    const trimmed = localNumber.replace(/\s+/g, " ").trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("+")) return trimmed;
    return `${countryCode} ${trimmed}`;
}

export function splitPhoneNumber(value: string | null | undefined) {
    const phone = (value || "").trim();
    if (!phone) {
        return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, localNumber: "" };
    }

    const country = [...PHONE_COUNTRY_CODES]
        .sort((a, b) => b.code.length - a.code.length)
        .find((entry) => phone.startsWith(entry.code));

    if (!country) {
        return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, localNumber: phone };
    }

    return {
        countryCode: country.code,
        localNumber: phone.slice(country.code.length).trim(),
    };
}
