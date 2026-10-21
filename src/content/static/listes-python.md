---
slug: listes-python
author: static_mnemo
authorName: Mnemo
authorBio: Cours et paquets préparés par l’équipe Mnemo. Ce profil est défini dans les fichiers Markdown et n’existe pas en base de données.
course: Python
title: Les listes en Python
description: Comprendre les listes, leurs positions et les opérations de base.
subject: Programmation
level: Débutant
draft: false
---

## Définition

Une liste conserve plusieurs valeurs dans un ordre. La première position porte le numéro 0.

## Exemple

```python
nombres = [3, 5, 8]
nombres.append(13)
print(nombres[0])
```

## À retenir

Compter depuis 0 évite de décaler la lecture du premier élément.

## Cartes

Q: Comment lire le premier élément d'une liste ?
A: Avec `liste[0]`. Les positions commencent à zéro.

Q: Que fait `append` ?
A: `append` ajoute une valeur à la fin de la liste.

Q: Une liste peut-elle contenir plusieurs valeurs ?
A: Oui. C'est une suite ordonnée de valeurs.
