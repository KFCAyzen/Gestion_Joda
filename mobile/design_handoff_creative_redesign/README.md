# Handoff: Joda — Creative Redesign (Staff + Admin mobile)

## Overview
A complete creative redesign of the Joda mobile app's **Staff** and **Admin** experiences, plus a **light theme** for both. Joda accompanies students from Mali/West Africa toward universities abroad (China, Canada, France, Morocco). The redesign keeps the established **crimson-glass** identity but pushes it further: animated motion heroes, bento-grid dashboards, animated data-viz (rings, sparklines, donuts, bars, meters), glass depth/layering, and bold display typography. Every screen works in **dark and light**.

The target codebase is the mounted **Expo / React Native** app under `mobile/` (routes in `mobile/src/app/(admin)`, `(staff)`-equivalent, and the student tabs). This redesign covers the Staff and Admin role areas.

## About the Design Files
The files in this bundle are **design references created in HTML + React (Babel-in-browser)** — high-fidelity prototypes showing the intended look, motion, and behavior. **They are not production code to copy directly.** The task is to **recreate these designs in the existing Expo / React Native codebase** using its established patterns: the existing navigation (expo-router tabs + stack), the existing data hooks (`mobile/src/lib/hooks/*`), and a React Native styling approach (StyleSheet / your existing theme tokens). Translate the HTML/CSS/SVG into RN components (`View`, `Text`, `Pressable`, `react-native-svg`, `expo-linear-gradient`, `reanimated` for animation).

Where the HTML uses web-only tricks (CSS `backdrop-filter`, CSS keyframes, `offset-path`), use the RN equivalent (a semi-opaque fill or `expo-blur`, `reanimated` timelines, animated `strokeDashoffset` via `react-native-svg`).

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadows, motion, and interactions are all specified. Recreate pixel-accurately. Exact values are in **Design Tokens** below; per-screen detail is in **Screens / Views**.

## Theming Architecture (read this first)
Everything is token-driven. Two existing stylesheets define the system:
- `staff.css` / `admin.css` — `:root` holds the **dark** token values (the default). A `.theme-light` scope overrides the same token names with **light** values. Wrapping any subtree in `.theme-light` flips it to light.
- `creative.css` — the **creative layer** (namespaced `.cv*`): heroes, bento tiles, cards, meters, pills, entrance animations. It consumes the same tokens, so it themes automatically.
- `creative-viz.jsx` — animated viz primitives: `CountUp`, `CVRing`, `Sparkline`, `Donut`, `CVBars`.

In React Native this maps to a **theme context** exposing a `light`/`dark` token object; components read tokens from context instead of hard-coded colors. Implement `.theme-light` as `theme === 'light'` selecting the light token set.

### Animation rule (important for RN + reduced motion)
Entrance animations use the **visible end-state as the base style** and animate *from* hidden, gated behind `prefers-reduced-motion: no-preference`. Never leave content at `opacity:0` as a persistent base — a paused/background view must still show content. In RN, drive entrances with `reanimated` `entering` animations (e.g. `FadeInDown`) which default to the visible resting state.

---

## Design Tokens

### Core palette
| Token | Dark | Light |
|---|---|---|
| bg base (`--bg-0`/`--bg-base`) | `#100307` | `#f7efee` |
| bg deep | `#160409` | `#f1e6e4` |
| ink / text | `#ffffff` | `#211218` |
| ink-70 | white .70 | `#211218` @ .66 |
| ink-50 | white .50 | `#211218` @ .50 |
| ink-35 | white .35 | `#211218` @ .36 |
| crimson vivid (primary) | `#ff5a5f` | `#e23b40` |
| crimson deep | `#d11a2a` | `#b3122e` |
| mint (success) | `#34d9a8` | `#14a37a` |
| amber (warning) | `#fbbf24` | `#b45309` |
| violet (accent) | `#a78bfa` | `#a78bfa` |
| blue (accent) | `#60a5fa` | `#2563eb` |

### Surfaces & lines
| Token | Dark | Light |
|---|---|---|
| glass | white .055 | white .74 |
| glass-2 | white .085 | white .92 |
| glass-line | white .12 | `#211218` .10 |
| glass-line-2 | white .18 | `#211218` .14 |
| surface | white .05 | `#211218` .035–.05 |
| track (meter bg) | white .08 | `#211218` .09 |
| red-glass / red-line | `#ef4444` .13 / .32 | `#e23b40` .10 / .26 |
| mint-glass / mint-line | `#34d9a8` .13 / .32 | `#14a37a` .12 / .34 |
| amber-glass / amber-line | `#fbbf24` .13 / .32 | `#b45309` .12 / .30 |

### Primary gradient (buttons, active states, ring/bar fills)
`linear-gradient(135deg, #ff5a5f, #d11a2a)` — **identical in both themes**; only the drop-shadow halo softens in light. White text on it in both themes.

