# Composants Réutilisables

Ce dossier contient tous les composants réutilisables de l'application.

## Import

```typescript
import { SearchBar, FilterSelect, PageHeader, StatsCard } from "@/app/components/shared";
```

## Composants disponibles

### SearchBar
Barre de recherche avec icône
```typescript
<SearchBar value={search} onChange={setSearch} placeholder="Rechercher..." />
```

### FilterSelect
Sélecteur de filtres dropdown
```typescript
<FilterSelect 
  label="Statut" 
  value={filter} 
  onChange={setFilter}
  options={[{ value: "active", label: "Active" }]}
/>
```

### ActionButtons
Boutons d'actions (Modifier/Supprimer)
```typescript
<ActionButtons 
  onEdit={() => {}} 
  onDelete={() => {}}
  showDelete={canDelete}
/>
```

### PageHeader
En-tête de page avec titre et actions
```typescript
<PageHeader 
  eyebrow="Section"
  title="Titre"
  description="Description"
  action={{ label: "Ajouter", onClick: () => {} }}
/>
```

### StatsCard
Carte de statistiques
```typescript
<StatsCard 
  label="Total"
  value={100}
  description="Éléments"
  icon={Users}
/>
```

### EmptyState
État vide avec message
```typescript
<EmptyState 
  icon={Inbox}
  title="Aucun élément"
  description="Ajoutez votre premier élément"
  action={{ label: "Ajouter", onClick: () => {} }}
/>
```

### DataTable
Tableau de données générique
```typescript
<DataTable 
  columns={columns}
  data={data}
  keyExtractor={(item) => item.id}
/>
```

### Modal
Modale réutilisable
```typescript
<Modal 
  isOpen={open}
  onClose={() => setOpen(false)}
  title="Titre"
  size="md"
>
  {children}
</Modal>
```

### ConfirmDialog
Dialogue de confirmation
```typescript
<ConfirmDialog 
  isOpen={open}
  onClose={() => setOpen(false)}
  onConfirm={() => {}}
  title="Confirmer"
  description="Êtes-vous sûr ?"
  variant="destructive"
/>
```

### FormField
Champ de formulaire
```typescript
<FormField 
  label="Nom"
  id="nom"
  value={value}
  onChange={setValue}
  required
/>
```

### StatusBadge
Badge de statut avec couleurs
```typescript
<StatusBadge status="active" />
```

### LoadingState
État de chargement
```typescript
<LoadingState message="Chargement..." size="md" />
```

### ErrorMessage
Message d'erreur/succès/info
```typescript
<ErrorMessage message="Erreur" type="error" />
```

### Pagination
Pagination avec navigation
```typescript
<Pagination 
  currentPage={page}
  totalPages={total}
  onPageChange={setPage}
/>
```
