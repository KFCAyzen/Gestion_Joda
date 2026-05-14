export async function fetchLogoBase64(): Promise<string | null> {
    try {
        const res = await fetch("/Logo.png");
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve("");
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}