### Motion hero background (dark)
```
radial-gradient(120% 140% at 0% 0%, rgba(255,90,95,.30), transparent 55%),
radial-gradient(120% 130% at 100% 0%, rgba(190,18,60,.34), transparent 60%),
linear-gradient(160deg, #2a0a0f, #160409)
```
Light hero is a solid crimson gradient (`#e23b40 → #b3122e`) with white text. Two blurred aurora orbs drift inside (`#ff5a5f` and `#7f1d1d`, ~14s/18s ease-in-out loops) — in RN, two absolutely-positioned blurred circles animated with reanimated, or a static gradient if perf-constrained.

### Type scale
- Display / numerals: **Space Grotesk** 500–700 (use for all big numbers, titles, KPI values). Enable tabular figures.
- UI / body: **Inter** 400–700.
- Eyebrow: 10.5–11px, weight 700, uppercase, letter-spacing .14em, color = crimson vivid.
- Screen title: 25px, weight 600, letter-spacing -.5px.
- Hero numeral: 38–46px, weight 600, letter-spacing -1.5 to -2px.
- Body: 13–15px; secondary 11.5–12.5px at ink-50.

### Radii
hero 26 · tile/card 20 · pill button 12–17 · chips 999 · icon tile 9–14 (all px).

### Shadows
- Tile (dark): `0 10px 26px -16px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)`
- Tile (light): `0 10px 24px -14px rgba(40,18,24,.22), inset 0 1px 0 rgba(255,255,255,.6)`
- Primary button: `0 12px 30px -8px rgba(226,59,64,.42)`

### Animated viz primitives (see `creative-viz.jsx` for exact math)
- **CountUp**: animate 0→value, cubic ease-out, ~1100ms.
- **CVRing**: SVG circle, `strokeDashoffset` animates over 1300ms; crimson gradient stroke; center shows CountUp % + label.
- **Sparkline**: path drawn via `strokeDasharray/offset` over ~1300ms + soft area fill; end-point dot.
- **Donut**: segmented circle, each segment `strokeDasharray` animates in with 120ms stagger.
- **CVBars / meters**: height/width grows from 0 with per-item delay (~60–120ms).

---

## Screens / Views

### Shared chrome
- **Status bar** (9:41 + signal/battery), **bottom tab bar** (glass, active tab = crimson gradient pill with white icon; badges = crimson circle), **detail back** affordance. Tabs differ by role (below).
- **Screen header**: eyebrow (crimson, uppercase) + title (Space Grotesk 25px); optional right-side 40×40 glass icon button.

