# New Nails — site vitrine (Brest)

Site statique (HTML / CSS / JS, sans étape de build) pour le salon de manucure **New Nails**,
4 Rue du Torpilleur Sirocco, 29200 Brest.

Ouvrir `index.html` via n'importe quel serveur statique suffit (GitHub Pages, Netlify, OVH…).
En local : `python3 -m http.server 8000` puis http://localhost:8000.

## Direction artistique — « laque & lumière »

| Rôle | Couleur |
| --- | --- |
| Fond principal (imposé) | `#F7EEEF` |
| Fond secondaire (imposé) | `#F2D9DD` |
| Texte / sections sombres | `#2A1220` |
| Accent vif (le fuchsia des French) | `#E8407E` · `#C71C5E` (boutons, contraste AA) |
| Accent texte | `#B3164F` |
| Or (bagues, paillettes) | `#B8924F` · `#E6C98F` |

Typographies Google Fonts : **Fraunces** (titres, italique éditorial) + **DM Sans** (texte).

Fil rouge : **l'amande** (forme d'ongle) — cadres photo, loader, icônes, anneaux des chiffres,
séparateurs de sections — + le reflet « gel » et l'étincelle dorée.

## Structure

```
index.html              contenu, SEO, données structurées LocalBusiness (NailSalon)
assets/css/style.css    design system + toutes les sections
assets/js/main.js       mise en scène (GSAP, ScrollTrigger, Lenis)
assets/img/             photos du salon + favicon
assets/vendor/          gsap 3.15, ScrollTrigger, Lenis 1.3 (hébergés, aucun CDN)
```

Sections : loader · hero parallax · bandeaux (marquee réactif au scroll) · le salon (texte qui
s'allume) · **rituel pinné en 4 étapes** · **prestations en défilement horizontal** ·
**composer son set** (aperçu et estimation en direct) · chiffres · galerie · avis (carrousel) ·
appel à l'action · accès (carte, horaires, statut ouvert/fermé) · footer.

## Modifier le contenu

- **Tarifs** : dans `index.html`, cartes de la section `#prestations`, puces du configurateur
  (`#compose`, attributs `value`), et `hasOfferCatalog` dans le JSON-LD en haut du fichier.
- **Horaires** : tableau `[data-hours]` dans `#acces`, `openingHoursSpecification` dans le JSON-LD,
  et les constantes `OPEN` / `CLOSE` dans `initFind()` de `main.js` (statut « Ouvert maintenant »).
- **Avis** : blocs `.review` dans `#avis` (le carrousel s'adapte au nombre d'avis).
- **Photos** : remplacer les fichiers de `assets/img/` (garder les noms ou mettre à jour le HTML).
  Les photos 3, 4 et 5 sont petites (~200×270 px) : elles sont volontairement affichées en petit.

## Accessibilité & performance

- `prefers-reduced-motion` : pas de loader, de smooth scroll, de pin ni de défilement horizontal ;
  toutes les sections restent lisibles et complètes.
- Mobile : pas de pin, prestations en carrousel natif (scroll-snap), bouton « Appeler » flottant.
- Navigation clavier, lien d'évitement, focus visibles, textes alternatifs, carrousel pilotable
  aux flèches. Sans JavaScript le contenu reste lisible.
- Animations en `transform` / `opacity` ; images sous le pli en `loading="lazy"`.

## À compléter avant la mise en ligne

- Renseigner l'URL définitive : `<link rel="canonical">`, `og:url` et `og:image` (URL absolue
  vers une photo), `image` et `url` dans le JSON-LD.
- Éventuellement ajouter un lien de réservation en ligne si le salon en utilise un
  (aujourd'hui : téléphone, SMS, Instagram).
