# Empire Eternal — La Fracture (v4)

Jeu de stratégie/RPG mobile en Canvas, installable comme PWA sur iOS et Android.

## Jouer

https://sacha30650.github.io/empire-eternal/

## Boucle de jeu

1. Faire produire et améliorer la Citadelle.
2. Sélectionner une mission parmi 12 nœuds de campagne.
3. Commander trois héros en combat temps réel.
4. Déclencher Bastion, Volée et Nova pour construire un combo.
5. Réussir la Frappe temporelle au bon moment.
6. Gagner jusqu’à trois étoiles, du butin et débloquer la mission suivante.
7. Améliorer les héros, bâtiments et compléter les quêtes quotidiennes.

## Application mobile

- Manifest PWA et Service Worker hors-ligne.
- Mode `standalone` et orientation portrait.
- Sauvegarde locale avec migration de la v3.
- Production hors-ligne plafonnée à huit heures.
- Sons synthétisés via Web Audio et vibrations tactiles.
- Safe areas iPhone (`env(safe-area-inset-*)`).

## Développement

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Puis ouvrir `http://127.0.0.1:8080/`.

## Validation

- `node --check game.js`
- `python3 cdp_test.py` avec Chromium ouvert sur le port CDP indiqué par `EE_CDP_PORT`.
- Le test automatisé couvre : navigation, coût d’énergie, compétences, Frappe temporelle, victoire, étoiles, déblocage de campagne, portail, amélioration de bâtiment, sauvegarde et Service Worker.

Tous les graphismes du jeu et les icônes PWA sont dessinés procéduralement. Aucun asset tiers n’est nécessaire.
