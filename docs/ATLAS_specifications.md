# ATLAS — Spécifications consolidées

*Document regroupant l'ensemble des spécifications ayant guidé le développement d'ATLAS : la spécification principale (grille de risque, Knowledge Graph, Market Intelligence) et ses trois compléments autonomes (modules d'entraînement analyste investissement, intégration baromètre-crowdfunding.com, vues inspirées de MARKO). Chaque complément se réfère à la spécification principale sous le nom `ATLAS_spec_v2.md`.*

## Sommaire

1. **Spécification principale** — grille de risque, Knowledge Graph & Market Intelligence (sections 0, A, B, C)
2. **Complément D** — modules d'entraînement au métier d'analyste investissement (fonds)
3. **Complément E** — intégration de baromètre-crowdfunding.com (Market Intelligence)
4. **Complément F** — vues inspirées de MARKO (Kanban, dashboard agrégé, covenants)

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