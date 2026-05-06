/**
 * Utilitaire pour exécuter des opérations de base de données de manière séquentielle
 * pour éviter les erreurs de concurrence
 */

/**
 * Exécute une série d'opérations de manière séquentielle avec un délai entre chaque
 * @param operations - Tableau de fonctions async à exécuter
 * @param delayMs - Délai en millisecondes entre chaque opération (défaut: 50ms)
 */
export async function executeSequentially<T>(
    operations: (() => Promise<T>)[],
    delayMs: number = 50
): Promise<T[]> {
    const results: T[] = [];
    
    for (const operation of operations) {
        const result = await operation();
        results.push(result);
        
        // Petit délai pour éviter les conflits d'écriture
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    return results;
}

/**
 * Exécute des opérations par lots (batch) de manière séquentielle
 * @param items - Tableau d'éléments à traiter
 * @param operation - Fonction à exécuter pour chaque élément
 * @param batchSize - Taille de chaque lot (défaut: 5)
 * @param delayMs - Délai entre chaque lot (défaut: 100ms)
 */
export async function executeBatch<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    batchSize: number = 5,
    delayMs: number = 100
): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        for (const item of batch) {
            const result = await operation(item);
            results.push(result);
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        // Délai entre les lots
        if (i + batchSize < items.length && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    return results;
}

/**
 * Exécute une opération avec retry en cas d'échec
 * @param operation - Fonction à exécuter
 * @param maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @param delayMs - Délai entre chaque tentative (défaut: 200ms)
 */
export async function executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 200
): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            
            // Si c'est une erreur de concurrence, on attend avant de réessayer
            if (error instanceof Error && error.message.includes("write batch")) {
                await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
            } else {
                // Pour les autres erreurs, on lance immédiatement
                throw error;
            }
        }
    }
    
    throw lastError || new Error("Operation failed after retries");
}
