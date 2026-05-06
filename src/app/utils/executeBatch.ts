/**
 * Exécute des opérations de manière séquentielle pour éviter les conflits d'écriture
 */
export async function executeBatch<T>(
  operations: (() => Promise<T>)[]
): Promise<T[]> {
  const results: T[] = [];
  
  for (const operation of operations) {
    const result = await operation();
    results.push(result);
  }
  
  return results;
}

/**
 * Exécute des opérations avec un délai entre chaque pour éviter la surcharge
 */
export async function executeBatchWithDelay<T>(
  operations: (() => Promise<T>)[],
  delayMs: number = 100
): Promise<T[]> {
  const results: T[] = [];
  
  for (const operation of operations) {
    const result = await operation();
    results.push(result);
    
    if (operations.indexOf(operation) < operations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
