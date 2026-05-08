import fs from 'fs';
import path from 'path';

const files = [
  'src/app/(app)/layout.tsx',
  'src/app/components/ApplicationFeeManagement.tsx',
  'src/app/components/ApplicationManagement.tsx',
  'src/app/components/ChangePassword.tsx',
  'src/app/components/ChangePasswordModal.tsx',
  'src/app/components/CoursLangues.tsx',
  'src/app/components/DocumentManagement.tsx',
  'src/app/components/DocumentUpload.tsx',
  'src/app/components/DossierWorkflow.tsx',
  'src/app/components/NotificationsPage.tsx',
  'src/app/components/PaymentDashboard.tsx',
  'src/app/components/PaymentManagement.tsx',
  'src/app/components/ScholarshipDashboard.tsx',
  'src/app/components/ScholarshipFileManagement.tsx',
  'src/app/components/StorageMonitoring.tsx',
  'src/app/components/StudentManagement.tsx',
  'src/app/components/StudentNotifications.tsx',
  'src/app/components/StudentPortal.tsx',
  'src/app/components/UniversityManagement.tsx',
  'src/app/hooks/useSupabaseData.ts',
  'src/app/services/database.ts'
];

let totalFixed = 0;

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Remplacer l'import de l'ancien client
  content = content.replace(
    /import \{ supabase \} from ['"]\.\.\/supabase['"]/g,
    'import { createClient } from "../lib/supabase/client"'
  );

  // Pour les composants, ajouter const supabase = createClient() après useAuth
  if (filePath.includes('components/') && content.includes('useAuth()')) {
    // Vérifier si createClient() n'est pas déjà présent
    if (!content.includes('const supabase = createClient()')) {
      content = content.replace(
        /(const \{ user \} = useAuth\(\);)/g,
        '$1\n    const supabase = createClient();'
      );
    }
  }

  // Pour les hooks et services, créer une instance dans chaque fonction
  if (filePath.includes('hooks/') || filePath.includes('services/')) {
    // Marquer pour révision manuelle
    console.log(`⚠️  Révision manuelle nécessaire: ${filePath}`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Corrigé: ${filePath}`);
    totalFixed++;
  } else {
    console.log(`⏭️  Aucun changement: ${filePath}`);
  }
});

console.log(`\n📊 Total de fichiers corrigés: ${totalFixed}/${files.length}`);
