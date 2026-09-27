# ATLAS — Spécifications consolidées

*Document regroupant l'ensemble des spécifications ayant guidé le développement d'ATLAS : la spécification principale (grille de risque, Knowledge Graph, Market Intelligence), ses trois compléments autonomes (modules d'entraînement analyste investissement, intégration baromètre-crowdfunding.com, vues inspirées de MARKO), la spécification de refonte globale v2.0 (séparation Dette/Fractionné, dossier maître, dictionnaire financier) et la spécification Cockpit/Fractionné v1.0. Chaque complément se réfère à la spécification principale sous le nom `ATLAS_spec_v2.md`.*

## Sommaire

1. **Spécification principale** — grille de risque, Knowledge Graph & Market Intelligence (sections 0, A, B, C)
2. **Complément D** — modules d'entraînement au métier d'analyste investissement (fonds)
3. **Complément E** — intégration de baromètre-crowdfunding.com (Market Intelligence)
4. **Complément F** — vues inspirées de MARKO (Kanban, dashboard agrégé, covenants)
5. **Refonte globale v2.0** — séparation Dette/Fractionné (espaces étanches), dossier maître, dictionnaire financier, migration en 6 lots (A–F)
6. **Cockpit et Fractionné v1.0** — file de décisions/actions, parcours fractionné en 9 étapes, qualification courte, plateformes multiples, priorités P0-P3

**Non consolidé ici, faute de texte intégral reçu dans cette session** : `ATLAS_Examen_Fonctionnel_2026-09-27.md` (audit fonctionnel, 32 constats) — la Partie 5 le cite et s'appuie sur lui, mais seul un résumé de synthèse en a été transmis dans cette conversation, jamais le document complet. À coller ici si vous voulez qu'il soit consolidé à son tour.

---


# Partie 1 — Spécification principale (ATLAS_spec_v2.md)

# ATLAS — Spécification consolidée : grille de risque, Knowledge Graph & Market Intelligence

*Document de synthèse issu de la revue de la fiche projet "Le Traçotin (60)" et de l'onglet Knowledge Graph. Objectif : passer d'un outil de constat à un outil de décision automatisée, exploitable pour le risk management et le fund management — sans sur-ingénierie.*

**Doctrine transversale, à appliquer à tout le document :** aucun moteur analytique n'a le droit d'afficher une conclusion sans exposer la qualité de la donnée qui la soutient (voir section 0).

---

## 0. Principes transversaux (à graver avant tout développement)

### 0.1 Minimum evidence before analytics
Aucune statistique dérivée (taux de fiabilité, comportement d'un opérateur, tendance de marché) ne doit s'afficher comme un pourcentage isolé sans son contexte d'échantillon.

Format minimal obligatoire pour toute statistique dérivée :
```
n = nombre d'observations
période couverte
nombre de sources
coverage (partiel/substantiel/vérifié)
freshness (fraîcheur des données sous-jacentes)
```
Exemple : ne jamais afficher "87 % d'engagements respectés" seul → afficher "8/11 — échantillon limité" tant qu'un seuil configurable (ex. n ≥ 30) n'est pas atteint ; le taux seul ne devient la métrique principale qu'au-delà.

### 0.2 Relationship / Market Coverage
Chaque entité et chaque statistique marché porte un niveau de couverture explicite : **Unknown / Partial / Substantial / Verified**.

Formulations à bannir / à privilégier :
- ❌ "Aucun lien à risque détecté" → ✅ "Aucun lien à risque détecté dans les relations actuellement documentées — couverture partielle."
- ❌ "Aucun financement externe détecté" → ✅ "Aucun financement externe observé parmi les sources actuellement couvertes."

### 0.3 Badge de fraîcheur systématique
Sur toute donnée issue d'une source externe (BODACC, SIRENE, Géorisques, baromètre crowdfunding, scraping concurrentiel) :
- 🟢 Fresh (< 30 j)
- 🟡 Current (30–90 j)
- 🟠 Aging (90–180 j)
- 🔴 Stale (> 180 j)

### 0.4 Score externe ≠ verdict Atlas
Tout score provenant d'une source tierce (ex. baromètre crowdfunding) s'affiche explicitement comme "Score externe — X/100", jamais comme une évaluation produite par Atlas. Séparer platform status (ouverte/fermée), portfolio performance (stats globales) et project risk (dossier individuel) — ce sont trois informations différentes actuellement fusionnées dans un seul score.

### 0.5 Grille de priorisation NOW / NEXT / LATER / DO NOT BUILD YET

| Domaine | NOW | NEXT | LATER |
|---|---|---|---|
| Grille de risque | Repondération + 4 paliers + transparence du calcul | Tendance (delta score) | Calibration avancée / ML |
| Knowledge Graph | Ontologie + modèle relationnel (entities/relationships/evidence) | Agrégations groupe économique, requêtes déterministes | Blast Radius, Contagion Path, GraphRAG |
| Market Intelligence | 5 sources pilotes + snapshots + events minimaux | 10–15 sources + segmentation/normalisation | Couverture maximale, Market Regimes |
| Playbooks / actions | Playbook procédure collective + tracker basique | Bibliothèque étendue par type d'événement | Automatisation complète avec escalade |
| Gouvernance | — | Audit trail, séparation des rôles | Conformité PSI formalisée |

**Séquençage recommandé à l'intérieur même du NOW** (pour éviter la dispersion) : traiter d'abord la grille de risque + l'ontologie du Knowledge Graph, avant d'ouvrir le chantier Market Intelligence en parallèle.

**Explicitement en DO NOT BUILD YET** : bénéficiaires effectifs automatiques, track record comportemental (tant que n reste faible), recherche en langage naturel sur le graphe, overlay visuel de risque (Graph Risk Overlay), extraction automatique depuis documents non structurés (NER/LLM/Neo4j/GraphRAG).

---

## PARTIE A — Grille de risque et plan d'action

### A.1 Diagnostic du problème actuel
- Le score de risque sous-pondère les signaux précoces (retard, mise en demeure) et ne réagit fortement qu'à l'événement final (procédure collective), rendant l'outil réactif plutôt que pro-actif.
- Seulement deux paliers visibles ("saine" / "critique") : pas d'état intermédiaire pour anticiper.
- Le calcul du score n'est pas auditable (boîte noire).
- Doublons dans les alertes affichées (ex. "Porteur en procédure collective" et "Procédure collective en cours").
- Coexistence de 4 statuts au même niveau visuel ("En cours", "Mise en demeure", "Procédure collective", "Suivi") sans hiérarchie.
- Absence de notion de tendance/vitesse de dégradation du score.
- Les alertes ne débouchent sur aucune action concrète, datée, assignée.

### A.2 Moteur de scoring — repondération

| Facteur | Poids |
|---|---|
| Retard sur durée cible | Progressif : +5 pts à J+10, +15 pts à J+30, +25 pts à J+60 |
| Mise en demeure envoyée | +20 pts (immédiat, acte juridique fort) |
| Procédure collective ouverte | +40 pts (déclenche automatiquement le palier "critique") |
| Sûreté expirée ou non valide | +15 pts par sûreté concernée |
| Dérive marge réelle vs BP | Seuil : -10 % déclenche palier "surveillance" |

**Règle de cohérence** : un dossier avec mise en demeure + retard ne doit jamais retomber sous le palier "surveillance".

**Paliers (4 au lieu de 2)** : Faible (0–25) / Sous surveillance (26–50) / Élevé (51–75) / Critique (76–100, atteignable uniquement via un déclencheur dur).

**Transparence** : section dépliable "Pourquoi ce score ?" listant chaque facteur et sa contribution.

**Tendance** : stocker le score à chaque recalcul (déjà quotidien à 8h) et afficher un delta (ex. "+21 pts sur 7 jours").

### A.3 Header de fiche projet (Project Command Header)

Structure : situation → exposition → cause → protection → action → owner/deadline.

```
🔴 DISTRESSED — Recovery review required
135 000 € exposés · Échéance dépassée de 68 j · Procédure collective

Recovery : non encore évalué
4 informations critiques manquantes · 2 sûretés à revoir

Action prioritaire : vérifier la procédure, protéger la créance, qualifier les sûretés.
3 actions ouvertes · 2 urgentes — Ouvrir le plan d'action →
```

Statuts fusionnés (un seul domine visuellement) :
```
Cycle : Suivi
Surveillance : DISTRESSED
Recouvrement : Mise en demeure
Juridique : Procédure collective
```

**Conditions impératives** :
- "Recovery : non évalué" et "informations critiques manquantes" calculés par des règles explicites (moteur de complétude, A.5), jamais des libellés statiques.
- Ne pas coder ce header sans revoir en parallèle le moteur de scoring (A.2) — sinon "DISTRESSED" s'affiche au-dessus d'un score qui dit encore "sain".
- Vérifier dans le code ce que représente le champ "40" (à côté d'Exporter/Modifier/Supprimer) avant toute décision de le déplacer — ne pas partir d'une hypothèse.

Les blocs "Durée cible dépassée" et "Garantie à renouveler" descendent dans une section "Signaux & causes" sous le header.

### A.4 Moteur de règles / playbooks par événement

```yaml
événement: "procédure_collective_ouverte"
déclenche:
  - action: "identifier_type_procédure"
    deadline: immédiat
    bloquant: false
  - action: "déclaration_créance"
    deadline: date_publication_BODACC + 60j
    bloquant: true
  - action: "vérifier_caution_personnelle_poursuivable"
    deadline: date_publication_BODACC + 15j
    bloquant: false
  - action: "vérifier_période_suspecte_sur_sûretés"
    deadline: date_publication_BODACC + 15j
    bloquant: false
```

**Rappels juridiques à intégrer comme règles** (à valider avec un avocat spécialisé procédures collectives — ceci n'est pas un conseil juridique) :
- Ouverture d'une procédure collective → suspension des poursuites individuelles (art. L622-21 du Code de commerce).
- Délai de déclaration de créance généralement de 2 mois à compter de la publication BODACC ; risque de forclusion à défaut.
- Une caution personnelle survit en général à la procédure collective de la société débitrice, sauf si elle est elle-même expirée/invalide.
- Une sûreté prise/renouvelée juste avant l'ouverture de la procédure peut être annulée au titre de la "période suspecte".

**Bibliothèque de playbooks à construire** : retard, mise en demeure, procédure collective (par type), sûreté invalide, défaut, contentieux.

**Garde-fou** : toute action à conséquence juridique/financière significative est proposée par le système mais validée par un humain avant d'être marquée "faite".

### A.5 Moteur de complétude de l'information
Score de complétude calculé (pas inventé) répondant à : type de procédure renseigné ? déclaration de créance faite ? statut de chaque sûreté vérifié dans les 30 derniers jours ? Alimente le champ "informations critiques manquantes" du header.

### A.6 Qualité et fraîcheur des données
- Distinguer "vérifié = pas de risque" de "non vérifié = donnée absente" (cf. champs "Indisponible" actuels).
- Horodatage "dernière vérification" par source (SIRENE, BODACC, Géorisques, ADEME) — cf. badge de fraîcheur (0.3).
- Score de confiance global du dossier basé sur le % de sources à jour.

### A.7 Tracker d'actions
Owner, deadline (dure/souple selon `bloquant`), statut (à faire/en cours/fait/en retard), remontée automatique en cas de dépassement vers le niveau portefeuille.

### A.8 Agrégation portefeuille / fund management
- Exposition totale (k€) par palier de risque.
- Nombre d'actions en retard, par urgence.
- Risque de concentration/contrepartie : exposition totale par promoteur/porteur.
- Exposition par zone géographique et type d'opération.
- Vue "stress test" simple : impact portefeuille si X % des dossiers "élevé" basculent en défaut.

### A.9 Sûretés — suivi dans le temps
- LTV recalculé si la valeur du bien change.
- Vérification systématique de la "période suspecte" pour toute sûreté prise/renouvelée avant une procédure collective.
- Distinction "expirée" (renouvelable) vs "invalide" (défaut de fond).

### A.10 Gouvernance et conformité
- Audit trail : toute évolution de score et action générée horodatée, non modifiable a posteriori.
- Séparation des rôles : proposer (système) vs valider (analyste/comité).
- Garde-fou pour rester hors du champ du conseil réglementé (PSI).

### A.11 Reporting
- Export structuré (JSON/PDF) par dossier pour alimenter un reporting fonds.
- Distribution du portefeuille par palier de risque.
- Agrégation des actions en retard au niveau portefeuille.

---

## PARTIE B — Knowledge Graph

### B.1 Diagnostic
- L'onglet actuel est un annuaire relationnel visualisé en graphe, pas un outil d'analyse : on ne sait pas pourquoi regarder une entité, quelle exposition en dépend, ni s'il y a anomalie.
- Deux natures de données mélangées sans distinction claire : contreparties réelles (Axma Capital, Macber SARL — avec "Opérations liées") et veille concurrentielle (Fundimmo, Koregraf — stats de marché tierces).
- Fiches contrepartie trop pauvres (Macber SARL quasiment vide) pour servir à une analyse de risque.
- Score externe des plateformes (ex. "63/100 · Bon") affiché avec la même autorité qu'une donnée Atlas native, sans distinguer statut plateforme / performance / risque projet.
- Données parfois très anciennes (Koregraf : rapport de janvier 2025) sans signal de péremption.
- Vue graphe surchargée sur mobile (dizaines de nœuds, 3 colonnes, zoom/pan peu exploitable).

### B.2 Modèle de données cible (niveau 1 — fondation, à faire maintenant)

Rester sur PostgreSQL, pas de migration vers Neo4j à ce stade.

```
entities
entity_identifiers      -- SIREN, etc.
entity_aliases          -- variantes de nom
relationships
relationship_types
relationship_evidence
relationship_events
```

Chaque relation porte : `source_entity_id`, `target_entity_id`, `relationship_type`, `started_at`, `ended_at`, `amount`, `percentage`, `criticality`, `source`, `evidence_level`, `verified_at`, `status`, `confidence`.

**Domaine explicite** (pas de séparation physique en deux graphes) : chaque entité/relation porte un champ de domaine — Portfolio (contreparties réelles liées à des opérations LPB) vs Market (veille concurrentielle) — pour permettre le croisement futur (un opérateur observé à la fois chez LPB et chez un concurrent) sans dupliquer l'infrastructure.

**Relationship Coverage** par entité : Unknown / Partial / Substantial / Verified (cf. 0.2).

### B.3 Intelligence dérivée de premier niveau (niveau 2 — deterministic intelligence)

Requêtes métier déterministes à construire en priorité (pas besoin d'IA) :
- Quelles opérations appartiennent au même groupe économique ?
- Quelles opérations partagent une même caution/garantie ?
- Quelles sociétés documentées sont liées à une procédure collective ?
- Quelle exposition consolidée sur chaque opérateur/groupe ?
- Quels opérateurs ont plusieurs projets actifs sans remboursement historique ?

Fiche contrepartie enrichie a minima (ex. Axma Capital) :
```
Exposition directe LPB : 2,17 M€
Opérations : 1 active · 0 remboursée
Relations liées : 4
Garanties : 2
Information confidence : Medium
Dernière vérification : il y a 12 jours
```

### B.4 Contagion (niveau 3 — quand la couverture relationnelle devient suffisante)
Un événement critique sur une entité déclenche : recherche des relations directes → calcul de l'exposition liée → identification des autres opérations concernées → revue humaine. Pas d'algorithme sophistiqué à ce stade — de la traversée simple du graphe.

### B.5 Advanced Graph Analytics (niveau 4 — reporté, ne pas construire maintenant)
Blast Radius, Single Point of Failure Detector, Contagion Path, Graph Risk Overlay (nœuds colorés par état, taille = exposition, épaisseur = importance du lien), shared dependencies, guarantee reuse. **Condition de déclenchement** : volume de relations réellement documentées et vérifiées suffisant — pas avant, pour éviter de construire un moteur d'analyse qui tourne à vide sur un graphe presque vide (Macber SARL a 0 opération liée aujourd'hui).

### B.6 Recherche en langage naturel / GraphRAG (niveau 5 — très tard)
Question en langage naturel → requête structurée déterministe → résultat → explication IA. Les résultats doivent venir des relations structurées, jamais être inventés par le LLM. Pas de priorité actuelle.

### B.7 Graphe visuel — révision de comportement
- Ne plus tout afficher par défaut. Sélectionner une entité → afficher niveau 0 (l'entité) + niveau 1 (relations directes), avec option "afficher niveau 2".
- Filtres : Critical only / Financial / Legal / Ownership / Guarantees / Projects / Distressed relationships.
- Le graphe général complet reste disponible en exploration libre, mais pas comme vue par défaut sur mobile.

### B.8 Veille concurrentielle dans le Knowledge Graph
Les plateformes concurrentes ont leur place dans le même modèle relationnel (domaine "Market"), pas dans un système totalement étanche — cas d'usage concret : un opérateur déjà financé par LPB observé aussi chez un concurrent via une structure juridique différente (même groupe économique) est une information de risque de concentration réelle, détectable uniquement si les deux domaines peuvent se croiser.

**Entity Resolution avec seuil de confiance** (pas de fusion automatique hasardeuse) :
```
Match confidence: High  (ex. SIREN identique) → auto-link autorisé
Match confidence: Low   (nom seul)            → validation humaine requise
```

---

## PARTIE C — Market Intelligence Engine (veille concurrentielle)

### C.1 Principe d'architecture
Le Knowledge Graph ne doit pas être le crawler. Séparer clairement :

```
Sources externes → collecte → normalisation → détection de changements → historique → analytics → alertes
                                                                                              │
                                                                                              ▼
                                                                                     Knowledge Graph (consomme)
```

### C.2 Source Registry (à construire avant tout scraping)
Chaque source externe documentée avec :
```
access_method        -- API / feed / page publique / dataset sous licence
terms_reviewed        -- oui/non
reviewed_date
allowed_usage
collection_limit
authentication_required
robots_policy
legal_owner / technical_owner
health_status          -- 🟢 Operational / 🟠 Degraded / 🔴 Broken / ⚪ Unknown
coverage_status
```
**Une source ne passe en collecte qu'une fois son statut "APPROVED FOR COLLECTION" acté.**

Ordre de préférence pour l'accès : API officielle → flux structuré autorisé → partenariat/licence → collecte publique conforme (CGU + robots.txt vérifiés) → revue juridique au cas par cas. Ne jamais contourner une authentification ou une protection anti-bot.

### C.3 MVP — pilote sur 5 sources (NOW)
Choisir 5 sources testant des comportements techniques différents (une facile, une dynamique, une avec données riches, une à structure difficile, une prioritaire pour le benchmark) — pas nécessairement les 5 plus grosses plateformes.

**Objets de données minimaux :**
```
Source Monitor : last_check, last_success, health, last_change, parser_version
Project Observation : platform, project_name, project_url, operator_raw,
                       amount_target, rate, duration, source_category,
                       location, status, observed_at
Snapshot : à chaque changement pertinent — ne jamais écraser l'état précédent
Events (liste volontairement réduite au départ) :
  PROJECT_DETECTED, FUNDING_OPENED, FUNDING_CLOSED,
  PROJECT_REMOVED, PROJECT_UPDATED
```
Ne pas tenter de détecter les seuils 25/50/75 % dès le départ si les plateformes ne publient pas la progression de façon fiable.

**Data Capture Reliability** (distinct de la santé technique) : surveiller aussi la santé de la donnée elle-même — ex. volume de projets observés habituellement (5–20/semaine) tombant à 0 sur 7 jours, ou taux de champ "taux" renseigné chutant de 97 % à 12 % → suspicion de dégradation du parseur, même si le crawler répond HTTP 200.

### C.4 Normalisation
Conserver `raw_value` et `normalized_value` séparément — ne jamais détruire la donnée source.
```
source_category : "Acquisition / rénovation"
atlas_segment   : "Marchand de biens avec travaux"
mapping_confidence : High / Medium / Low
```
Taxonomie Atlas à définir en amont (ex. Marchand de biens {sans travaux / avec travaux / division / vente à la découpe}, Promotion, Aménagement/foncier, Refinancement, Hôtellerie, Para-hôtellerie, Autres).

### C.5 Statistiques (NEXT — seulement une fois le pilote stable)
Premier dashboard, volontairement simple et toujours contextualisé (cf. 0.1) :
```
Market Activity — 30 jours
42 projets observés · 5 plateformes couvertes · 31,4 M€ proposés
11,6 % taux médian · 22 mois durée médiane

Coverage : 5 plateformes prioritaires sur 18
Source health : 5/5 opérationnelles
n = 42 projets · Fenêtre d'observation : 30 jours
```
Puis par segment (ex. "MDB avec travaux — n=17 — taux médian 11,8 % sur 17 opérations publiées par 5 plateformes sur 90 jours"), jamais présenté comme "Marché MDB = 11,8 %" sans ce contexte.

Pas de "Market Regime" (signal de tendance macro) tant que le volume d'observations ne le justifie pas — même exigence de seuil minimal que pour le track record opérateur (0.1).

### C.6 Benchmark underwriting (LATER)
Une fois le volume suffisant, comparables affichés au comité avec quartiles (pas seulement moyenne/médiane) :
```
Market comparables — MDB avec travaux · Rhône · 1,2 M€ · 24 mois · 11 %
23 comparables · 7 plateformes · 180 jours
Taux médian : 11,6 % (Q1–Q3 : 11,2–12,0 %)
Durée médiane : 22 mois · Montant médian : 970 k€
Positionnement : taux -60 bps vs médiane · durée +2 mois · montant +24 %
```
Ne décide rien — donne un contexte de pricing au comité.

### C.7 Couverture affichée
Toujours exposer ce qu'Atlas voit et ne voit pas :
```
Market coverage : 18 plateformes suivies · 17 opérationnelles · 1 source dégradée
92 % des sources prioritaires couvertes
```

---

## Architecture globale cible

```
                         ATLAS
               ┌─────────────────────┐
               │     DATA SOURCES    │
               └─────────┬───────────┘
                         │
        ┌────────────────┴─────────────────┐
        │                                  │
 INTERNAL / PORTFOLIO                EXTERNAL / MARKET
        │                                  │
        ▼                                  ▼
 EVIDENCE ENGINE                MARKET INTELLIGENCE ENGINE
        │                                  │
        └────────────────┬─────────────────┘
                         │
                         ▼
                 ENTITY / RELATION LAYER
                    PostgreSQL first
                         │
                         ▼
                   KNOWLEDGE GRAPH
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
 Operator / Group    Market Network   Dependency Network
        │                │                 │
        └────────────────┼─────────────────┘
                         ▼
                 ANALYTICAL ENGINES
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      Risk Engine   Contagion Engine  Market Analytics
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  DECISION ENGINE
                         │
                         ▼
                  RESPONSE ENGINE
```

---

## Priorisation d'ensemble (vue exécutive)

1. **Repondération du score de risque + 4 paliers + transparence** (Partie A.2) — corrige le problème de fond signalé au départ.
2. **Ontologie et modèle relationnel du Knowledge Graph** (Partie B.2) — fondation indispensable avant toute agrégation.
3. **Header condensé de fiche projet** (Partie A.3) — dépend du point 1 pour être fiable.
4. **Marge réelle vs BP + badges de fraîcheur systématiques** (A.6, 0.3) — gains rapides, données déjà collectées.
5. **Moteur de règles / playbooks** (A.4) — cœur de l'automatisation du plan d'action.
6. **Requêtes déterministes de premier niveau sur le graphe** (B.3) — groupe économique, garanties partagées, procédure collective.
7. **Pilote Market Intelligence sur 5 sources** (Partie C) — en parallèle ou juste après, selon bande passante disponible.
8. **Moteur de complétude + tracker d'actions avec SLA** (A.5, A.7).
9. **Agrégation portefeuille / risque de concentration** (A.8) — combine désormais grille de risque et Knowledge Graph.
10. **Contagion de premier niveau** (B.4), **sûretés dans le temps** (A.9).
11. **Gouvernance / audit trail** (A.10) — nécessaire mais moins urgent en usage interne.
12. **Reporting investisseur, benchmark underwriting** (A.11, C.6) — une fois les fondations stables.

---

*Prochaine étape suggérée : formaliser le playbook complet "procédure collective" (Partie A.4) en schéma JSON exploitable par un développeur, et l'ontologie minimale du Knowledge Graph (Partie B.2), en s'appuyant sur le dossier Le Traçotin (60) et les contreparties Axma Capital / Macber SARL comme cas de test.*

---

# Partie 2 — Complément D

# ATLAS — Spécification : modules d'entraînement au métier d'analyste investissement (fonds)
*Objectif de ce document : faire évoluer ATLAS pour qu'il pousse à réfléchir et pratiquer comme un analyste investissement en fonds (type poste RGREEN Invest), au-delà de son usage actuel de suivi de financement/crédit chez LPB. Ce document est un complément à la spec principale ATLAS_spec_v2.md, centré uniquement sur les 4 modules identifiés comme écart de compétence.*
**Doctrine transversale reprise de la spec principale** : aucune conclusion analytique ne s'affiche sans exposer la qualité de la donnée qui la soutient (n, période, coverage, freshness — cf. section 0 de la spec principale). S'applique aussi aux 4 modules ci-dessous.
**Priorité pédagogique déclarée** : parmi les 4 modules, le **module de sensibilité de scénario (D.1)** est identifié comme le plus formateur — écart de compétence le plus éloigné du métier actuel (financement à taux fixe vs modélisation d'investissement en capital), et le plus systématiquement attendu en entretien pour ce type de poste. À développer en premier.
---
## D.1 Module de sensibilité de scénario (priorité 1)
### Constat
Rien dans ATLAS aujourd'hui ne permet de faire varier les hypothèses d'un dossier (taux, durée, prix de sortie) pour observer l'impact sur la rentabilité. Le métier visé exige de "construire et faire évoluer les modèles financiers... exécuter les sensibilités définies par le responsable de transaction" — une compétence de modélisation dynamique, pas seulement de suivi d'un scénario figé.
### Fonctionnement
Pour un dossier donné (financé ou en cours d'analyse), permettre de faire varier une ou plusieurs variables clés et observer l'impact recalculé en temps réel sur les indicateurs de sortie :
**Variables ajustables :**
```
taux_interet          -- variation en points de base
duree                 -- variation en mois
prix_de_sortie_m2     -- variation en % ou en valeur absolue
montant_travaux       -- variation en % (si applicable au type d'opération)
délai_de_commercialisation -- variation en mois
```
**Indicateurs recalculés en sortie :**
```
marge_reelle_vs_bp     -- déjà existant dans ATLAS (A.6), à connecter ici
TRI                    -- taux de rentabilité interne du scénario
multiple_capital       -- capital rendu / capital investi
point_mort             -- prix de sortie minimum pour ne pas être en perte
```
### Modes de scénario
- **Scénario unique** : ajuster une variable à la fois, voir l'impact isolé (ex. "si le taux passe à 12%, quel impact sur la marge ?").
- **Scénarios prédéfinis** : Pessimiste / Central / Optimiste — trois jeux de variables préconfigurés, appliqués en un clic pour comparer côte à côte.
- **Tableau de sensibilité croisée (2 variables)** : ex. matrice prix de sortie (lignes) × délai de commercialisation (colonnes), avec le TRI ou la marge affichée dans chaque cellule — format standard en analyse d'investissement, à reproduire ici pour s'entraîner à le lire et le construire.
### Affichage
```
Scénario central (hypothèses actuelles du dossier)
TRI : X %  ·  Multiple : Y x  ·  Marge vs BP : Z %
Sensibilité — Prix de sortie
-10%        -5%         Central      +5%         +10%
TRI: A%     TRI: B%     TRI: C%      TRI: D%     TRI: E%
```
### Lien avec le reste du système
- Réutilise les données déjà présentes dans le dossier (BP, prix de sortie recherché via C.8, taux, durée cible) — pas de nouvelle saisie de données de base requise.
- Le calcul de marge réelle vs BP (déjà mentionné en A.6 de la spec principale) devient un cas particulier de ce module (scénario "réel constaté" comparé au scénario "BP initial").
---
## D.2 Générateur de note d'investissement
### Constat
Le poste visé demande de "rédiger tout ou partie des projets de documents... notes d'investissement, présentations d'étape au comité, synthèses de valorisation". ATLAS contient déjà la majorité des données nécessaires (header de risque, comparables de marché, CRD, historique) mais rien ne les compile en document de synthèse structuré façon comité d'investissement.
### Fonctionnement
Génération automatique d'un document de synthèse à partir des données déjà structurées du dossier, suivant une trame de note d'investissement standard :
```
1. Résumé exécutif
   - Opération, montant, taux, durée, porteur
   - Recommandation (à l'origine : go/no-go ; en suivi : statut actuel)
2. Présentation de l'opération
   - Localisation, typologie, montage juridique
   - Porteur de projet (données Knowledge Graph si disponibles — Partie B)
3. Analyse de marché
   - Comparables (internes et/ou externes — Parties B et C.8)
   - Positionnement du prix de sortie vs marché observé
4. Analyse financière
   - Business plan initial
   - Scénarios de sensibilité (module D.1)
   - Structure de financement, garanties (rang, montant, validité)
5. Analyse de risque
   - Score de risque actuel et évolution (Partie A.2)
   - Signaux et causes actifs (A.3)
   - Complétude du dossier (A.5)
6. Suivi (si dossier déjà financé)
   - Frise chronologique (A.3bis), CRD (A.3ter)
   - Historique des décisions et tâches
```
### Format de sortie
Document exportable (PDF ou Word — cf. skills documentaires disponibles), structuré avec les sections ci-dessus. Un mode "brouillon éditable" doit permettre d'ajuster le texte généré avant export — ATLAS compile la donnée factuelle, l'analyste garde la main sur la rédaction finale et le jugement qualitatif.
### Valeur pédagogique
Construire ce générateur, même de façon rudimentaire, oblige à définir précisément la structure d'une note d'investissement professionnelle — la compétence recherchée n'est pas seulement de savoir où trouver la donnée, mais de savoir comment l'organiser pour emporter une décision de comité.
---
## D.3 Dimension ESG
### Constat
RGREEN Invest est positionné sur la transition énergétique et mentionne explicitement le "suivi de la due diligence ESG interne" comme mission. ATLAS n'a aujourd'hui aucune dimension ESG — logique, ce n'est pas le métier de LPB, mais c'est un vocabulaire et une grille de lecture à s'approprier pour le poste visé.
### Fonctionnement minimal (volontairement simple, à visée d'apprentissage plutôt que de production)
Ajouter à chaque dossier un bloc de critères ESG basiques, renseignés manuellement à la saisie :
```
Environnement
  - Performance énergétique du bien (DPE — déjà en partie disponible via ADEME, cf. sources existantes)
  - Présence de matériaux/techniques bas-carbone (oui/non/inconnu)
  - Consommation d'eau/gestion des eaux pluviales (le cas échéant)
Social
  - Impact sur l'emploi local (ex. nombre d'emplois chantier estimé)
  - Accessibilité (PMR, mixité sociale si logement)
Gouvernance
  - Transparence du porteur de projet (déjà en partie couvert par le Knowledge Graph — Partie B : bénéficiaires effectifs, structure juridique)
  - Conformité réglementaire (permis, autorisations)
```
### Ce que ce module n'est pas
Ce n'est pas un scoring ESG normé (type taxonomie européenne ou référentiel SFDR) — construire un vrai référentiel ESG réglementaire serait disproportionné pour un usage d'entraînement personnel. L'objectif est de se familiariser avec les catégories et le vocabulaire, pas de produire un rapport ESG certifiable.
### Complétude de la section ESG (automatisable)
Comme pour la complétude générale du dossier déjà spécifiée en A.5 de la spec principale, calculer et afficher automatiquement un indicateur de complétude propre au bloc ESG, plutôt que de laisser les champs vides passer inaperçus :
```
Complétude ESG : X/8 champs renseignés (Environnement 2/3 · Social 1/2 · Gouvernance 2/2)
```
**Règle de calcul** : compter les champs du bloc ESG (D.3) effectivement renseignés (ni vide, ni "inconnu") sur le total de champs applicables au dossier — un champ marqué "inconnu" compte comme non renseigné, pas comme complet, pour ne pas masquer une vraie lacune d'information.
**Automatisation possible** :
- Recalcul automatique de ce taux de complétude à chaque modification du bloc ESG d'un dossier — pas besoin d'action manuelle de recalcul.
- Génération automatique d'un rappel/tâche (via le moteur de règles déjà spécifié en A.4) si un dossier passe en phase "Comité" ou "Suivi" avec une complétude ESG en dessous d'un seuil (ex. < 50 %) — cohérent avec le principe déjà acté qu'un franchissement de seuil déclenche une tâche, appliqué ici à la qualité de la donnée plutôt qu'à un risque financier.
- Ce taux de complétude peut s'agréger au niveau portefeuille (cf. F.2, dashboard agrégé) : "Complétude ESG moyenne du portefeuille : X %" — utile pour suivre ta propre progression dans l'appropriation de cette dimension, pas seulement dossier par dossier.
**Distinction importante** : ce taux de complétude est purement informatif et de suivi personnel (cohérent avec la vocation d'entraînement du module D.3) — il ne doit jamais être confondu avec un score de qualité ESG du projet lui-même. Un dossier peut avoir 100 % de complétude ESG (tous les champs renseignés) tout en ayant une mauvaise performance environnementale — la complétude mesure l'effort de documentation, pas la qualité de l'actif.
### Lien avec le reste du système
Champs optionnels sur la fiche projet, sans impact sur le score de risque (A.2) ni sur aucun calcul existant — strictement additif et informatif à ce stade. Le taux de complétude ESG suit la même logique que le moteur de complétude générale (A.5 de la spec principale), appliqué spécifiquement au bloc ESG.
---
## D.4 Indicateur de valorisation (TRI / multiple)
### Constat
Le CRD (A.3ter, spec principale) est une brique de suivi de crédit — combien reste dû. Le métier visé raisonne en performance d'investissement (TRI, multiple de capital), un référentiel différent de celui d'un prêteur. S'entraîner à manipuler ces indicateurs est nécessaire pour la transition visée.
### Fonctionnement
Pour chaque dossier remboursé (totalement ou partiellement), calculer et afficher :
```
TRI réalisé            -- taux de rendement annualisé réel, calculé à partir
                           des flux de trésorerie réels (capital investi,
                           dates et montants des remboursements reçus_et_validés — cf. A.3ter)
Multiple de capital     -- total perçu / capital investi
Durée réelle de détention -- distincte de la durée cible/contractuelle (A.3bis)
```
Vue agrégée portefeuille (à construire une fois plusieurs dossiers clôturés disponibles) :
```
TRI moyen du portefeuille clôturé
Distribution des TRI par typologie d'opération
Comparaison TRI réalisé vs taux contractuel nominal (l'écart révèle l'impact
  des retards, remboursements anticipés, ou dégradations)
```
### Point de méthode à trancher avant développement
Le calcul d'un TRI suppose une méthode de calcul actuariel précise (XIRR ou équivalent, gérant des flux à dates irrégulières) — à implémenter avec la même rigueur qu'un tableur financier professionnel, pas une approximation simplifiée, car c'est précisément l'outil que le métier visé utilise au quotidien.
### Lien avec le reste du système
Réutilise directement les données de remboursement déjà structurées pour le calcul du CRD (A.3ter) — même source de données, calcul complémentaire orienté performance plutôt qu'exposition résiduelle.
---
## Priorisation
| Module | Effort de développement | Valeur pédagogique | Dépendances |
|---|---|---|---|
| D.1 Sensibilité de scénario | Moyen | **Élevée — priorité 1** | BP existant, prix de sortie (C.8) |
| D.4 TRI / multiple | Moyen (rigueur XIRR nécessaire) | Élevée | Historique remboursements (A.3ter) |
| D.2 Générateur de note d'investissement | Élevé (structuration + export) | Moyenne-élevée | Quasi tous les modules existants |
| D.3 Dimension ESG | Faible | Moyenne (familiarisation vocabulaire) | Aucune |
**Séquençage recommandé** : D.1 en premier (déjà identifié comme priorité), suivi de D.4 (réutilise la même donnée de remboursement que le CRD, effort raisonnable), puis D.3 (rapide, faible risque), et enfin D.2 une fois les trois autres modules alimentés en données réelles à compiler.
---
*Ce document est un complément autonome à ATLAS_spec_v2.md — les renvois entre parenthèses (A.x, B.x, C.x) référencent les sections de ce document principal.*


---

# Partie 3 — Complément E

# ATLAS — Spécification : intégration de baromètre-crowdfunding.com (Market Intelligence)

*Complément autonome à ATLAS_spec_v2.md, Partie C (Market Intelligence Engine). Ce document couvre uniquement l'intégration de la source baromètre-crowdfunding.com.*

---

## E.1 Constat et intérêt de la source

**Ce que propose le site** (créé et maintenu par Nathanaël Dekeister, mis à jour régulièrement — dernière mise à jour observée : 20 avril 2026) :
- **28 plateformes de crowdfunding immobilier et ENR suivies**, avec méthodologie documentée et exposée publiquement ("Guide", "Détails du calcul" cliquables sur chaque indicateur).
- Un **score indicatif par plateforme** (composite retards/pertes/maturité), déjà utilisé implicitement dans ATLAS (les fiches Fundimmo/Koregraf vues précédemment en sont probablement issues).
- Un **taux de risque par plateforme** : % de capital hors échéancier initial ou en procédure, avec décomposition (montant, nombre de projets concernés / total).
- Une **vue "dynamisme"** : plateformes en croissance / stables / en ralentissement.
- Une **répartition globale du capital et des projets** par statut (remboursés, en cours sains, hors échéancier initial, procédures, pertes définitives).
- Un **flux RSS** (`/feed.xml`) signalant les mises à jour d'indicateurs par plateforme — canal structuré, bien plus stable qu'un scraping HTML classique.
- Une page dédiée par plateforme (`/platforms/[nom]`), avec historique d'évolution des indicateurs dans le temps.

**Pourquoi cette source est préférable à une reconstruction depuis zéro (cf. C.3 de la spec principale)** : elle a déjà résolu la difficulté principale identifiée dans le Market Intelligence Engine — normaliser des indicateurs hétérogènes entre 28 plateformes différentes (segments, méthodologies, granularités propres à chaque acteur). Reconstruire cette normalisation en interne serait un travail redondant si cette source reste fiable et à jour.

**Méthode de collecte du baromètre lui-même, confirmée** : collecte manuelle des indicateurs publiés par chaque plateforme sur ses propres pages "Statistiques"/"Indicateurs de performance" — donc des données déjà publiques à la source, agrégées ensuite par le baromètre. C'est un facteur positif pour la légitimité de la réutilisation (donnée déjà publique, republiée par une source tierce elle-même transparente sur sa méthode).

---

## E.2 Vérification préalable obligatoire (Source Registry, cf. C.2 de la spec principale)

**Non vérifié à ce stade — bloquant avant intégration :**
- CGU précises du site quant à la réutilisation automatisée de ses données (mentions légales présentes sur le site mais contenu non consulté en détail).
- robots.txt du domaine `barometre-crowdfunding.com`.
- Modalités d'usage du flux RSS : destiné à un usage de veille personnelle (lecteur RSS) ou explicitement ouvert à une réutilisation applicative tierce ?

**Recommandation avant tout développement** : contacter directement l'éditeur (contact visible sur le site, "Créé et maintenu par Nathanaël DEKEISTER") pour demander l'autorisation explicite d'intégrer les données à ATLAS (usage interne LPB), plutôt que de se fier uniquement à une lecture du robots.txt. Le site étant visiblement maintenu par une seule personne passionnée (pas une entreprise commerciale avec service juridique), une demande directe a de bonnes chances d'aboutir rapidement et évite toute ambiguïté — c'est aussi l'occasion d'obtenir un accès plus stable qu'un flux RSS public (export direct, accès prioritaire en cas de changement de structure du site).

Statut à consigner dans le Source Registry :
```
source_id: barometre-crowdfunding
access_method: flux RSS public (candidat) / à confirmer par contact éditeur
terms_reviewed: non — bloquant
collection_method: lecture du flux RSS + pages /platforms/[nom] si besoin de détail
health_status: 🟢 Operational (site actif, mise à jour récente confirmée)
coverage_status: 28 plateformes (couverture large, à comparer à la liste des plateformes suivies dans ATLAS)
```

---

## E.3 Ce qui est intégré à ATLAS

### Niveau plateforme (déjà en partie affiché dans ATLAS, à fiabiliser)
Pour chaque plateforme présente dans le Knowledge Graph d'ATLAS (domaine Market, cf. Partie B.8 de la spec principale) et couverte par le baromètre :
```
score_indicatif           -- composite retards/pertes/maturité, affiché avec la mention
                              "Score externe — baromètre-crowdfunding.com", jamais comme
                              un score Atlas natif (cf. principe 0.4 de la spec principale)
taux_de_risque             -- % de capital hors échéancier initial ou en procédure
capital_finance_total
capital_a_risque
nombre_projets_finances / nombre_projets_a_risque
dynamisme                  -- croissance / stable / ralentissement
derniere_mise_a_jour       -- horodatage de l'indicateur, pas de la consultation
                              (badge de fraîcheur, cf. principe 0.3 de la spec principale)
```

**Application immédiate du principe déjà acté (0.4, spec principale)** : remplacer l'affichage actuel observé sur les fiches Fundimmo/Koregraf ("Score 63/100 · Bon", "Score 0/100 · À surveiller") par un format neutre et sourcé :
```
Score externe (baromètre-crowdfunding) : 63/100
Dernière mise à jour : [date du dernier relevé, pas la date de consultation]
```
Le cas Koregraf, déjà identifié comme problématique dans les échanges précédents (0/100 uniquement parce que la plateforme est fermée, mélangeant statut plateforme et risque projet), doit être corrigé à l'intégration : distinguer explicitement **statut plateforme** (ouverte/fermée), **taux de risque du capital** et **score indicatif composite** — trois champs séparés, jamais fusionnés en un seul chiffre trompeur.

### Niveau marché global (nouveau pour ATLAS)
Reprendre les agrégats globaux du baromètre comme repère de marché, affichable en tête du Market Intelligence Engine (cf. C.5, C.7 de la spec principale) :
```
Marché crowdfunding immobilier — repère externe (baromètre-crowdfunding)
17 553 projets financés · 8 201,8 M€ financés au total
Répartition : remboursés / en cours sains / hors échéancier initial / procédures / pertes définitives
Dynamisme global : X plateformes en croissance, Y stables, Z en ralentissement
Dernière mise à jour : [date]
```
Ce bloc sert de contexte de marché — jamais mélangé avec les données propres au portefeuille LPB dans un même calcul, conformément à la distinction domaine Portfolio / domaine Market déjà actée en B.2.

---

## E.4 Mécanique de mise à jour

**Fréquence** : le flux RSS notifie les mises à jour au fil de l'eau (le site indique des mises à jour ponctuelles par plateforme, pas un cycle fixe). ATLAS doit donc consommer ce flux en mode événementiel plutôt qu'en interrogation périodique arbitraire :
```
Événement reçu via RSS → identifier la plateforme concernée → mettre à jour
les champs correspondants dans le Knowledge Graph (domaine Market) →
horodater la mise à jour (freshness)
```

**Fallback si le flux RSS devient indisponible** : reprendre la lecture directe des pages `/platforms/[nom]` en HTML, avec la même vigilance de robustesse déjà actée pour toute source scrapée (message d'erreur explicite en cas d'échec, jamais un échec silencieux — cf. C.8 de la spec principale).

---

## E.5 Lien avec le reste du système

- Alimente directement le Knowledge Graph (Partie B, domaine Market) pour les plateformes concurrentes déjà recensées dans ATLAS.
- Vient compléter, pas remplacer, la collecte multi-sources déjà prévue (C.3) — le baromètre couvre des indicateurs agrégés de performance, pas le détail projet par projet en cours de collecte (nom de projet, opérateur, statut individuel) qu'on cherchait à reproduire dans la discussion sur hellocrowdfunding. Les deux besoins restent complémentaires, pas substituables l'un à l'autre.
- Le score de risque propre au portefeuille LPB (Partie A.2) reste totalement indépendant de ce score externe — aucun mélange de calcul, uniquement un affichage côte à côte pour contexte.

---

## Priorisation

| Étape | Contenu |
|---|---|
| NOW | Contact éditeur pour autorisation explicite ; vérification CGU/robots.txt ; correction de l'affichage des scores déjà présents dans ATLAS (Fundimmo, Koregraf) pour respecter le principe 0.4 |
| NOW | Intégration du flux RSS en consommation événementielle sur les plateformes déjà recensées dans le Knowledge Graph |
| NEXT | Bloc de repère marché global en tête du Market Intelligence Engine |
| NEXT | Fallback HTML sur les pages `/platforms/[nom]` en cas d'indisponibilité du flux RSS |

---

*Ce document est un complément à ATLAS_spec_v2.md — les renvois entre parenthèses (A.x, B.x, C.x) référencent les sections de ce document principal.*

---

# Partie 4 — Complément F

# ATLAS — Spécification : vues inspirées de MARKO (Kanban, dashboard agrégé, covenants)

*Complément autonome à ATLAS_spec_v2.md. Objectif : reproduire, avec les données déjà disponibles dans ATLAS, trois éléments observés sur le site marketing de MARKO — sans dépendre de leur produit réel, uniquement inspiré de la présentation publique de leurs fonctionnalités. À tester et adapter après rédaction.*

**Rappel de méthode** : tout ce document reprend le principe déjà acté dans la spec principale (section 0) — aucune métrique agrégée ne s'affiche sans indiquer sur combien de dossiers elle porte, ni sans badge de fraîcheur le cas échéant.

---

## F.1 Vue Kanban des tâches

### Constat
ATLAS a déjà un onglet "Tâches" par dossier (nom, priorité, date d'échéance — cf. captures "Point durée cible", priorité "Haute"/"Moyenne"). Ce qui manque : un regroupement visuel par statut et un typage de tâche, pour scanner rapidement l'ensemble des tâches ouvertes sans ouvrir dossier par dossier.

### Fonctionnement
Vue transversale (au niveau portefeuille, pas seulement par dossier), organisée en colonnes de statut :
```
À faire          En cours          Terminé (masqué par défaut, filtrable)
─────────        ─────────         ──────────
[Carte tâche]     [Carte tâche]
[Carte tâche]
```

**Contenu d'une carte tâche :**
```
Type            -- Reporting / Finance / Juridique / Commercialisation / Suivi cible
Titre            -- ex. "Point durée cible — Faire un point avec le porteur"
Dossier lié      -- ex. "Le Traçotin (60)" — cliquable vers la fiche
Échéance         -- date, avec mise en évidence si dépassée
Priorité         -- Faible / Moyenne / Haute (déjà existant)
```

### Typage des tâches
Nouveau champ `type_tache` à ajouter aux tâches existantes et à toute tâche générée automatiquement par les playbooks (cf. A.4 de la spec principale) :
```
type_tache: "reporting" | "finance" | "juridique" | "commercialisation" | "suivi_cible" | "autre"
```
Les tâches déjà générées automatiquement (ex. "Point durée cible") doivent se voir attribuer un type par défaut cohérent (`suivi_cible` dans cet exemple) au moment de leur création par le moteur de règles.

### Filtres
- Par type de tâche
- Par dossier
- Par échéance (cette semaine / ce mois / en retard)
- Par owner (si plusieurs analystes utilisent ATLAS)

### Lien avec le reste du système
- Alimente et est alimenté par le tracker d'actions déjà spécifié (A.7 de la spec principale) — cette vue Kanban est une couche de présentation supplémentaire sur les mêmes données, pas un nouveau système de tâches parallèle.
- Les tâches générées par les playbooks (A.4) apparaissent automatiquement dans cette vue dès leur création.

### Effort estimé
Faible — réorganisation d'affichage sur des données déjà existantes, ajout d'un seul champ (`type_tache`). Aucune nouvelle source de données ni calcul complexe.

---

## F.2 Dashboard portefeuille agrégé

### Constat
ATLAS calcule déjà, dossier par dossier : score de risque (A.2), palier (Faible/Surveillance/Élevé/Critique), CRD (A.3ter). Il manque une vue de synthèse au niveau du portefeuille entier, façon "vue d'ensemble" pour un fund manager qui n'a pas le temps d'ouvrir chaque dossier.

### Fonctionnement
Bloc de synthèse en tête de l'onglet Portefeuille (ou nouvel onglet dédié "Vue d'ensemble") :

```
Actif                        Objectif Sortie (24 mois)
71                            2
[montant total exposé] €      [montant total visé] €
TRI moyen pondéré : X %

Perte                         Sorti / Remboursé
1                             6
[montant total] €             [montant total] €  ·  TRI moyen : X %

Score de risque moyen du portefeuille : X/100
[Répartition par palier : Faible / Surveillance / Élevé / Critique, en nombre et en k€]
```

**Sources des données, toutes déjà disponibles :**
```
"Actif"                → nombre de dossiers en statut "Suivi" + somme des CRD (A.3ter)
"Perte"                → dossiers en statut défaut/procédure collective avérée avec
                          perte actée (nécessite de définir ce déclencheur — cf. point ouvert ci-dessous)
"Sorti / Remboursé"     → dossiers avec date_remboursement_effectif renseignée (A.3bis)
                          + calcul TRI/multiple (module D.4)
Score de risque moyen   → moyenne pondérée par exposition (CRD) des scores individuels (A.2)
Répartition par palier  → agrégation des paliers de risque déjà calculés par dossier
```

### Point ouvert à trancher avant développement
Comment définir formellement le déclencheur "Perte" (perte actée, pas simplement "à risque") ? Ex. seuil : liquidation judiciaire prononcée + délai de recouvrement épuisé, ou décision manuelle de l'analyste de marquer un dossier en perte définitive. À clarifier avant d'implémenter ce compteur, sinon le chiffre affiché serait mal défini.

### Répartition par statut (visuelle)
Reproduire la logique de répartition vue chez MARKO (répartition par statut : Instruction / Travaux / Commercialisation / Clôture, avec montant associé à chaque statut) — à adapter au cycle de vie déjà défini dans ATLAS (Sourcing / Analyse / Comité / Montage / Suivi / Remboursé / Défaut, cf. stepper existant et frise A.3bis) plutôt que de copier telle quelle la terminologie de promotion immobilière de MARKO qui ne correspond pas exactement au métier de financement participatif.

### Lien avec le reste du système
- Combine A.2 (score de risque), A.3ter (CRD), A.3bis (statut de remboursement) et D.4 (TRI/multiple) — aucune nouvelle donnée de base à collecter, uniquement de l'agrégation.
- Recoupe directement A.8 de la spec principale (agrégation portefeuille / risque de concentration), déjà identifié comme prioritaire — ce module F.2 en est une version enrichie avec la dimension TRI en plus.

### Effort estimé
Moyen — nécessite des requêtes d'agrégation sur plusieurs sources déjà existantes, mais pas de nouvelle collecte de données ni de nouvelle logique de calcul lourde (le TRI est déjà scopé en D.4).

---

## F.3 Suivi des ratios de covenant (LTV, ICR, DSCR)

### Constat
Aucun de ces ratios n'existe aujourd'hui dans ATLAS. C'est un vrai écart par rapport au métier visé (analyse d'investissement, cf. document de formation D) et une fonctionnalité mise en avant par MARKO comme différenciante.

### Définition des ratios, adaptés au contexte crowdfunding immobilier (à valider)
```
LTV (Loan-to-Value)
  = CRD (A.3ter) / valeur du bien (ou du projet à la sortie visée, cf. C.8 recherche de prix marché)
  Déjà partiellement calculable : le CRD existe, la valeur de sortie est obtenue via C.8.

ICR (Interest Coverage Ratio)
  = résultat opérationnel du projet / charges d'intérêts sur la période
  Nécessite une donnée de résultat opérationnel qui n'existe pas forcément
  pour une opération de marchand de biens ponctuelle (plus pertinent pour
  des actifs générant un revenu locatif récurrent) — à vérifier si ce ratio
  a un sens pour la typologie d'opérations suivies dans ATLAS, ou s'il faut
  l'adapter/l'écarter selon les cas.

DSCR (Debt Service Coverage Ratio)
  = flux de trésorerie disponible / service de la dette (capital + intérêts dus)
  Même remarque que pour ICR : pertinence à valider selon le type d'opération
  (achat-revente ponctuel vs actif générant des revenus récurrents).
```

**Point de vigilance méthodologique** : contrairement au LTV (directement applicable, données déjà présentes), ICR et DSCR sont des ratios plus naturels pour du financement d'actifs à revenu récurrent (immobilier locatif, infrastructure) que pour du marchand de biens à cycle court sans revenu d'exploitation pendant la détention. À valider avec un professionnel de la structuration de dette avant implémentation : peut-être que seul le LTV est réellement pertinent pour le portefeuille actuel, ICR/DSCR devenant utiles seulement si ATLAS s'étend à d'autres typologies d'opérations à l'avenir.

### Affichage
```
Ratios de covenant                    Seuil          Statut
LTV                    X %            < Y %          🟢 / 🟠 / 🔴
ICR (si applicable)    X x            > Y x          🟢 / 🟠 / 🔴
DSCR (si applicable)   X x            > Y x          🟢 / 🟠 / 🔴
```
Seuils configurables par typologie d'opération, pas une valeur unique globale.

### Détection de rupture de covenant
Si un ratio franchit son seuil, générer automatiquement une alerte reliée au moteur de règles déjà spécifié (A.4) — cohérent avec le principe "franchissement de seuil = tâche automatique", déjà en place pour la durée cible.

### Lien avec le reste du système
- Le LTV réutilise directement CRD (A.3ter) et prix de marché (C.8) — aucune nouvelle collecte de donnée nécessaire pour ce ratio en particulier.
- ICR/DSCR nécessiteraient une nouvelle donnée (résultat opérationnel / flux de trésorerie du projet) actuellement non collectée dans ATLAS — à évaluer si ça vaut l'effort de collecte avant de développer le calcul.

### Effort estimé
Faible pour le LTV seul (données déjà là) ; moyen à élevé pour ICR/DSCR (nouvelle collecte de données + validation de pertinence métier à faire en amont).

---

## Priorisation

| Module | Effort | Dépendances | Recommandation |
|---|---|---|---|
| F.1 Kanban des tâches | Faible | A.7 (tracker d'actions existant) | À tester en premier — pur réaffichage |
| F.2 Dashboard portefeuille agrégé | Moyen | A.2, A.3ter, A.3bis, D.4 | À tester en second — agrégation de données déjà existantes |
| F.3 LTV seul | Faible | A.3ter, C.8 | À tester en troisième — ratio isolé, données déjà présentes |
| F.3 ICR/DSCR | Moyen-Élevé | Nouvelle collecte de données + validation métier | À différer — nécessite d'abord de trancher la pertinence pour le type d'opérations suivies |

---

*Ce document est un complément à ATLAS_spec_v2.md — les renvois entre parenthèses (A.x, C.x, D.x) référencent les sections de ce document principal ou du document de formation investisseur (ATLAS_spec_module_formation_investisseur.md).*

---

# Partie 5 — Refonte globale v2.0

# Atlas Capital — spécification de refonte globale

Version 2.0 — 27 septembre 2026
Statut : base fonctionnelle validée par Nicolas, paramètres opérationnels et contractuels à renseigner avant réalisation des fonctions concernées.

## 0. Objet, périmètre et lecture

Atlas doit devenir le système de travail qui relie opportunité → analyse → décision → engagement → suivi → résultat, pour deux activités :

1. Dette : préqualification, instruction, décision, financement, surveillance, échéances, remboursements et résolution des incidents. Cet espace est accessible à Nicolas et aux seules personnes expressément habilitées ; il n'est pas accessible à l'associé du fractionné.
2. Immobilier fractionné : sourcing, analyse, montage, relation avec les plateformes, acquisition, travaux, exploitation et sortie. L'espace de travail commun est accessible à Nicolas et à l'associé selon leurs responsabilités.

La vue personnelle de Nicolas peut réunir des actions issues des deux espaces, tout en conservant le contrôle d'accès de chaque action. La vue de l'associé ne contient que les informations du fractionné. Un agrégat, une recherche, une notification ou une réponse de l'assistant ne doivent jamais contourner cette séparation.

Cette spécification complète ATLAS_Spec_Cockpit_Fractionne_v1.md et transpose les constats F01–F32 de ATLAS_Examen_Fonctionnel_2026-09-27.md en lots réalisables. Elle n'atteste ni l'état du code, ni l'existence d'intégrations, ni l'exactitude de données externes : ces points demandent un audit technique du dépôt et des sources avant implémentation. GitHub est reporté ; le document est conçu pour préparer la réalisation sans présumer un accès au dépôt.

### Résultat attendu

• Ouvrir Atlas et savoir ce qui exige une décision, une action ou une attente, avec propriétaire, échéance, contexte et lien direct.
• Consulter une valeur et comprendre définition, périmètre, unité, date, source, version et calcul.
• Enregistrer une décision humaine traçable, puis comparer ses hypothèses à la réalité.
• Automatiser la collecte, les contrôles, le rapprochement et la préparation des actions, avec une intervention humaine sur les décisions et communications engageantes.
• Mesurer les améliorations par le temps gagné, les erreurs évitées et la qualité des décisions ; ne pas utiliser le nombre d'alertes ou de champs remplis comme objectif.

## 1. Décisions de conception et motifs

| Décision | Règle de conception | Motif et conséquence |
|---|---|---|
| D01 — Dossier maître | Une opportunité a un identifiant stable ; pipeline, préqual, portefeuille, documents, actions et événements sont des vues ou objets liés. | Supprime les statuts parallèles constatés sur Zeki et limite la double saisie. Ne pas fusionner automatiquement deux noms ressemblants. |
| D02 — Espaces étanches | Autorisation contrôlée au serveur sur chaque objet et ses enfants, y compris fichiers, agrégats, recherche et IA. | La dette ne doit pas devenir visible via le cockpit commun, un export ou une URL devinée. Le simple masquage du menu est insuffisant. |
| D03 — Valeur et preuve séparées | Valeur, unité, assiette, date, version, provenance et statut de vérification sont des champs distincts. | Résout les unités ambiguës et les conclusions tirées de garanties ou de critères non vérifiés. |
| D04 — Inconnu n'est pas zéro | `absent`, `non applicable`, `estimé`, `confirmé zéro` et `confirmé positif` sont distincts. | Évite des rendements à 0 % et des CAPEX à 0 € lorsqu'un dénominateur ou un budget manque. |
| D05 — Calcul, règle, décision | Un calcul produit une métrique ; une règle produit une anomalie ou un blocage qualifié ; seule une personne habilitée produit `poursuivre`, `refuser`, `engager`, `clore`. | Évite qu'un montage incomplet soit compté comme un refus commercial. |
| D06 — Actions issues d'événements | Une variation significative crée ou met à jour une action dédupliquée, avec cause, personne, date, dépendance et résolution. | Transforme la veille et les tableaux de bord en travail concret et réduit le bruit. |
| D07 — Historique conservé | Document, hypothèse, offre, décision, calcul publié et observation réelle sont versionnés ; une correction ne réécrit pas une décision passée. | Permet d'expliquer une recommandation ancienne avec les informations disponibles à ce moment. |
| D08 — Deux parcours métier | Dette et fractionné partagent identité, preuves, tâches et événements, mais gardent étapes, calculs, seuils et habilitations spécifiques. | Évite un formulaire universel trop long ou un indicateur trompeur. |
| D09 — Réalisé opposable au prévisionnel | Plan initial approuvé, dernier plan actualisé et flux observés restent comparables. | C'est la condition pour apprendre des écarts et piloter un actif après l'investissement. |
| D10 — Automatisation vérifiable | Imports, extractions et brouillons indiquent source et confiance ; incohérences sont exposées ; actions externes demandent validation. | Réduit le temps administratif sans faire passer une interprétation pour un fait. |
| D11 — Connecteurs mesurés | Chaque source affiche dernier succès, latence, taux d'échec et date de dernière vérification humaine. | Un connecteur annoncé mais non opérationnel ne doit pas donner l'impression d'une veille exhaustive. |
| D12 — Priorités mesurables | Chaque lot a ses prérequis, sa recette, un retour arrière possible et un indicateur d'usage. | Empêche qu'une nouvelle interface masque des calculs contradictoires. |

## 2. Accès, rôles et navigation

### 2.1 Matrice fonctionnelle

| Objet/action | Nicolas | Associé fractionné | Autre personne habilitée |
|---|---|---|---|
| Dette : dossiers, acteurs, documents, encours, tâches, recherche, IA et exports | Selon habilitation dette | **Aucun accès** | Droit explicite, limité par rôle et dossier |
| Fractionné : sourcing, fiches techniques, visites et pièces | Lecture/écriture | Lecture/écriture dans l'espace commun | Droit explicite |
| Fractionné : hypothèses économiques, conditions plateforme et gestionnaire | Pilote ; écriture et décision selon pouvoirs | Lecture et commentaires ; modification si délégation explicite | Droit explicite |
| Décisions engageantes, transmission externe, budgets et sortie | Selon délégations convenues | Selon délégations convenues | Droit explicite |
| Vue personnelle transversale | Actions de ses deux espaces | Actions du fractionné uniquement | Espaces autorisés uniquement |

Les droits exacts d'engagement, les seuils de dépenses et le circuit de remplacement en cas d'absence sont à définir par les associés. Atlas doit pouvoir les paramétrer et les dater, sans inventer de pouvoir par défaut. L'accès aux pièces sensibles peut être plus restreint que celui au dossier. Journaliser consultations et exports sensibles selon une politique de conservation définie.

Recette sécurité : connecté comme associé, toute tentative de consulter dette par URL, API, recherche, suggestions, notification, rapport, export ou question à l'IA renvoie un résultat sans donnée de dette. Une action transversale adressée à Nicolas ne transporte pas de détail dette dans un canal auquel l'associé a accès.

### 2.2 Trois vues utiles

• Mes priorités (Nicolas) : À décider, À faire, En attente tiers ; À attribuer pour les exceptions critiques sans propriétaire. Dette et fractionné y sont identifiés, avec regroupement par dossier et sans divulgation entre espaces.
• Fractionné partagé : dossiers, décisions à deux, sourcing de l'associé, analyse Nicolas, travaux, gestion locative et échéances. Affiche charge et blocages, sans score automatique du mérite de chacun.
• Dette : pipeline et portefeuille, échéances, engagements contractuels, flux, garanties, incidents, contreparties et concentrations.

Une carte, une veille et une recherche globale ne sont affichées que si elles sont opérationnelles et filtrées par les mêmes autorisations. Les pages existantes restent atteignables pendant la migration, avec redirection vers les objets maîtres après vérification.

## 3. Référentiel de données et règles de calcul

### 3.1 Objets communs

| Objet | Champs/invariants minimaux |
|---|---|
| `workspace` / `membership` / `grant` | Espace, utilisateur, rôle, portée dossier, droit, période de validité et auteur de l'habilitation. |
| `opportunity` | Identifiant stable, espace, activité, source, actif/projet, responsable, étape et issue ; liens vers acteurs et dossiers antérieurs. |
| `party` / `party_relation` | Identité légale vérifiable, noms alternatifs, rôle, relation datée, source, qualité de rapprochement ; plusieurs contacts possibles. |
| `evidence` / `fact` | Fichier ou URL autorisée, version, date, page, champ extrait, valeur, unité, vérification, validité, sensibilité. |
| `assumption_set` / `model_run` | Scénario, versions des entrées, formule/version du moteur, résultat, état de calculabilité et date. |
| `decision` | Question, options, choix, motif, décideur, périmètre, date, versions et preuves consultées. |
| `event` / `action_item` | Événement source, sévérité, règle/version, dossier, propriétaire, échéance, statut, déduplication, lien profond, preuve de clôture. |
| `document_request` | Pièce requise, stade, condition d'applicabilité, tiers attendu, échéance, document reçu, vérification. |
| `integration_run` | Source, licence ou permission, état, couverture, dernière collecte, erreurs, volume, fraîcheur des données. |

Tous les objets enfants portent un workspace_id contrôlé à l'écriture et à la lecture. Une relation entre espaces n'accorde aucun droit d'accès implicite. La recherche et l'indexation de l'IA héritent des droits de l'objet source. Conserver les anciennes valeurs ambiguës dans une zone historique à confirmer et demander leur qualification avant calcul final.

### 3.2 Dictionnaire financier obligatoire

| Terme | Définition et séparation requises |
|---|---|
| Principal initial | Montant effectivement financé, avec dates des tirages si fractionnés. |
| Principal restant dû | Principal initial et tirages moins principal effectivement remboursé, à une date donnée. |
| Intérêts courus / échus / encaissés | Trois montants distincts ; ne pas les incorporer silencieusement au principal. |
| Créance totale | Somme des composantes contractuelles explicitées, à une date donnée. |
| Encours portefeuille | Agrégat du principal restant selon une liste de statuts et un périmètre publiés ; pont de réconciliation avec les autres vues. |
| LTV initial / actualisé / de covenant | Numérateur, valeur de référence, date, version et règle contractuelle distincts. |
| Valeur de garantie | Nominal, preuve juridique, rang applicable, estimation de réalisation et chevauchement séparés ; pas de somme qualifiée automatiquement de couverture effective. |
| Flux fractionné | Flux de l'actif, des investisseurs, du véhicule, de la plateforme et des porteurs séparés ; assiette et bénéficiaire de chaque frais. |

Les calculs utilisent un type monétaire avec devise et convention d'arrondi documentée. Un pourcentage inclut son assiette (% du prix, % des loyers encaissés, etc.). Une date civile d'échéance reste une date civile dans tous les écrans, même si le serveur est en UTC ; le compte à rebours nomme l'événement. Les ratios non calculables affichent la variable manquante, sans zéro substitué. Toute statistique publie sa population et sa date de référence.

### 3.3 Qualité et provenance

Statuts de fait : non renseigné, extrait automatiquement à confirmer, déclaré par tiers, vérifié par personne, contredit, périmé, non applicable. Une donnée vérifiée peut devenir périmée à l'échéance de validité. Pour chaque conclusion importante, Atlas affiche les trois informations les plus influentes et celles qui la rendent incertaine. Un contrôle de cohérence doit comparer pièce, rent roll, modèle et reporting avant d'actualiser un indicateur publié.

## 4. Parcours Dette : de l'instruction à la résolution

| Étape | Données et contrôles | Automatisations | Porte humaine |
|---|---|---|---|
| Origination / préqual | Porteur, galaxie d'entreprises et liens justifiés, projet, besoin, calendrier, précommercialisation, urbanisme et financement existant. | Détection de dossiers/acteurs semblables ; checklist adaptée ; synthèse courte avec questions bloquantes. | Poursuivre, demander des éléments, ajourner ou abandonner, avec motif. |
| Instruction | Bilan emplois/ressources, marges et scénarios, sûretés, garanties, conditions de tirage, documents juridiques, covenants applicables. | Calculs explicables, contradictions, pièces manquantes, brouillon de note de comité. | Avis et décision enregistrés avec version et réserves. |
| Montage / engagement | Termes finaux, signataires, conditions préalables, tirages et échéancier. | Comparaison accord vs dernière analyse ; rappels des conditions avant décaissement. | Confirmation des conditions et de l'engagement par rôle habilité. |
| Suivi actif | Livrables attendus, travaux, commercialisation, situation financière, sûretés, échéances, événements société et actualisation des risques. | Rappels conditionnels, lecture du reporting, variation de seuils et dossiers à revoir ; cadence selon risque réel. | Qualification de l'alerte et plan d'action. |
| Remboursement / incident | Flux attendus, reçus, affectation capital/intérêts/frais, retard confirmé, intérêts et actions de résolution. | Rapprochement, écarts, relances proposées, projection de récupération avec hypothèses séparées. | Validation du statut, de la communication et des décisions de restructuration ou de clôture. |

### 4.1 Échéancier et grand livre des flux

Créer un échéancier versionné et un registre append-only des flux observés, chacun avec date de valeur, montant, origine et justificatif. Rapprocher selon référence et montant ; les rapprochements ambigus restent à traiter. Configurer l'ordre contractuel d'affectation des flux et conserver son historique. Distinguer prévu, prévision échue à confirmer, partiellement reçu, reçu et rapproché, écart à analyser, incident confirmé. Un défaut n'est pas déduit de la seule absence de saisie. Réconcilier la somme du principal, des intérêts et frais avec les agrégats de portefeuille.

Exemple de recette : une échéance de 100 000 € prévue au 4 octobre, dont 60 000 € reçus, devient partiellement reçu, avec le solde et sa ventilation ; le calcul de principal n'est actualisé qu'après validation du rapprochement. Si aucun flux n'est accessible, Atlas indique données de flux indisponibles.

### 4.2 Contrats, garanties et covenants

Chaque engagement a sa formule, son seuil, sa fréquence, sa source, son responsable et ses exceptions. Un ratio contractuel calculé sur des données non vérifiées reste à confirmer. Les garanties ont des catégories adaptées à leur nature : sûreté réelle, caution, assurance, nantissement, etc. Afficher nominal et rang uniquement quand ils ont un sens pour cette garantie, puis documents, opposabilité/statut déclaré, vérification, valeur estimée et dépendances à la même contrepartie. La qualification juridique et la valeur de réalisation doivent être validées par les professionnels compétents ; Atlas documente le raisonnement, il ne les certifie pas.

### 4.3 Galaxie des acteurs et risque de contagion

Relier personnes et sociétés par des relations datées et sourcées : direction, participation, contrôle, garantie, opération commune, adresse commune, événement public. Une correspondance de nom ou d'adresse produit une relation candidate, jamais une identité certaine. Un événement sur une autre entreprise de la galaxie peut générer signal à examiner si le lien et la transmission plausible du risque sont indiqués. Éviter qu'une procédure éloignée devienne automatiquement un défaut du dossier financé. Conserver la provenance et les contraintes d'utilisation de chaque source.

### 4.4 Analyses de portefeuille

Comparer encours, échéances, statut des flux, concentrations par groupe/plateforme/zone/type d'actif, exposition garantie et évolution des cohortes. Les courbes de retards, défauts et récupérations ne mélangent pas population, millésime et définition. Un score expert peut orienter l'attention ; son niveau, son intervalle d'incertitude et la priorité de traitement sont trois informations distinctes. Réviser et calibrer un modèle prédictif seulement après constitution d'un historique propre et suffisamment large.

## 5. Parcours Fractionné : sélection, exécution et portefeuille

La spécification ATLAS_Spec_Cockpit_Fractionne_v1.md détaille déjà les étapes et le binôme ; les fonctions suivantes l'étendent.

### 5.1 Sourcing et mémoire des décisions

L'associé peut saisir une opportunité en quelques minutes : source, actif, localisation, ordre de grandeur du prix, interlocuteur et prochaine étape. Atlas propose les liens vers dossiers existants et crée une préqual courte. Les refus, abandons, pertes, attentes et dossiers financés ailleurs ont des motifs distincts, datés et rattachés aux hypothèses. Une nouvelle offre ressemblant à un dossier passé propose un rappel contextualisé, sans copier automatiquement une ancienne conclusion.

Décision : conserver également les dossiers non poursuivis. Raison : identifier doublons, vendeurs et biais de sélection ; mesurer à terme quelles raisons de refus correspondaient à des risques avérés. L'analyse des motifs ne prétend pas prouver qu'un dossier refusé aurait réussi.

### 5.2 Interlocuteurs, plateformes et conditions

Une fiche relation relie personnes, structures, rôle, affaires présentées, dates de réponse, engagements tenus et pièces obtenues. Les critères et offres des plateformes sont versionnés, avec preuve et état à confirmer quand ils n'ont pas été communiqués. Une opération peut avoir plusieurs candidatures indépendantes. Les répartitions de frais envisagées ne deviennent des revenus contractés qu'après accord identifié. Une vue compare montant, contraintes, calendrier, frais, obligations de reporting et points ouverts ; elle conserve le nom de l'interlocuteur et la version des conditions.

### 5.3 Moteur de scénarios

Pour un actif, figer le scénario de présentation ou d'acquisition approuvé ; conserver ensuite des scénarios central, dégradé et sévère avec variations explicites de loyers, vacance, coûts, CAPEX, financement, durée, rendement exigé et valeur de sortie. Calculer flux de l'actif puis flux par bénéficiaire ; comparer TRI, multiple, distributions et capital restitué avec un pont de réconciliation. Si la collecte ou une assiette manque, les métriques qui en dépendent affichent non calculable. Si deux scénarios ont les mêmes entrées, Atlas signale qu'ils ne testent rien de différent.

### 5.4 Baux, exploitation et gestionnaire

Créer un registre des baux avec loyer actuel, charges, indexation, franchise, garantie, échéances, options de sortie, identité du locataire, encaissements et preuve. Générer une fenêtre d'action avant les dates pertinentes, réglable selon le bail et les pouvoirs du gestionnaire. Le gestionnaire fournit un reporting standard périodique : rent roll, appels, encaissé, impayés, charges, travaux et incidents. Atlas rapproche ce reporting du budget et du précédent état, prépare les questions à adresser et signale les retards de livraison. Nicolas pilote la relation avec le gestionnaire ; l'associé traite l'expertise technique suivant le circuit convenu.

### 5.5 Budget travaux et modifications

Pour chaque poste : non chiffré, estimé, devis reçu, approuvé, engagé, facturé, payé ; quantité, prix, TVA le cas échéant, responsable, calendrier, réserve et pièce. Une modification présente coût et délai potentiels avant approbation ; après approbation, elle actualise le budget et déclenche le recalcul du financement et du scénario. Une facture ne devient pas un coût réalisé sans rapprochement. L'associé qualifie l'avancement et les devis ; Nicolas mesure l'effet financier ; l'engagement suit les pouvoirs décidés à deux.

### 5.6 Suivi réel, sortie et apprentissage

Pour chaque période : budget approuvé, dernier prévisionnel, réalisé et variance expliquée. Inclure loyers, impayés, OPEX, CAPEX, cash disponible, baux, valorisation datée et conditions de sortie. Une sortie exige flux datés et pièces justificatives ; le résultat final n'est jamais prérempli. Comparer les hypothèses originales aux réalisations, puis classer les écarts : hypothèse erronée, événement imprévisible, mauvaise exécution, donnée initiale absente ou modification voulue. Ce classement est une analyse humaine appuyée par des calculs.

## 6. Intelligence documentaire et veille

### 6.1 Documents orientés décision

Une checklist varie selon activité, phase, type d'actif et plateforme/contrat. Les pièces qui bloquent la prochaine décision sont affichées avant le taux global de complétude. L'extraction assiste l'utilisateur : champ suggéré, citation de la page, éventuelle contradiction avec la base, date et validation. Une réponse de l'assistant à une question sur un dossier indique ses pièces consultées et sépare fait, calcul, hypothèse et recommandation. Si les sources sont insuffisantes, la réponse est je ne peux pas conclure avec les pièces nécessaires.

### 6.2 Veille et détection

Pour les annonces de collecte, conserver COLLECTE_ANNOUNCED et COLLECTE_OPENED avec source, horodatage observé, identifiant projet, plateforme et degré de confirmation. Dédupliquer les reprises et changements de page. Relier les sociétés de projet et opérateurs au graphe après vérification de l'identité. Fréquence par source et permissions, avec une cible rapide seulement si faisable et utile ; afficher la latence réelle. Sources publiques, API, flux, newsletters et échanges intégrés suivent leurs droits et conditions d'usage. Les cinq watchers observés comme non opérationnels ne sont pas présentés comme couverture active avant test de bout en bout.

### 6.3 Alertes et charge cognitive

Moteur de règles conditionnelles par étape et rôle : un reporting mensuel n'est attendu que si le financement est actif et que l'obligation existe. Grouper les signaux liés à un même dossier et à une même cause ; retarder les notifications non urgentes ; permettre acquittement motivé, mise en attente et rappel. Une alerte de veille générale n'a pas la même priorité qu'une échéance contractuelle, une garantie expirée ou une incohérence qui invalide une décision. Chaque alerte affiche pourquoi elle est remontée, sa source, son destinataire et l'action possible.

## 7. Automatisation : déclencheurs, sorties et contrôle

| Déclencheur | Traitement automatique | Intervention attendue |
|---|---|---|
| Nouveau dossier ou document | Recherche de doublons candidats, extraction, checklist et préqual provisoire. | Confirmer identité et données utilisées dans l'analyse. |
| Pièce nouvelle ou modifiée | Recalcul des métriques affectées ; comparaison à la décision enregistrée ; liste des contradictions. | Valider nouvelle version et rouvrir une décision si nécessaire. |
| Échéance approchante ou dépassée | Action attribuée selon l'obligation et calendrier ; rappel gradué et dédupliqué. | Qualifier le statut réel, contacter un tiers si nécessaire. |
| Reporting tiers reçu | Extraction, rapprochement au contrat et à la prévision, variance et brouillon de questions. | Confirmer les exceptions et approuver l'échange externe. |
| Flux de remboursement reçu | Rapprochement au contrat et à l'échéancier, proposition d'affectation. | Résoudre ambiguïtés et valider l'imputation. |
| Devis/avenant travaux | Impact sur budget, délai, réserves et scénarios ; proposition de décision. | Approbation suivant les pouvoirs documentés. |
| Événement sur une société liée | Vérification de l'identité, de la relation et de l'exposition ; signal contextualisé. | Juger pertinence et éventuelle action de risque. |
| Fin de dossier | Génération de comparaison prévision/réalisé et d'un résumé des enseignements. | Qualifier les causes et approuver la clôture. |

Chaque tâche automatique possède état en attente, en cours, réussi, échoué, à revoir, historique, propriétaire technique, reprise idempotente et signalement d'erreur. Un nouvel essai ne duplique ni dossier ni notification. Les tâches prioritaires ne dépendent pas d'une visite sur l'interface pour s'exécuter. L'envoi à un tiers, la validation d'une décision ou d'une extraction engageante et l'ouverture d'un accès externe requièrent un utilisateur habilité.

## 8. Expérience et performance

• Page d'accueil : trois actions prioritaires par domaine et vue complète filtrable ; expliquer classement par échéance, gravité, impact et blocage d'un tiers. Ouvrir directement la section pertinente du dossier.
• Dossier : résumé court, prochaine décision, qualité des données, écarts, chronologie et pièces bloquantes ; détail complet accessible sans faire défiler douze onglets pour une préqual.
• Recherche : noms alternatifs, projet, société, adresse et identifiant ; résultats filtrés par habilitation. Corriger le cas où parc ne retrouve pas Parc 149.
• Rapidité : mesurer temps d'ouverture, temps de recherche, génération de préqual et traitement d'événement avec jeux représentatifs du portefeuille. Les objectifs chiffrés sont fixés après mesure initiale, puis testés sur ordinateur et mobile ; ne pas annoncer un seuil sans mesure.
• Accessibilité : états lisibles sans couleur seule, dates et unités explicites, navigation clavier, retours d'erreur compréhensibles.
• Carte : afficher un état d'indisponibilité et une vue liste utilisable si la clé ou le fond cartographique manque ; vérifier les droits d'affichage de toute géodonnée sensible.

## 9. Sécurité, conservation et exploitation

L'audit fonctionnel n'a pas certifié la sécurité réelle. Avant déploiement, vérifier dans le code et l'infrastructure : authentification et sessions, autorisation côté serveur, isolation des espaces, permissions des fichiers et index de recherche, secrets, chiffrement en transit et au repos, sauvegardes, restauration testée, journaux d'accès, rétention, export et suppression, rotation des accès, surveillance des erreurs et coûts des connecteurs. Prévoir environnements distincts de développement et production ; les copies de production destinées aux essais sont masquées ou synthétiques. Toute intégration externe consigne provenance, permission, limites de débit, arrêt sur erreur et traitement des données personnelles.

Une restauration réussie sur un environnement isolé est un critère de sortie, avec vérification de l'intégrité des dossiers, pièces, relations et droits. Les événements métier et les erreurs techniques disposent d'identifiants de corrélation ; un administrateur peut identifier quelle source ou règle a créé une action. La stratégie de conservation et les droits sur des données liées à l'activité salariée de Nicolas doivent être validés avant import ; aucun transfert de données de l'employeur n'est présumé autorisé.

## 10. Migration et séquence de réalisation

| Lot | Livrables et dépendances | Recette de sortie |
|---|---|---|
| **A — Socle fiable** | Dictionnaire financier, unités, `inconnu ≠ 0`, dates, calculabilité, statuts et décisions séparés ; inventaire du code et des sources. | F01–F06 corrigés ; chiffres dette réconciliés ; migration des valeurs ambiguës sans conversion silencieuse. |
| **B — Identité et droits** | Dossier maître, liens préqual/pipeline/portefeuille, espaces et autorisations en profondeur, recherche filtrée, sauvegardes. | Zeki relié sans doublon ; associé exclu de tous les chemins de lecture dette ; restauration vérifiée. |
| **C — Actions et parcours** | Cockpits personnel/partagé/dette, tâches événementielles, étapes spécifiques, demandes documentaires. | Chaque blocage majeur crée une action pertinente ; compteurs fractionnés et portefeuille cohérents ; 54 tâches historiques requalifiées sans pertes. |
| **D — Dette opérationnelle** | Échéancier, engagements, garanties, rapprochement des flux si source disponible, concentrations et incidents. | Parcours L'Aiguille réexaminé : métriques, garanties, échéances et risque expliqués ; rapprochement démontré sur cas contrôlés. |
| **E — Fractionné opérationnel** | Relations et plateformes, scénarios, baux, CAPEX, gestionnaire, comparaison prévision/réalisé. | Parc 149 et Action montrent clairement les inconnues ; scénarios différenciés ; action technique et financière attribuée. |
| **F — Intégrations et apprentissage** | Veille réellement mesurée, extraction assistée, graphes d'acteurs sourcés, mémoire des refus, analyses de cohortes et rapports. | Taux de couverture et échecs visibles ; historique exploitable ; aucun score prédictif sans données suffisantes et validation. |

Un lot peut être livré en incréments plus petits. Chaque incrément inclut migration réversible, test d'autorisation, vérification des calculs affectés et mesure de son usage. Conserver une correspondance avec les anciens identifiants ; identifier les dossiers possiblement dupliqués (Le Arnold/Le Arnorld) comme candidats à revue. Les calculs historiques publiés restent consultables avec leur version.

## 11. Scénarios de recette transversale

1. Parc 149 — unité : 3 € et 3 % du prix ont des résultats distincts ; une saisie ancienne 3 est à confirmer ; sens et détail de l'écart sources/emplois sont visibles.
2. Action Saint-Étienne — collecte absente : rendement investisseur et solveur sont non calculables, jamais 0 % ni hors de portée ; les calculs indépendants restent disponibles.
3. Portefeuille dette — encours : bandeau, cockpit et portefeuille montrent définition, date et sous-population ; une liste d'inclusions/exclusions réconcilie 39 M€, 59 M€ et 37 M€ observés ou identifie les erreurs à corriger.
4. L'Aiguille — garanties : deux montants nominaux non vérifiés ne deviennent pas une protection certaine de 220 % ; hypothèque, caution, rang et valeur de réalisation ont leurs champs et preuves propres.
5. L'Aiguille — dates et risque : date contractuelle, vote et garantie sont distincts ; compte à rebours identique selon fuseau ; risque et priorité d'action utilisent les mêmes définitions sur toutes les vues.
6. Zeki — continuité : préqual, pipeline et portefeuille partagent l'identité de l'opération, avec étapes et décisions datées ; une conversion relancée ne crée pas un second dossier.
7. Fractions — absence de décision : plan incomplet produit montage à corriger, sans refus humain fictif ni dégradation du taux de conversion.
8. Baux et travaux : un avenant de bail ou un devis approuvé recalcule les métriques affectées et propose une revue de décision ; version précédente consultable.
9. Flux dette : une échéance partiellement reçue se ventile sans confondre principal, intérêts et frais ; absence d'import = état inconnu, pas défaut présumé.
10. Veille : annonce et ouverture de collecte ont deux événements distincts, sans duplication à chaque passage ; connecteur défaillant visible.
11. Droits : associé sans accès dette par toute surface, y compris agrégats et IA ; tâche fractionnée partagée reste accessible selon rôle.
12. Sortie et mémoire : résultat final exige flux datés ; note compare hypothèses et réalisés ; dossiers abandonnés restent recherchables avec motif sans être comptés comme financés.

## 12. Mesure de valeur et arbitrages encore ouverts

Indicateurs de départ et d'après livraison : temps de qualification d'une opportunité, part des tâches en retard réellement pertinentes, proportion de dossiers avec prochaine action et responsable, taux de pièces critiques sourcées, taux de rapprochement des flux, contradictions financières non résolues, délai de détection d'un événement, proportion de connecteurs opérationnels, temps de production d'un rapport et taux de décisions dont le résultat peut être comparé à l'hypothèse initiale. Mesurer sur un échantillon stable ; publier le dénominateur.

Paramètres à trancher avant les modules correspondants :

1. Périmètre exact et autorisation d'usage des données dette, notamment toute donnée liée à l'activité salariée ; utilisateurs habilités en plus de Nicolas.
2. Sources des flux réels, formats, fréquence et propriétaire de la réconciliation ; sans ces flux, le suivi des remboursements reste un registre déclaratif.
3. Pouvoirs respectifs des associés, seuils de travaux, validation des transmissions et circuit d'urgence.
4. Plateformes, gestionnaires et intermédiaires prioritaires ; critères/conditions confirmés par écrit versus hypothèses commerciales.
5. Périodicité et format de reporting exigibles de chaque gestionnaire ou opérateur ; pièces contractuellement dues.
6. Règles de calcul métier et conventions juridiques validées pour les garanties, covenants, frais, fiscalité et distribution ; Atlas doit rester configurable quand elles diffèrent par contrat.
7. Objectifs de délai et volume de la veille, après test réel des sources, permissions, coûts et taux d'erreur.

Ces paramètres n'empêchent pas de réaliser les lots A et B. Ils empêchent de figer silencieusement des règles commerciales ou juridiques sans fondement.

## 13. Références de benchmark et portée

Les fonctions des éditeurs ci-dessous ont servi de repères de conception ; leur documentation commerciale ne démontre ni leur performance sur Atlas ni la disponibilité de leurs données pour nous. Les choix d'Atlas ci-dessus sont des propositions adaptées à nos parcours.

• Dealpath, pipeline, historique des opérations et contexte entre acquisition et portefeuille : https://www.dealpath.com/ ; https://www.dealpath.com/portfolio-insights/ ; https://www.dealpath.com/dispositions/
• Intapp DealCloud, sourcing et intelligence des relations : https://www.intapp.com/dealcloud/
• Altus ARGUS Enterprise, modélisation des flux immobiliers et scénarios : https://www.altusgroup.com/solutions/argus-enterprise/ ; https://www.altusgroup.com/webinars/how-to-do-portfolio-modeling-analysis-in-argus-enterprise/
• Finley, covenants, livrables contractuels et analyse du portefeuille de dette : https://www.finleycms.com/platform/portfolio-analytics ; https://www.finleycms.com/solutions/loan-servicing
• LoanPro, règles d'affectation des paiements et notifications événementielles : https://www.loanpro.io/payments/ ; https://help.loanpro.io/automated-communication
• VTS, échéances locatives, vacance et risque de renouvellement : https://www.vts.com/
• Procore, modifications de travaux liées au budget : https://www.procore.com/fr/gestion-financiere/ordres-de-changement
• Juniper Square, données d'investissement, performance et reporting : https://www.junipersquare.com/platform ; https://www.junipersquare.com/finance-and-reporting/investor-reporting

Documents internes à lire ensemble : ATLAS_Examen_Fonctionnel_2026-09-27.md (faits observés et limites de l'examen) ; ATLAS_Spec_Cockpit_Fractionne_v1.md (parcours et responsabilités détaillés). Le présent document arbitre la structure globale et les nouveaux modules ; en cas de divergence, vérifier l'état réel de l'application et faire trancher la règle métier avant développement.

---

*Statut d'implémentation (tenu à jour au fil des livraisons) : Lot A/B — stopgap D02 livré (`DetteScopeGuard`, `User.workspaceScope`), voir PR #26 ; couvre les contrôleurs exclusivement Deal/dette, ne couvre pas encore les objets partagés/polymorphes ni le dossier maître (D01). Reste de la migration (Lots A à F) non commencé — paramètres de la section 12 à trancher avant les modules concernés.*

---

# Partie 6 — Cockpit et Fractionné v1.0

# Atlas Capital — spécification fonctionnelle : cockpit et fractionné

**Version :** 1.0 — 26 septembre 2026
**Statut :** cadrage produit à valider avant développement
**Périmètre :** cockpit, liste et fiche Fractionné, liens avec tâches, documents et partenaires
**Sources de cadrage :** captures d'écran du cockpit et des fiches Fractionné transmises le 26/09/2026 ; échanges avec Nicolas sur le projet conduit avec un associé. Les chiffres et statuts visibles dans les captures sont des exemples de données existantes, pas des hypothèses validées par une plateforme.

## 1. Objectif et principes

Atlas doit répondre à trois questions en moins d'une minute : **que devons-nous décider, quelle action fait avancer chaque dossier, et qui en est responsable ?** Le cockpit est une file de décisions et d'actions. Les analyses approfondies restent dans les dossiers. Le parcours Fractionné doit permettre de qualifier rapidement une opportunité, vérifier sa présentabilité à une ou plusieurs plateformes, préparer sa transmission, puis suivre l'acquisition et la détention.

Principes contraignants :

- Un chiffre calculé peut être affiché avec ses hypothèses ; il ne devient une **conclusion** que si les données minimales requises et le référentiel de décision sont présents.
- `0`, `non renseigné`, `non applicable` et `non vérifié` sont quatre états différents. Une absence de donnée ne devient jamais automatiquement zéro.
- Chaque alerte actionable porte un motif, une action, un responsable, une échéance et un lien profond vers l'endroit où agir. Les compteurs sans action restent dans les vues d'analyse.
- Une opération est rattachée à un espace de travail explicite. Les données de l'activité salariée et celles du projet entrepreneurial ne sont jamais agrégées par défaut ni accessibles par simple changement de filtre non autorisé.
- Une hypothèse commerciale (partage de frais, critères de plateforme) est étiquetée `à négocier`, `proposée` ou `contractualisée`, avec source et date ; elle n'est pas présentée comme un accord.
- L'IA peut aider à extraire et résumer des informations, mais ne valide pas seule une source, un contrat ou une décision d'investissement.

## 2. Constat sur l'existant et corrections urgentes

| Constat sur les captures | Effet produit | Comportement attendu |
| --- | --- | --- |
| Le cockpit juxtapose dix dossiers à risque, encours, graphiques, frais, remboursements, échéances et activité récente. | La priorité du jour reste difficile à lire ; beaucoup de boutons « Ouvrir ». | Afficher d'abord les décisions et actions dues, filtrées par espace et type de dossier. |
| « Le parc 149 » affiche `Refusé` et `hard stop`, alors qu'aucun profil plateforme n'est assigné et que 47/47 champs critiques sont indiqués non sourcés. | Une conclusion apparaît sans base suffisante. | `Non évaluable` pour le fit plateforme ; afficher les preuves et paramétrages manquants. Un hard stop n'est possible que si son fait déclencheur est établi et sourcé. |
| Hurdle plateforme `0 %`, écart `+6,31 pt` et indicateur partiel « Éligible ». | Un profil absent est assimilé à un seuil nul ; messages contradictoires. | Seuil `—` et écart `—` en l'absence de profil ; indicateur immobilier descriptif sans badge d'éligibilité globale. |
| Scénarios Base et Bear visibles avec mêmes paramètres. | Le stress affiché ne teste pas la sensibilité. | Signaler `Scénario identique au cas central` ; ne pas présenter sa sortie comme un stress testé. |
| Data room à 0 % et 48 pièces manquantes dès un dossier en structuration. | Tous les manques ont le même poids et la même urgence. | Checklists adaptées à l'étape et au type d'actif, avec pièces nécessaires **maintenant**, **avant présentation**, **avant acquisition**. |
| Fiche Fractionné avec une douzaine d'onglets et des informations économiques, juridiques et locatives détaillées. | Coût de saisie élevé dès le sourcing. | Fiche de qualification courte ; instruction détaillée progressive lorsque le dossier franchit un seuil de décision. |
| Dans « Mémoire », le résultat final propose `Succès` par défaut. | Une issue non réalisée peut être enregistrée par erreur. | Aucun résultat final préselectionné ; écran réservé aux dossiers sortis et à leur date effective. |

Ces constats décrivent l'affichage observé, pas une revue du code ni une validation des formules financières.

## 3. Architecture des espaces et navigation

### 3.1 Espaces

Chaque objet métier porte un `workspace_id`. Au minimum : `Projet entrepreneurial` et, seulement si l'usage est autorisé, un espace distinct pour l'activité professionnelle. Le choix d'espace est visible en haut de page et persiste pendant la session. Le cockpit, la recherche, les notifications, les comparables, l'IA, les exports et les agrégats respectent le même périmètre. Les accès de l'associé se limitent à l'espace entrepreneurial et à ses dossiers autorisés. Ne pas dupliquer automatiquement des informations issues d'un autre espace.

### 3.2 Navigation proposée

Dans l'espace entrepreneurial : `Cockpit` → `Opportunités` → `Fractionné` → `Partenaires` → `Documents` → `Analyse` → `Paramètres`. Les modules génériques existants restent accessibles selon les droits, mais n'occupent pas toute la navigation de premier niveau. La liste Fractionné montre le pipeline ; la fiche détaillée conserve ses onglets existants, regroupables en `Décision`, `Actif & baux`, `Modèle & structure`, `Risques & documents`, `Suivi & mémoire`. Le regroupement est une amélioration UX, pas une migration obligatoire du modèle de données.

## 4. Cockpit — vue et comportement

### 4.1 Vue d'ouverture

1. **Bandeau de contexte :** espace actif, date de dernière synchronisation, propriétaire de la vue, raccourci `Nouvelle opportunité` et filtre `Tous / Fractionné / autres activités`.
2. **À décider :** jusqu'à cinq cartes, ordonnées par échéance réelle et impact d'un blocage. Chaque carte comporte opération, étape, décision attendue, motif en une phrase, responsable, échéance et CTA spécifique (`Qualifier`, `Vérifier le bail`, `Choisir une plateforme`, `Décider poursuivre/arrêter`). Bouton secondaire `Voir les détails`.
3. **À faire / En attente :** deux colonnes séparées. Une action à faire par nous n'est pas mélangée à une réponse attendue d'une plateforme ou d'un vendeur. Relance proposée seulement si la date prévue est échue ; possibilité de reporter, déléguer ou clore avec motif.
4. **Pipeline fractionné compact :** nombres par étape et liste des dossiers qui ont changé d'étape ou sont bloqués. Un clic filtre la liste Fractionné.
5. **Performance utile :** pistes reçues, qualifiées, présentées, accords de principe et acquisitions signées sur une période choisie ; taux de conversion calculé sur des cohortes cohérentes et délais médians lorsque l'échantillon le permet. Avec deux dossiers, afficher les nombres bruts, pas un pourcentage spectaculaire.
6. **Économie :** honoraires encaissés, contractés non encaissés et scénarios non contractuels en colonnes distinctes. Revenus de détention et de sortie ventilés par année et attribués à la structure, jamais confondus avec le volume d'acquisition ou la collecte.

Les vues historiques `Encours`, `Frais`, `Remboursements`, `Concentration`, graphiques et journal d'activité deviennent une page `Analyse` ou des vues propres à chaque espace. Un widget indisponible ne prend pas une carte entière sur le cockpit ; un état technique compact suffit.

### 4.2 Règles de la file d'actions

Une entrée est créée par une décision explicite, un contrôle bloquant, une échéance, une relance planifiée ou une alerte de suivi dont le propriétaire est identifié. Elle comporte `source_object_id`, `cause`, `action_type`, `owner_id`, `due_at`, `status`, `created_at`, `resolved_at`, `resolution_reason`, `deep_link`. La même cause ne génère qu'une action ouverte par dossier. Un changement de donnée résout ou réévalue automatiquement l'action ; une modification ultérieure peut la rouvrir avec historique. Priorité calculée principalement à partir du caractère bloquant et de la date, avec possibilité de classement manuel motivé ; ne pas recycler un score de risque opaque en ordre de travail.

États : `À faire`, `En attente externe`, `À décider`, `Terminée`, `Écartée`. Toute ligne doit proposer une action réelle et une issue ; `Ouvrir` seul ne remplit pas cette exigence. Les notifications regroupent les événements identiques et évitent de relancer quotidiennement une attente sans changement.

### 4.3 Exemple attendu

`Le parc 149 · Structuration · Fit plateforme non évaluable : aucun profil assigné · Nicolas · [Choisir une plateforme]`. Une deuxième action éventuelle peut traiter les pièces critiques, mais le cockpit n'affiche pas 48 alertes identiques. `Action Saint-Étienne · Analyse · Bail et conditions économiques à vérifier · Associé/Nicolas selon attribution · [Demander les pièces]` est un exemple de formulation, à condition que ces manques soient effectivement présents dans le dossier.

## 5. Fractionné — parcours d'un dossier

### 5.1 Étapes et portes de décision

| Étape | Question à trancher | Minimum requis pour passer | Actions principales |
| --- | --- | --- | --- |
| Piste | L'actif mérite-t-il une qualification ? | Adresse ou secteur, type, source, vendeur/contact, fourchette de prix ou mention inconnue. | Assigner, demander les données, écarter avec motif. |
| Qualification | Vaut-il une analyse approfondie ? | Prix ou fourchette, loyer connu ou à confirmer, occupation, baux clés, travaux connus, stratégie envisagée, premiers risques et inconnues. | Poursuivre, demander pièces, abandonner. |
| Analyse | La thèse tient-elle sous hypothèses réalistes ? | Sources datées pour prix et baux, coûts d'acquisition, exploitation, scénarios distincts, points bloquants. | Valider l'analyse interne ou réviser. |
| Plateformes ciblées | À qui présenter quoi ? | Une ou plusieurs plateformes candidates, critères connus/inconnus, interlocuteur et version de l'offre envisagée. | Contacter, comparer, demander critères ; fit `Non évalué` si critères absents. |
| Présentation | Le dossier transmis est-il complet pour cette plateforme ? | Pack demandé par la plateforme, synthèse, sources et points ouverts explicités ; contrôle humain. | Générer pack, approuver, enregistrer transmission. |
| Accord et montage | Les conditions sont-elles acceptables pour notre structure et les investisseurs ? | Accord de principe identifiable, hypothèses économiques documentées, parties prenantes, conditions suspensives et responsables. | Comparer offre/hypothèses, négocier, approuver ou refuser. |
| Collecte / acquisition | Quelles conditions restent à lever avant la signature ? | Jalons, financement et documents requis à ce stade ; dates et interlocuteurs. | Suivre collecte et conditions, préparer acquisition. |
| Détention | Quels écarts exigent une action ? | Baux, échéances, loyers encaissés, charges, réserves, CAPEX, rapports d'agence. | Valider reporting, traiter impayé, renouvellement, travaux. |
| Sortie | Quelle décision de cession et quel résultat réel ? | Valorisation datée, coûts, obligations, décision et flux réels. | Préparer sortie, comparer prévision/réalisé, clôturer. |

La transition est journalisée (`avant`, `après`, auteur, date, motif). `Abandonné`, `En sommeil`, `Refusé par plateforme` et `Cédé` sont des issues distinctes des étapes actives. Une présentation à plusieurs plateformes ne duplique pas l'actif ni ses baux : chaque candidature est un sous-objet avec son propre statut.

### 5.2 Qualification courte

Formulaire d'une page, saisie manuelle possible en quelques minutes. Champs obligatoires limités à identité de l'opportunité, type, localisation, source et responsable ; les autres sont explicitement `inconnus` si absents. Les caractéristiques de l'actif alimentent automatiquement les onglets d'analyse existants. À la sortie, Atlas produit une fiche de décision courte : thèse, trois atouts maximum, trois risques maximum, questions à résoudre, prochaine action et responsable. Pas de collecte automatique de 48 pièces à ce stade.

### 5.3 Plateformes et relations

Un référentiel versionné par plateforme contient type d'actifs, tailles, contraintes locatives, rendement cible si communiqué, durée, frais, rôle opérateur, contact, statut de vérification, date et source. Les critères non communiqués restent `à confirmer`. Une même opération peut avoir plusieurs `platform_applications` : plateforme, contact, étape, date du premier échange, dernier retour, prochaine relance, critères comparés, offre reçue, raison de refus. Aucune note de fit n'utilise un hurdle implicite `0 %`.

### 5.4 Décision et preuve

Séparer trois états sur la synthèse :

- **Données :** `À réunir / À vérifier / Suffisantes pour cette étape`, avec les trois pièces qui débloquent la décision. Un score de complétude éventuel porte sur la checklist pertinente à l'étape et affiche son dénominateur.
- **Analyse de l'actif :** `Non analysé / Thèse à approfondir / Risque bloquant vérifié / Analyse favorable sous réserves`, avec motifs, hypothèses et sources.
- **Adéquation plateforme :** `Non évaluée / À confirmer / Présentable sous conditions / Non conforme`, séparément pour chaque plateforme et version de ses critères.

Une règle de blocage exige `rule_id`, condition observée, source, date, auteur ou extraction vérifiée, portée (actif ou plateforme), possibilité de lever le blocage et action associée. Si la preuve manque : `à vérifier`, jamais `hard stop`. Les résultats de calcul sont distincts d'un vote humain `poursuivre / suspendre / abandonner`, horodaté et motivé. Ne pas utiliser `Refusé` sans préciser **qui** a refusé : comité interne ou plateforme nommée.

### 5.5 Modèle économique et scénarios

Conserver les calculs d'acquisition, loyers, OPEX, CAPEX, réserves, fiscalité, valorisation, TRI et waterfall existants ; ajouter une vue décisionnelle concise. Séparer les flux de l'actif, ceux des investisseurs, de la plateforme, du véhicule et de la structure portée par Nicolas et son associé. Pour chaque frais ou pourcentage : assiette, montant, bénéficiaire, moment du paiement, prise en charge économique, TVA si pertinente, caractère négocié/confirmé et document source. Vérifier que sources et emplois s'équilibrent ; une différence ou une unité ambiguë (`3` euros ou `3 %`) bloque l'export d'un résultat présenté comme final.

Scénarios `central`, `dégradé`, `sévère` : prix, vacances/impayés, OPEX, CAPEX, croissance des loyers, durée, taux de sortie, frais de cession et délais peuvent varier. Atlas compare les entrées et signale si deux scénarios sont identiques. Rendre visibles les impacts sur distribution, couverture des charges, rendement investisseur, rendement de la structure et valeur de sortie ; un même taux de distribution ne doit pas masquer un risque de perte en capital. Une hypothèse de partage, notamment 50/50 sur frais, 95/3/2 sur loyers et 60/15/25 sur plus-value, est un **scénario de travail** tant qu'elle n'est pas documentée par un accord. Le modèle doit accepter d'autres répartitions et la possibilité qu'aucune rémunération de ce type ne soit acceptée.

La prévision de revenus distingue `réalisé`, `contractualisé`, `proposé`, `hypothétique` et affiche la part de chaque associé ou de la société seulement si elle est renseignée. L'objectif annuel de 250 k€ est une cible de rémunération à définir (chiffre d'affaires, résultat de structure ou revenu personnel) avant tout écart à objectif ; aucune comparaison trompeuse avec les honoraires bruts ou la collecte.

### 5.6 Documents, baux, données et mémoire

Chaque donnée critique garde valeur, unité, source, date de source, date de saisie, auteur, état de vérification et lien vers pièce/page si possible. Une extraction automatique est `à confirmer` jusqu'à validation humaine. Un nouveau bail ou avenant recalcule les indicateurs concernés et signale les décisions à revoir. Les quinze lignes de rent roll du parc 149 doivent pouvoir être importées, rapprochées des baux et contrôlées sur la somme des loyers, les échéances, garanties, indexations, charges, impayés et périodes de franchise. Les statuts « Sécurisé » et « À surveiller » doivent être motivés et reliés à la preuve.

La data room utilise une checklist par étape, type d'actif et exigences de la plateforme. Les doublons sont identifiés ; un document peut répondre à plusieurs contrôles. Afficher en premier les pièces qui bloquent **la prochaine décision**, puis la complétude globale en vue secondaire. La mémoire enregistre décisions, scénarios, offres, résultats réels périodiques et comparaison prévision/réalisé. Le résultat final n'a aucune valeur par défaut ; il est disponible après sortie et exige date, prix/flux réels et source avant calcul du TRI réalisé.

## 6. Modèle de données minimal à ajouter ou adapter

Ne pas imposer de nouvelle base si les tables existantes peuvent porter ces relations ; cette liste décrit les invariants fonctionnels.

- `workspace` et `membership` : espace, utilisateur, rôle, droits par dossier.
- `opportunity` : identifiant stable, type `fractionné`, étape, issue, responsable, source, dates et actif lié.
- `decision` : question, choix, motif, auteur, date, version du dossier, sources consultées.
- `action_item` : cause, type, responsable, statut, échéance, lien profond, résolution.
- `platform_profile` et `platform_criterion` : version, valeur, unité, provenance, vérification, validité.
- `platform_application` : relation dossier/plateforme, statut, échanges, offres, prochaines actions.
- `evidence` : document ou information externe, origine, date, niveau de vérification et droits.
- `assumption_set` : version, scénario, auteur, date, valeurs et provenance.
- `economics_term` : assiette, montant/pourcentage, bénéficiaire, statut de négociation, contrat.
- `stage_requirement` : exigence conditionnelle par étape, type d'actif et plateforme ; caractère bloquant et preuve attendue.
- `event_log` : changements significatifs, recalculs, notifications et accès/export sensibles.

Prévoir identifiants, horodatages, `workspace_id` et contrôle d'accès sur les lignes enfants, y compris fichiers, tâches, recherche et résultats d'IA. Une source révisée ne doit pas effacer l'historique d'une décision prise avec l'ancienne version.

## 7. Automatisation et limites

Automatiser l'import de données autorisées, l'extraction de pièces, le rapprochement des baux et des hypothèses, le calcul des métriques, la génération des checklists, les rappels à échéance, le brouillon de synthèse et le suivi des écarts de reporting. Une intégration mail future peut rattacher un échange à une candidature plateforme avec confirmation de l'utilisateur en cas d'ambiguïté. Toute action externe (envoi à une plateforme, partage de data room) reste une action explicite d'un utilisateur habilité. L'automatisation doit donner sa source et permettre de corriger une extraction.

## 8. Priorités de livraison

**P0 — fiabilité (avant exposition d'un nouveau cockpit) :** distinguer absent/0 ; corriger le `Refusé` et le hurdle à 0 sans profil ; empêcher qu'une éligibilité partielle soit globale ; supprimer `Succès` par défaut ; isoler les espaces et les agrégats ; tester les calculs monétaires clés sur dossiers connus.

**P1 — MVP utilisable à deux :** qualification courte, étapes, action/responsable/échéance, bloc `À décider`, candidats plateformes multiples, checklist progressive et vues de synthèse par dossier. Migrer les deux dossiers existants sans perte ; leurs champs incertains restent explicitement incertains.

**P2 — économie et collaboration :** versions de conditions, comparatif de plateformes, prévision des flux de la structure, conversions par cohorte, événements déclenchant des tâches, historique de décision et import documentaire.

**P3 — automatisations avancées :** extraction assistée, rapprochement de documents, reporting locatif automatisé, intégrations de communication et simulations multi scénarios enrichies. Prioriser à partir de l'usage réel après les premiers échanges plateformes.

## 9. Critères d'acceptation et cas de test

1. Sur « Le parc 149 » sans profil plateforme, le seuil et l'écart sont `—`, le fit est `Non évalué`, et le CTA mène à `Choisir/comparer une plateforme`. Aucune décision `Refusé` automatique ne résulte de l'absence de profil ou de pièces.
2. Un risque juridique ou technique sans preuve apparaît `À vérifier`. Après ajout d'une preuve et validation, un blocage documenté peut être créé avec motif et action.
3. Une opportunité nouvelle peut être saisie et qualifiée sans compléter les douze onglets ni 48 pièces. La checklist s'étend à mesure qu'elle avance.
4. Un même actif peut être proposé à deux plateformes avec critères, statuts et échanges séparés ; modifier l'une ne modifie pas l'autre.
5. Une action résolue disparaît de `À faire` et reste dans l'historique ; une attente externe ne se transforme en relance qu'à l'échéance prévue.
6. Les scénarios Base et Bear identiques déclenchent un avertissement. Une modification de vacance ou de valeur de sortie met à jour les flux et la comparaison sans écraser la version antérieure.
7. Les frais et partages hypothétiques ne sont jamais inclus dans les revenus réalisés ou contractés ; l'assiette et la somme des répartitions sont contrôlées.
8. Un utilisateur de l'espace entrepreneurial ne peut retrouver les données d'un autre espace par URL directe, recherche, export, notification ou assistant IA.
9. Le cockpit indique les trois actions les plus pertinentes des dossiers Fractionné et ouvre directement l'écran et le champ concernés, sur ordinateur comme sur mobile.
10. Le formulaire de résultat final ne préselectionne ni `Succès` ni aucun TRI réalisé. Un résultat exige des flux datés et une preuve.

## 10. Questions ouvertes à arbitrer avec les deux associés

1. Le cockpit doit-il afficher uniquement le projet entrepreneurial par défaut, ou permettre un changement vers un espace professionnel distinct si cet usage est autorisé ?
2. Qui peut prendre la décision finale `poursuivre/abandonner`, qui peut modifier les hypothèses financières et qui peut transmettre un dossier à une plateforme ?
3. Quelle est la définition de la cible `250 k€ annuels` : chiffre d'affaires de la structure, résultat distribuable ou revenu personnel net ; quelle répartition entre associés ?
4. Pour les premières plateformes contactées, quels critères et modalités économiques ont été **confirmés**, lesquels restent des hypothèses ?
5. Quel dossier pilote sert à vérifier le parcours complet : Action Saint-Étienne, Le parc 149, ou un nouveau dossier plus simple ?

**Hors périmètre de cette version :** refonte des calculs fiscaux et juridiques, choix définitif du véhicule d'investissement, envoi automatique de dossiers à des tiers et prédiction de rendement par IA. Ces sujets exigent des informations et validations propres à chaque opération.

---

*Statut d'implémentation : la quasi-totalité des P0/P1/P2 de cette spécification a été livrée au fil des PR de cette session (compaction Cockpit "À décider"/listes latérales, qualification courte, platform_application, checklist progressive, historique de décision, import rent roll CSV — voir tâches #94-108). Reste ouvert : les questions de la section 10 (jamais tranchées par les deux associés) et l'isolation d'espace réelle (§3.1, §9 critère 8) — couverte partiellement par le stopgap D02 (PR #26) côté contrôleurs Deal/dette uniquement, pas encore par un vrai `workspace_id` par objet comme décrit ici.*