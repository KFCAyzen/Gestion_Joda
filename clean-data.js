// Script pour nettoyer les données parasites
console.log('🧹 Nettoyage des données parasites...');

// Supprimer les clients fictifs
const clients = JSON.parse(localStorage.getItem('clients') || '[]');
const cleanClients = clients.filter(client => 
    !(client.name === 'Jean Dupont' && client.phone === '+237 690 123 456') &&
    !client.id?.startsWith('fictif_')
);
localStorage.setItem('clients', JSON.stringify(cleanClients));
console.log(`✅ Clients nettoyés: ${clients.length} → ${cleanClients.length}`);

// Supprimer les données de test générées
const bills = JSON.parse(localStorage.getItem('bills') || '[]');
const cleanBills = bills.filter(bill => !bill.id?.startsWith('test_'));
localStorage.setItem('bills', JSON.stringify(cleanBills));
console.log(`✅ Factures nettoyées: ${bills.length} → ${cleanBills.length}`);

const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
const cleanReservations = reservations.filter(res => !res.id?.startsWith('test_'));
localStorage.setItem('reservations', JSON.stringify(cleanReservations));
console.log(`✅ Réservations nettoyées: ${reservations.length} → ${cleanReservations.length}`);

// Vider le cache
localStorage.removeItem('dashboard_all');
localStorage.removeItem('dashboard_superadmin');
localStorage.removeItem('dashboard_admin');
localStorage.removeItem('dashboard_user');
console.log('✅ Cache dashboard vidé');

console.log('🎉 Nettoyage terminé !');