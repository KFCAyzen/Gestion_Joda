# Handoff: Portail étudiant — refonte mobile premium

## Overview

Refonte de l'expérience **mobile** du portail étudiant Joda Company (étudiants candidats à
une bourse d'études en Chine). L'objectif : transformer l'actuel `StudentShell` mobile en une
expérience **premium, immersive et orientée action** — l'étudiant comprend en un coup d'œil
où en est son dossier, ce qu'il doit faire ensuite, et reste en lien direct avec son agent.

Cinq écrans sont livrés, correspondant aux 5 onglets de la navigation basse existante
(`BottomTabs.tsx`) :

| Onglet (existant) | Écran livré | Vue actuelle à remplacer |
|---|---|---|
| `dashboard` → **Accueil** | Anneau de progression + prochaine action | `StudentDashboard.tsx` |
| `dossier` → **Parcours** | Timeline voyage 6 jalons | `DossierRoadmap.tsx` |
| `documents` → **Documents** | Checklist upload 5/7 | `StudentDocumentsList.tsx` |
| `payments` → **Paiements** | Solde + échéancier | `StudentPaymentsList.tsx` |
| `messaging` → **Messages** | Chat avec l'agent | `StudentChatFull.tsx` |

> Note : la maquette renomme l'onglet « Dossier » en **« Parcours »** et place la roadmap
> comme onglet à part entière (au lieu d'une sous-section du dashboard). À confirmer côté produit.

---

## About the Design Files

Les fichiers de ce bundle sont des **références de design réalisées en HTML/React (Babel in-browser)**.
Ce sont des prototypes qui montrent l'apparence et le comportement attendus — **pas du code de production
à copier tel quel**.

La tâche est de **recréer ces designs dans le codebase existant** : c'est une app **Next.js (App Router) +
React 18 + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Supabase + next-intl**. Le portail
étudiant vit dans `src/app/components/student/`. Il faut donc :

- réutiliser les **composants existants** (`BottomTabs`, `StudentHeader`, `ActivityRings`, `DossierRoadmap`…) et les **faire évoluer**, plutôt que repartir de zéro ;
- brancher sur les **vraies données** (hooks TanStack Query : `usePayments`, `useStudents`, `useApplications`… + routes `/api/*`) ;
- respecter l'**i18n** (`next-intl`, clés sous `student.*`, FR/EN dans `src/messages/`) — aucun texte en dur ;
- conserver le **dark/light mode** déjà géré par les variables `--student-*` dans `globals.css`.

Les fichiers `.jsx` du bundle utilisent React inline (pas de TS, pas de Tailwind — du CSS custom dans `pm.css`).
Ne pas les porter littéralement : **en extraire les valeurs** (couleurs, espacements, géométrie des anneaux,
copy) et les réimplémenter en composants Tailwind/shadcn typés. `design-canvas.jsx` n'est qu'un échafaudage
de présentation (canvas pan/zoom) — **à ignorer totalement** côté implémentation.

---

## Fidelity

**Haute fidélité (hifi).** Couleurs, typographie, espacements, rayons, ombres et glows sont définitifs.
La cible est une recréation **pixel-perfect** au sein des conventions du codebase. Les seules libertés
attendues : substituer les icônes SVG inline par **lucide-react** (déjà utilisé — voir `BottomTabs.tsx`),
et brancher les données réelles à la place des données de démo.

---

## Design System / Tokens

Toutes les valeurs vivent dans `pm.css` (`:root`). Le codebase a déjà des variables `--student-*`
(dark mode `#050509` + radial crimson, glass surfaces, `--student-radius: 1.75rem`) : **cette maquette
en est la version aboutie**. Mapper de préférence sur les tokens existants, en ajustant leurs valeurs
vers celles ci-dessous.

### Couleurs

| Rôle | Hex | Usage |
|---|---|---|
| Fond base | `#100307` | base du dégradé |
| Fond profond | `#0c0205` → `#240709` | stops du dégradé d'ambiance |
| Crimson | `#ef4444` | accent primaire |
| Crimson vif | `#ff5a5f` | début des dégradés boutons / anneaux |
| Crimson profond | `#b91c1c` / `#d11a2a` / `#c81e2c` | fin des dégradés |
| Rose | `#fb7185` | avatar agent, dégradés |
| Mint (succès) | `#34d9a8` (deep `#0f8f6e`) | « reçu / payé / validé » |
| Ambre (à venir) | `#fbbf24` (deep `#b45309`) | échéances proches |
| Texte | `#ffffff` ; muted `rgba(255,255,255,.70 / .50 / .35)` | |

### Surfaces verre (glass)

```css
--glass:        rgba(255,255,255,.055);
--glass-2:      rgba(255,255,255,.085);
--glass-line:   rgba(255,255,255,.12);
--glass-line-2: rgba(255,255,255,.18);
--red-glass:    rgba(239,68,68,.13);
--red-line:     rgba(239,68,68,.32);
backdrop-filter: blur(24px) saturate(1.4);   /* --blur */
```
`.glass-strong` = `linear-gradient(150deg, rgba(255,255,255,.11), rgba(255,255,255,.04))` + bord `--glass-line-2`.

### Dégradé d'ambiance (fond de chaque écran — `.pm-bg`)
```css
background:
  radial-gradient(120% 80% at 12% -6%,  rgba(239,68,68,.42), transparent 46%),
  radial-gradient(110% 70% at 96% 8%,   rgba(190,18,60,.30), transparent 50%),
  radial-gradient(120% 90% at 60% 108%, rgba(127,29,29,.40), transparent 55%),
  linear-gradient(168deg, #240709 0%, #160409 44%, #0c0205 100%);
/* + grain : radial-gradient point .6px, taille 4px, opacity .025 */
```

### Rayons / Ombres
| Token | Valeur |
|---|---|
| `--r-xl` | `30px` (hero cards) |
| `--r-lg` | `22px` (cards) |
| `--r-md` | `16px` (rows) |
| `--r-sm` | `12px` |
| Ombre bouton primaire | `0 10px 30px rgba(239,68,68,.40), inset 0 1px 0 rgba(255,255,255,.3)` |
| Ombre tab bar | `0 18px 50px rgba(0,0,0,.5)` |
| Glow mint (barres/anneaux) | `0 0 14px rgba(52,217,168,.5)` |

### Typographie
- **Space Grotesk** (`--font-disp`) : chiffres, titres d'écran, grands montants. `font-variant-numeric: tabular-nums`, `letter-spacing: -0.02em`.
- **Inter** (`--font-ui`) : tout le reste. `letter-spacing: -0.01em`.
- Échelle : titre écran **25px / 600** ; grand montant **42px / 600** ; valeur anneau **32px / 600** ; titre card **15px / 650** ; corps **13.5px** ; meta **12px** ; eyebrow **10.5px / 700 / uppercase / tracking .18em / muted**.

### Espacements
Padding écran horizontal **18px**. Gaps entre cards **13–14px**, entre rows **8px**. Padding cards : hero `20px`, card standard `16px`, row `11–13px`.

---

## Composants transverses

### Phone shell (`.pm`, 390×844)
- Colonne flex : **StatusBar (50px)** → zone scrollable `.pm-scroll` (flex:1) → **TabBar**.
- Fond `.pm-bg` en couche absolue z-0 ; contenu z-1.
- En prod : c'est le viewport mobile réel. La StatusBar simulée est uniquement pour la maquette — **ne pas la recréer**.

### Bottom Tab Bar (`.pm-tabs`) — fait évoluer `BottomTabs.tsx`
- Barre **flottante** : `margin: 0 14px 14px`, `border-radius: 26px`, fond `rgba(20,5,8,.55)` + `blur(30px) saturate(1.5)`, bord `--glass-line`, ombre portée.
- 5 onglets. Onglet actif : icône dans une pastille **44×36 r13** avec dégradé `linear-gradient(135deg, rgba(255,90,95,.9), rgba(209,26,42,.85))` + ombre crimson + inset highlight. Label blanc. Inactif : `--ink-35`.
- Badge (messages non lus) : pastille `min 17px`, fond `#ff5a5f`, bord 2px `#1a0509`, position haut-droite. Ne s'affiche que si `count > 0`.
- Icônes lucide-react : `Home`, `Route`, `FileText` (ou `Upload`), `WalletCards`, `MessageSquare`. `safe-area-inset-bottom` déjà géré dans l'existant — à conserver.

### Header d'écran (`PHeader`)
Eyebrow (uppercase tracking) + titre 25px Space Grotesk, à gauche ; à droite : cloche (`BellBtn`, glass 44×44 r14, point rouge si non-lu) et/ou avatar 44px. Réutiliser/adapter `StudentHeader.tsx`.

### Anneau de progression (`Ring`) — fait évoluer `ActivityRings.tsx`
SVG, 2 cercles concentriques. Track `rgba(255,255,255,.08)`. Arc actif : `stroke` = **linearGradient** (`#ff5a5f`→`#d11a2a`), `stroke-linecap: round`, `stroke-dasharray = 2πr`, `dashoffset = c·(1 − pct/100)`, rotation `-90°`, **glow** via `feDropShadow stdDeviation=5 floodColor #ff5a5f opacity .55`. Texte centré en overlay absolu. `MiniRing` = même principe, 46–54px, stroke 5–6px, couleur unie selon métrique (mint/crimson/ambre).

### Avatar (`pav`)
Cercle, initiales, Space Grotesk 600. Agent (Solange) : `linear-gradient(135deg,#fb7185,#e11d2a)`. Étudiant (Marie) : `linear-gradient(135deg,#60a5fa,#2563eb)`.

### Chips (`.pchip`, h26 r999)
`live` (crimson + dot pulse), `done` (mint), `due` (ambre), `ghost` (verre). 11.5px / 600.

### Boutons (`.pbtn`)
- `primary` : dégradé `135deg #ff5a5f→#d11a2a`, h48 r16, ombre crimson + inset highlight, 14.5px / 650.
- `glass` : `rgba(255,255,255,.08)` + bord `--glass-line-2` + blur.
- `sm` : h38 r12.

### Animations
- `pm-pulse` (1.8s) : halo qui grandit/disparaît sous le point « live » (crimson ; variante mint).
- `pm-dot` (1.2s, délais 0/.18/.4s) : 3 points « en train d'écrire » du chat.
- Boutons/onglets : `transition .2s`. **Respecter `prefers-reduced-motion`.**

---

## Screens / Views

### 1. Accueil (`ScreenHome` — remplace `StudentDashboard` mobile)
**But** : statut global + prochaine action en un écran, sans scroll.
**Layout** (vertical, padding 18px) :
1. **Header** — eyebrow « Bonjour 👋 », titre prénom+nom, à droite cloche + avatar.
2. **Hero card** (`.glass-strong`, r30, padding 20px) :
   - Motif **avion en papier** en filigrane (coin haut-droit, `rgba(255,255,255,.05)`, ~130px) — issu du logo Joda.
   - Ligne : anneau 132px (pct = `completionRate`, ici **62 %**, label « Dossier ») + bloc texte (eyebrow « Destination », « Tsinghua » 21px, « Master Ingénierie · Bourse CSC », chip live « Étape 3 / 6 »).
   - **3 mini-cards** (grid 1fr×3) : MiniRing + valeur + label → Inscript. `5/5` (mint 100 %), Documents `5/8` (crimson 62 %), Échéance `1` (ambre).
3. **Carte « En cours »** (`.glass`, bord gauche 3px crimson) : avatar agent + eyebrow rouge « En cours · maintenant » + « Examen de ton dossier » + « Solange l'examine · maj il y a 27 min » + chevron → ouvre le chat.
4. **Carte « Prochaine échéance »** (flex:1) : « Cours mandarin · T3 », « Dû dans 18 jours · 30 nov » (ambre + clock), montant **121 000 FCFA** (Space Grotesk 23px) + bouton primaire pleine largeur **« Déclarer le paiement »**.

**Données** : `studentFile.completionRate`, `applications` (count + acceptées), prochaine tranche `payments` non payée la plus proche (date_limite), agent assigné. Montants via `fmtAmount` (FCFA / `$` selon `isIntl`).

### 2. Parcours (`ScreenParcours` — remplace/intègre `DossierRoadmap`)
**But** : visualiser l'avancement comme un voyage.
**Layout** :
1. Header eyebrow « Mon parcours vers » / titre « Tsinghua » + chip ghost « 🎓 CSC ».
2. **Barre voyage** (`.glass-strong`, r22) : « Bamako / Aujourd'hui » — ligne pointillée + **avion** (rotation 45°) — « Pékin / Sept. 2026 ».
3. **Timeline verticale 6 jalons** : colonne de **nodes** (cercle 44px) reliés par un trait, contenu à droite.
   - **done** : cercle bord+fond mint, check mint ; trait plein mint.
   - **now** : cercle dégradé crimson + halo `0 0 0 5px rgba(239,68,68,.18)` ; contenu en mini-card `.glass-strong` bord crimson, chip live « En cours », bouton glass sm « Voir le message de Solange ».
   - **next** : numéro, trait pointillé.
   - **lock** : cadenas, texte muted `--ink-35`.

Jalons (mapper sur les statuts `dossier_bourses`) :
`Inscription` (done) · `Documents` (done) · `Examen Joda` (**now** = `en_cours`) · `Réponse université` (`en_attente_universite`) · `Visa étudiant` (`visa_en_cours`) · `Départ en Chine` (`termine`).
Conserver la logique existante de `DossierRoadmap.tsx` : `admission_rejetee` marque l'étape admission en état « bloqué » (rouge).

### 3. Documents (`ScreenDocs` — remplace `StudentDocumentsList`)
**But** : compléter les pièces manquantes.
**Layout** :
1. Header « Mes documents » / « Dossier ».
2. **Card progression** (`.glass-strong`) : eyebrow « Documents requis », ratio **5 / 7** (le 5 en mint), **barre** r999 h8 remplie à 71 % en dégradé mint + glow, texte « Plus que **2 documents** pour soumettre ton dossier complet. »
3. **Liste des 8 documents** (rows `.glass`) : icône d'état (mint=reçu / crimson=à téléverser / ghost=optionnel) + titre + sous-texte + action à droite :
   - **done** → chip `done` « OK »
   - **todo** → bouton primaire sm « Ajouter »
   - **opt** (HSK) → chip ghost « Option », row à `opacity .72`.

Documents (ordre & libellés depuis `MODULES.md §16`) : Passeport, Photo d'identité, Relevé de notes, Diplôme, Lettre de motivation *(reçus)* ; Casier judiciaire, Lettre de recommandation *(à faire)* ; Certificat HSK *(optionnel)*.
**Upload** : compression auto cible 3 Mo, PDF/JPG/PNG, max 10 Mo (logique existante `imageCompression.ts` / `fileValidation.ts` / `/api/validate-file`). Après upload des requis → CTA « Envoyer à l'équipe » (`/api/notify-staff`).

### 4. Paiements (`ScreenPay` — remplace `StudentPaymentsList`)
**But** : voir le solde et l'échéancier, déclarer un paiement.
**Layout** :
1. Header « Mes paiements » / « Solde ».
2. **Hero solde** (`.glass-strong`, r30, filigrane wallet) : eyebrow « Reste à régler », montant **242 000 FCFA** (Space Grotesk 42px), chips (`due` « 1 dû bientôt », ghost « 2 payés · 200 000 F »), **barre de progression réglé** (45 %, dégradé mint + glow) avec « Réglé 200 000 F » / « 45 % ».
3. **Échéancier** (eyebrow + rows `.glass`) — une row par tranche :
   - **paid** : icône mint check, montant muted, sous-texte « Payé · date ».
   - **due** : row teintée ambre (bord+fond), icône clock ambre, sous-texte ambre « Dû le … · Nj ».
   - **wait** (futur) : icône cadenas ghost.
4. Bouton primaire pleine largeur **« Déclarer un paiement »**.

**Données** : `payments` du dossier (montant, type T1–T4, statut, date_limite, date_paiement). Total dû = somme non payée. Catégories : Procédure bourse, Cours mandarin (voir `MODULES.md`). Déclaration → flux existant (preuve de paiement uploadée, validée ensuite côté staff).

### 5. Messages (`ScreenChat` — remplace `StudentChatFull`)
**But** : lien direct étudiant ↔ agent assigné.
**Layout** :
1. **Header chat** (remplace le header standard) : bouton retour (glass), avatar agent, « Solange » + statut « Ton agent · en ligne » (point pulse mint), bouton appel (glass, icône `Phone` lucide).
2. **Fil de messages** : séparateurs de jour (« — Hier — », « — Aujourd'hui · 09:15 — »), bulles `them` (verre, coin bas-gauche carré) / `us` (dégradé crimson, coin bas-droit carré, ombre).
   - **Pilule système** centrée (ex. « 5 documents reçus · auto-validés », « Bravo… ») — events du dossier injectés dans le fil.
   - **Pièce jointe** dans une bulle : icône doc crimson + nom + taille.
   - **Indicateur de frappe** : avatar + bulle avec 3 points `pm-dot`.
3. **Composer** : bouton trombone (glass) + champ pilule « Écris à Solange… » + bouton envoi rond primaire (icône `Send`).

**Données** : messages temps réel via **Supabase Realtime** (table messages dossier/agent), `markAsRead` sur ouverture (remet le badge à 0), upload pièce jointe via le même pipeline que Documents. Les pilules système sont générées à partir des events du dossier (docs validés, statut changé, paiement reçu).

---

## i18n & Formatting
- **Aucun texte en dur.** Ajouter les clés sous `student.portal.*` dans `src/messages/fr.json` **et** `en.json`. Libellés FR de la maquette = source de vérité ; fournir l'EN.
- Montants : helper de format existant (séparateur milliers espace insécable, « FCFA » ou « $ » selon `isInternational`). Ne jamais hardcoder « FCFA ».
- Dates relatives (« il y a 27 min », « Dû dans 18 jours ») : utiliser la lib de dates du projet, localisée.

## Data / API (rappel des points de branchement)
| Écran | Hooks / routes |
|---|---|
| Accueil | `studentFile.completionRate`, `usePayments` (prochaine échéance), `useApplications`, agent assigné |
| Parcours | statut `dossier_bourses` → mapping jalons (cf. `DossierRoadmap.tsx`) |
| Documents | liste documents requis + statut upload ; `/api/validate-file`, compression, `/api/notify-staff` |
| Paiements | `usePayments` (tranches, statuts, dates) ; flux déclaration + preuve |
| Messages | Supabase Realtime (messages), `markAsRead`, badge non-lus, upload PJ |

## Accessibilité
- Contraste : texte muted minimal `rgba(255,255,255,.50)` sur fond sombre — OK ; ne pas descendre `.35` pour du texte porteur d'info (réservé aux états lock/disabled).
- Cibles tactiles **≥ 44px** (boutons, onglets, rows actionnables) — déjà respecté dans la maquette.
- `prefers-reduced-motion` : couper `pm-pulse` et `pm-dot`.
- États focus visibles sur tous les éléments interactifs (la maquette ne les montre pas — à ajouter).

## Fichiers du bundle
| Fichier | Rôle |
|---|---|
| `Portail Étudiant Mobile.html` | Maquette assemblée — **ouvrir dans un navigateur** pour voir les 5 écrans côte à côte (canvas pan/zoom). |
| `pm.css` | **Tous les tokens** + classes utilitaires. Source de vérité visuelle. |
| `pm-shell.jsx` | Shell téléphone, StatusBar, TabBar, `Ring`/`MiniRing`, `Avatar`, `PHeader`, `BellBtn`, set d'icônes. |
| `pm-screens-a.jsx` | Écrans Accueil, Parcours, Documents (+ données démo). |
| `pm-screens-b.jsx` | Écrans Paiements, Messages (+ données démo). |
| `design-canvas.jsx` | Échafaudage de présentation **uniquement** — à ignorer. |

## Suggested build order
1. Tokens : porter `pm.css` → variables `--student-*` / config Tailwind (couleurs, rayons, ombres, dégradé d'ambiance).
2. Primitives : `Ring`/`MiniRing` (évolution `ActivityRings`), `Chip`, `Button`, `Avatar`, `GlassCard`.
3. Shell : `BottomTabs` flottante + badge, `StudentHeader`.
4. Écrans dans l'ordre Accueil → Documents → Paiements → Parcours → Messages.
5. Branchement données (hooks/API) + i18n + Realtime chat.
6. Passe a11y (focus, reduced-motion) + QA light/dark.