### STAFF — tabs: Accueil · Dossiers · Paiements · Messages · Profil
1. **Accueil (home)** — motion hero with `CVRing` (% du jour traité) + "X actions sur Y" + status pills; bento KPI grid (Dossiers actifs, Encaissé du mois [accent tile], 7-day sparkline tile spanning 2 cols, Paiements à valider, Rapports à valider); "À valider" list card (avatar + amount).
2. **Dossiers** — summary bento (Actifs, Taux complétion); horizontal filter chips (Tous / À traiter / En revue / Complets); list of tiles each with a small `CVRing` (per-dossier %), name + status chip, destination/docs/pay meta row, and a 6-segment journey stepper bar (Inscription→Dossier→Admission→Visa→Vol→Départ).
3. **Fiche étudiant** (detail) — hero with avatar + program + destination chip + `CVRing`; **journey timeline** (6 vertical steps with connector line, done = crimson check, current = glowing ring, todo = muted); 2-col **documents grid** (mint check when present).
4. **Paiements** — hero showing total pending + count; "À valider" and "Traités" sections; each card: avatar, type/tranche/ago, amount, method + justificatif chips, Valider / Rejeter buttons. **Proof bottom-sheet**: slide-up sheet with student summary, faux receipt preview, Valider/Rejeter. State updates optimistically.
5. **Messages** — thread list card: avatar (online dot), name, time (crimson if unread), last message, unread count badge.
6. **Chat** (detail, full-screen) — header (avatar, online status, call icon), message bubbles (out = crimson gradient right-aligned, in = glass left-aligned), composer with attach + send (crimson) button. Sending appends a message.
7. **Rapports** — bento (Heures aujourd'hui [accent], À valider); per-report tiles (employee, poste, hours, activity text, Valider/Signaler).
8. **Profil** — hero with avatar circle + name + role + agency chip; 2 stat tiles (Dossiers, Réussite %); settings list (Infos perso, Sécurité, Notifications, Aide); crimson "Déconnexion" button.

### ADMIN — tabs: Tableau · Perfs · Compta · Gestion · Alertes
1. **Tableau (home)** — period pills (Hier/Aujourd'hui/Semaine/Mois); hero with big revenue CountUp (M FCFA) + growth + full-width sparkline; bento (À traiter, Dossiers ouverts, 7-day `CVBars` flux spanning 2 cols); **Répartition donut** card with legend; **Top universités** with animated meters.
2. **Performances** — period pills; **podium hero** (revenue + top agent with 🥇); ranked agent tiles each with score (color-coded: ≥70 mint, ≥40 amber, else crimson), animated score meter, and a 4-metric breakdown grid (Revenu/Activité/Rapidité/Dossier).
3. **Comptabilité** — period pills; hero solde de trésorerie + Entrées/Sorties split cards; "X dépenses à valider" accent banner; journal card (in = mint +, out = text −; "À VALIDER" tag on flagged rows).
4. **Gestion (hub)** — list card routing to: Candidatures, Utilisateurs & rôles, RH, Universités, Cours, Stockage, Journal d'audit (each a colored icon tile + chevron).
5. **Alertes / Notifications** — hero with unread count + "Tout lire"; grouped by day (AUJOURD'HUI/HIER); per-item tile (type-colored icon, title, body, time, unread dot). Marking read dims the row.
6. **Candidatures** (detail) — bento (À traiter [accent], Total pipeline); pills (À traiter / Toutes); applicant tiles with status chip (document_manquant=crimson, document_recu=mint, en_attente=amber, en_cours=neutral).
7. **Utilisateurs & rôles** (detail) — role-distribution **donut** with center total + legend; **permission matrix** (per-role meter out of 42, role-colored); member list with role badges.
8. **RH** (detail) — bento (Effectif actif, Masse salariale [accent], Congés en attente, Rapports à valider); tabs Équipe / Congés / Paie. Équipe: employee tiles (statut chip + salary). Congés: leave cards with Approuver/Refuser. Paie: payslip rows with net + PDF.
9. **Universités** (detail) — bento (Partenaires [accent], Étudiants placés); partner tiles (flag, city/country, active dot, students/programs stats).
10. **Cours** (detail) — hero (revenue + inscrits); per-language cards (Mandarin/Anglais: flag, active count, revenue, enrolled-student rows with Payé/En attente).
11. **Stockage** (detail) — usage **donut** (% used) + Go used/total + DB rows; per-bucket breakdown with colored meters.
12. **Journal d'audit** (detail) — info banner (count); grouped by day; log rows (type-colored icon, actor bolded + action text, timestamp).

## Interactions & Behavior
- **Role switch** (Staff/Admin) resets to home and clears detail stack.
- **Theme toggle** (dark/light) flips the token set app-wide.
- **Tabs** swap the active screen; **detail navigation** pushes a sub-screen with a back affordance (chat is full-screen, no tabs).
- **Optimistic actions**: validate/reject payment, approve/refuse leave, validate/flag report, mark notifications read, send chat message — all update local state immediately (wire to the real mutation hooks in `mobile/src/lib/hooks/`).
- **Entrance**: staggered fade-up (~55ms steps) on screen content; screen transition fade-up ~400ms. Hero aurora orbs loop slowly. Respect reduced-motion.
- Press feedback: tiles scale to .975 on active.

## State Management
- `role: 'staff' | 'admin'`, `theme: 'light' | 'dark'`, active tab per role, detail route (string | null).
- Per-screen local state for optimistic mutations (payment/report/leave status maps, notification read flags, chat message list, segmented filters/pills).
- Data fetching: replace the bundled mock (`creative-data.jsx`) with the existing hooks (`use-admin`, `use-documents`, `use-messages`, `use-declare-payment`, etc.). The mock object's shape documents exactly which fields each screen needs.

## Assets
- **No raster assets.** All icons are inline SVG path sets (`ICONS` in `staff-ds.jsx`) — map to your existing icon set (lucide-react-native is a close match; the paths are Lucide-style). The Joda mark is an inline SVG (J + paper plane).
- University flags use emoji.
- Fonts: **Inter** and **Space Grotesk** (Google Fonts) — load via `expo-font`.

## Files
**Creative system (shared):**
- `creative.css` — creative visual layer (heroes, bento, cards, meters, pills, animations)
- `creative-viz.jsx` — animated viz primitives (CountUp, CVRing, Sparkline, Donut, CVBars)
- `staff.css`, `admin.css` — token definitions (`:root` dark, `.theme-light` light)
- `staff-ds.jsx` — shared primitives (Icon/ICONS, Avatar, StatusBar, BottomTabs, headers)

**Screen components:**
- `creative-dash.jsx` — Staff + Admin home dashboards
- `creative-screens.jsx` — Staff Dossiers/Fiche, Admin Performances/Candidatures
- `creative-screens-c.jsx` — Admin Comptabilité, Utilisateurs/rôles, RH
- `creative-screens-d.jsx` — Staff Paiements (+proof sheet), Messages, Chat, Rapports, Profil
- `creative-screens-e.jsx` — Notifications, Universités, Cours, Stockage, Journal d'audit
- `creative-app.jsx` — the navigable app shell (role switch, tabs, detail routing, theme)
- `creative-data.jsx` — unified mock data (documents the exact prop shape each screen needs)

**Runnable references (open in a browser):**
- `Joda Créatif — App complète.html` — the full navigable prototype (start here)
- `Dashboards Créatifs.html`, `Écrans Créatifs — Wave 2.html`, `Admin Créatif — Wave 3.html`, `Staff Créatif — Wave 4.html`, `Parité & Modules — Wave 5.html` — per-area galleries showing dark + light side by side

> Note: these HTML prototypes use CSS `backdrop-filter` and keyframe animations; static DOM-snapshot tools render them blank, but they display correctly in a real browser. Open the `.html` files directly to view.
