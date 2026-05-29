export type NotificationType = "success" | "error" | "info" | "warning";

export interface NotificationPayload {
    title?: string;
    message: string;
    type?: NotificationType;
}

type FriendlyErrorOptions = {
    fallback?: string;
};

const cleanMessage = (value: string) => value.replace(/\s+/g, " ").trim();

const pickMessage = (error: unknown) => {
    if (typeof error === "string") {
        return cleanMessage(error);
    }

    if (error && typeof error === "object") {
        if ("message" in error && typeof error.message === "string") {
            return cleanMessage(error.message);
        }

        if ("error_description" in error && typeof error.error_description === "string") {
            return cleanMessage(error.error_description);
        }
    }

    return "";
};

export function getFriendlyErrorMessage(error: unknown, options?: FriendlyErrorOptions) {
    const fallback = options?.fallback || "Une erreur est survenue. Réessayez dans un instant.";
    const message = pickMessage(error).toLowerCase();

    if (!message) {
        return fallback;
    }

    if (message.includes("invalid login credentials")) {
        return "Identifiants incorrects. Vérifiez votre email ou votre mot de passe puis réessayez.";
    }

    if (message.includes("email not confirmed")) {
        return "Ce compte n'est pas encore activé. Contactez l'administration si le compte vient d'être créé.";
    }

    if (message.includes("duplicate key") || message.includes("already exists") || message.includes("unique constraint")) {
        return "Cette donnée existe déjà dans le système. Vérifiez les doublons avant de réessayer.";
    }

    if (message.includes("row-level security") || message.includes("permission denied") || message.includes("not authorized")) {
        return "Vous n'avez pas l'autorisation nécessaire pour effectuer cette action.";
    }

    if (message.includes("jwt") || message.includes("refresh token") || message.includes("session")) {
        return "Votre session n'est plus valide. Reconnectez-vous puis recommencez.";
    }

    if (message.includes("network") || message.includes("failed to fetch") || message.includes("fetch failed")) {
        return "Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.";
    }

    if (message.includes("foreign key")) {
        return "Cette action est bloquée car des éléments liés existent déjà dans la base.";
    }

    if (message.includes("null value") || message.includes("violates not-null")) {
        return "Certaines informations obligatoires sont manquantes. Complétez le formulaire puis réessayez.";
    }

    if (message.includes("too many requests") || message.includes("rate limit")) {
        return "Trop de tentatives en peu de temps. Attendez un moment avant de recommencer.";
    }

    if (
        message.includes("should be different from the old password") ||
        message.includes("new password should be different") ||
        message.includes("same as the old password")
    ) {
        return "Le nouveau mot de passe doit être différent de l'ancien. Choisissez-en un autre.";
    }

    if (message.includes("weak password") || message.includes("compromised password") || message.includes("pwned")) {
        return "Ce mot de passe est trop faible ou a été compromis. Choisissez-en un plus robuste.";
    }

    if (
        message.includes("password should be at least") ||
        message.includes("password is too short") ||
        (message.includes("password") && message.includes("characters"))
    ) {
        return "Le mot de passe est trop court. Utilisez au moins 8 caractères.";
    }

    if (message.includes("password")) {
        return "Le mot de passe n'a pas pu être modifié. Vérifiez vos informations puis réessayez.";
    }

    return fallback;
}

export function buildNotification(input: string | NotificationPayload, fallbackType: NotificationType = "info") {
    if (typeof input === "string") {
        return {
            message: input,
            type: fallbackType,
        };
    }

    return {
        title: input.title,
        message: input.message,
        type: input.type || fallbackType,
    };
}
