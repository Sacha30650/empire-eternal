# Empire Eternal — La Fracture (v5)

Jeu de stratégie/RPG mobile en Canvas, installable comme PWA sur iOS et Android.

## Jouer

https://sacha30650.github.io/empire-eternal/

## Boucle de jeu

1. Gouverner un royaume vivant : population, moral, provisions et prospérité.
2. Affecter les sujets à la mine, aux fermes ou à la forge et équilibrer la production.
3. Promulguer un décret économique ou militaire et honorer les requêtes du Conseil.
4. Développer six bâtiments interdépendants et débloquer des paliers de prospérité.
5. Sélectionner une mission parmi 12 nœuds de campagne.
6. Commander trois héros en combat temps réel.
7. Déclencher Bastion, Volée et Nova pour construire un combo.
8. Réussir la Frappe temporelle au bon moment.
9. Gagner jusqu’à trois étoiles, du butin et débloquer la mission suivante.
10. Améliorer les héros, le domaine et compléter les quêtes quotidiennes.

## Application mobile

- Manifest PWA et Service Worker hors-ligne.
- Mode `standalone` et orientation portrait.
- Sauvegarde locale avec migration transparente des versions précédentes.
- Production d’or et balance de provisions hors-ligne plafonnées à huit heures.
- Sons synthétisés via Web Audio et vibrations tactiles.
- Safe areas iPhone (`env(safe-area-inset-*)`).

## Développement

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Puis ouvrir `http://127.0.0.1:8080/`.

## Validation

- `node --check game.js`
- `python3 cdp_test.py` teste la campagne et les combats.
- `python3 kingdom_test.py` teste l’économie, les ouvriers, les décrets, les requêtes et le rendu mobile.
- Le test automatisé couvre : navigation, coût d’énergie, compétences, Frappe temporelle, victoire, étoiles, déblocage de campagne, portail, amélioration de bâtiment, sauvegarde et Service Worker.

Les unités de combat principales utilisent des sprites dark fantasy 2.5D originaux dans `assets/units/`, le Bois des murmures dispose d’un décor peint optimisé dans `assets/environments/` et les compétences utilisent des icônes dédiées dans `assets/ui/skills/`. Un rendu procédural de secours reste actif pour les héros, boss et biomes qui ne disposent pas encore d’un asset.

La Citadelle utilise désormais un décor nocturne 2.5D peint, optimisé en WebP, avec six points d’intérêt alignés sur les zones tactiles du Canvas. Des halos, brumes, lucioles, habitants et marqueurs de niveau restent animés en temps réel au-dessus du décor. Le rendu géométrique précédent sert automatiquement de secours si l’image ne peut pas être chargée.

Les combats du biome Ruines utilisent également un décor vertical peint dédié : architecture gothique brisée, sol d’obsidienne, brume violette et zone tactique centrale dégagée. L’asset WebP est préchargé par le Service Worker et le terrain procédural reste disponible en secours.
