/**
 * Interprétation des dates renvoyées par Postgres.
 *
 * Une colonne `DATE` (ex. `entrees_comptables.date`) arrive sous la forme
 * `YYYY-MM-DD`, sans heure ni fuseau. `new Date("2026-08-04")` applique alors la
 * règle ISO et lit minuit **UTC** : à l'ouest de Greenwich, tout affichage local
 * recule d'un jour et l'écriture est datée de la veille.
 *
 * On reconstruit donc la date à partir de ses composants, ce qui la pose telle
 * quelle dans le fuseau du navigateur. Les horodatages complets (`timestamptz`,
 * qui portent leur propre décalage) restent traités par `new Date` sans
 * changement — pour eux la conversion en heure locale est justement voulue.
 */
export function parseDbDate(value: string): Date {
    const plainDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!plainDay) return new Date(value);
    return new Date(Number(plainDay[1]), Number(plainDay[2]) - 1, Number(plainDay[3]));
}
