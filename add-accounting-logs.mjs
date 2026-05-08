import fs from 'fs';

const filePath = 'src/app/components/AccountingPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ajouter l'import de logActivity
if (!content.includes('logActivity')) {
  content = content.replace(
    'import { useAuth } from "../context/AuthContext";',
    'import { useAuth } from "../context/AuthContext";\nimport { logActivity } from "../utils/activityLogger";'
  );
}

// 2. Modifier handleAddEntree pour ajouter .select() et le log
content = content.replace(
  /await supabase\.from\("entrees_comptables"\)\.insert\(\{[\s\S]*?\}\);/,
  `const { data } = await supabase.from("entrees_comptables").insert({

                montant: Number(newEntree.montant),
                description: newEntree.description,

                type: newEntree.type,
                date: newEntree.date,
                created_by: user?.id,

            }).select();

            // Log l'activité
            if (user && data && data[0]) {
                await logActivity(
                    user.id,
                    user.name,
                    user.role,
                    "accounting_entry",
                    "entrees_comptables",
                    data[0].id,
                    \`Entrée comptable: \${newEntree.description} - \${Number(newEntree.montant).toLocaleString('fr-FR')} FCFA\`,
                    { type: newEntree.type, montant: Number(newEntree.montant) }
                );
            }`
);

// 3. Modifier handleAddSortie pour ajouter .select() et le log
content = content.replace(
  /await supabase\.from\("sorties_comptables"\)\.insert\(\{[\s\S]*?\}\);/,
  `const { data } = await supabase.from("sorties_comptables").insert({

                montant: Number(newSortie.montant),
                description: newSortie.description,

                categorie: newSortie.categorie,
                date: newSortie.date,
                created_by: user?.id,

            }).select();

            // Log l'activité
            if (user && data && data[0]) {
                await logActivity(
                    user.id,
                    user.name,
                    user.role,
                    "accounting_expense",
                    "sorties_comptables",
                    data[0].id,
                    \`Sortie comptable: \${newSortie.description} - \${Number(newSortie.montant).toLocaleString('fr-FR')} FCFA\`,
                    { categorie: newSortie.categorie, montant: Number(newSortie.montant) }
                );
            }`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Logs d\'activité ajoutés dans AccountingPage.tsx');
