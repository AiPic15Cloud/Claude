-- Jeu de données de démonstration — miroir exact de lib/data/seed.ts.
-- À exécuter après 0001_init.sql sur un projet Supabase vierge pour retrouver
-- le même contenu que le mode "sans Supabase" de l'application.

insert into operators (id, name, tri_moyen, delai_moyen_jours, defauts_count, retards_count, operations_count, qualite_reporting, indice_confiance, derniere_actualite, notes) values
('op-horizon', 'Horizon Promotion', 11.2, 47, 0, 3, 9, 6, 58, 'Retard permis de construire sur un programme tiers à Aix-en-Provence.', 'Opérateur historique. Dérive budgétaire récurrente sur les programmes PACA depuis 2025.'),
('op-atlantide', 'Atlantide Réhabilitation', 14.8, 8, 0, 1, 14, 9, 88, null, 'Marchand de biens, spécialiste rénovation lourde Bordeaux métropole. Reporting exemplaire.'),
('op-nordis', 'Nordis Aménagement', 9.4, 62, 1, 4, 11, 5, 41, 'Défaut sur l''opération Lambersart Résidences (2025) — plan d''apurement en cours.', 'Sous surveillance renforcée depuis le défaut de 2025.'),
('op-meridia', 'Meridia Capital', 13.1, 15, 0, 0, 6, 8, 81, null, 'Value-add tertiaire Lyon / Villeurbanne. Montée en puissance récente.'),
('op-cavale', 'Cavale Foncière', 16.3, 5, 0, 0, 7, 9, 92, null, 'Marchand de biens Lille / Roubaix. Meilleure rentabilité ajustée du risque du portefeuille.'),
('op-solstice', 'Solstice Immobilier', 7.8, 22, 0, 1, 10, 7, 70, null, 'Core+ résidentiel Île-de-France. Profil défensif, rendement plus faible.');

insert into deals (id, name, operator_id, stage, type, region, ville, montant, rendement_cible, duree_mois, risque, banque, origine, commercialisateur, statut_detail, sourced_at, echeance_prevue, vote_expires_at, created_at, updated_at) values
('deal-horizon-aix', 'Horizon — Résidence Les Terrasses, Aix-en-Provence', 'op-horizon', 'comite', 'promotion', 'PACA', 'Aix-en-Provence', 2400000, 9.5, 30, 8, 'Banque Populaire Méditerranée', 'Réseau CGP', 'Century 21 Aix', 'Dérive budgétaire de 12% constatée sur le lot gros-œuvre', '2026-04-02', '2028-10-15', '2026-08-05', '2026-04-02T09:00:00Z', '2026-07-28T14:00:00Z'),
('deal-atlantide-chartrons', 'Atlantide — Réhabilitation Chartrons, Bordeaux', 'op-atlantide', 'finance', 'marchand_de_biens', 'Nouvelle-Aquitaine', 'Bordeaux', 1650000, 13.0, 14, 3, 'Crédit Agricole Aquitaine', 'Apport direct', null, 'Travaux en cours — 68% d''avancement, conforme au calendrier', '2025-11-10', '2026-11-20', null, '2025-11-10T09:00:00Z', '2026-07-25T10:00:00Z'),
('deal-atlantide-bacalan', 'Atlantide — Lot Bacalan, Bordeaux', 'op-atlantide', 'suivi', 'marchand_de_biens', 'Nouvelle-Aquitaine', 'Bordeaux', 980000, 12.5, 10, 2, 'Crédit Agricole Aquitaine', 'Apport direct', null, 'Commercialisation à 90% — sortie anticipée probable', '2025-06-01', '2026-09-01', null, '2025-06-01T09:00:00Z', '2026-07-20T10:00:00Z'),
('deal-nordis-lambersart', 'Nordis — Lambersart Résidences', 'op-nordis', 'defaut', 'promotion', 'Hauts-de-France', 'Lambersart', 1200000, 8.0, 36, 10, 'BNP Paribas', 'Réseau CGP', 'Orpi Lambersart', 'Plan d''apurement en négociation — recouvrement estimé 65%', '2023-02-14', '2026-02-14', null, '2023-02-14T09:00:00Z', '2026-07-15T10:00:00Z'),
('deal-nordis-tourcoing', 'Nordis — Îlot Tourcoing Centre', 'op-nordis', 'suivi', 'promotion', 'Hauts-de-France', 'Tourcoing', 1450000, 9.0, 28, 7, 'BNP Paribas', 'Réseau CGP', 'Orpi Tourcoing', 'Retard de 2 mois sur le permis modificatif', '2025-01-20', '2027-05-20', null, '2025-01-20T09:00:00Z', '2026-07-22T10:00:00Z'),
('deal-meridia-villeurbanne', 'Meridia — Bureaux Villeurbanne République', 'op-meridia', 'suivi', 'value_add', 'Auvergne-Rhône-Alpes', 'Villeurbanne', 3100000, 11.5, 24, 5, 'LCL Entreprises', 'Plateforme partenaire', 'CBRE Lyon', 'Restructuration livrée — taux d''occupation 74%', '2025-03-05', '2027-03-05', null, '2025-03-05T09:00:00Z', '2026-07-18T10:00:00Z'),
('deal-meridia-part-dieu', 'Meridia — Îlot Part-Dieu Sud', 'op-meridia', 'conditions', 'value_add', 'Auvergne-Rhône-Alpes', 'Lyon', 4200000, 12.0, 30, 6, 'LCL Entreprises', 'Plateforme partenaire', 'CBRE Lyon', 'Levée des conditions suspensives — permis attendu sous 45 jours', '2026-05-12', '2028-11-12', null, '2026-05-12T09:00:00Z', '2026-07-29T10:00:00Z'),
('deal-cavale-roubaix', 'Cavale — Ancienne Filature, Roubaix', 'op-cavale', 'finance', 'marchand_de_biens', 'Hauts-de-France', 'Roubaix', 890000, 16.0, 12, 3, 'Crédit du Nord', 'Apport direct', null, 'Division en 14 lots — travaux démarrés', '2026-01-08', '2027-01-08', null, '2026-01-08T09:00:00Z', '2026-07-26T10:00:00Z'),
('deal-cavale-lille-vauban', 'Cavale — Vauban Esquermes, Lille', 'op-cavale', 'suivi', 'marchand_de_biens', 'Hauts-de-France', 'Lille', 1100000, 15.5, 11, 3, 'Crédit du Nord', 'Apport direct', null, 'Commercialisation 100% — remboursement prévu sous 6 semaines', '2025-08-01', '2026-08-20', null, '2025-08-01T09:00:00Z', '2026-07-27T10:00:00Z'),
('deal-solstice-boulogne', 'Solstice — Résidence Seniors, Boulogne-Billancourt', 'op-solstice', 'suivi', 'core_plus', 'Île-de-France', 'Boulogne-Billancourt', 3800000, 7.0, 48, 3, 'Société Générale', 'Family office partenaire', 'Foncia Entreprises', 'Exploitation stabilisée — taux d''occupation 96%', '2024-05-01', '2028-05-01', null, '2024-05-01T09:00:00Z', '2026-07-10T10:00:00Z'),
('deal-solstice-issy', 'Solstice — Programme Issy Coeur de Ville', 'op-solstice', 'analyse', 'core_plus', 'Île-de-France', 'Issy-les-Moulineaux', 2900000, 6.8, 42, 3, 'Société Générale', 'Family office partenaire', 'Foncia Entreprises', 'Analyse financière et juridique en cours', '2026-06-20', '2030-01-20', null, '2026-06-20T09:00:00Z', '2026-07-30T10:00:00Z'),
('deal-horizon-marseille', 'Horizon — Résidence Le Panorama, Marseille', 'op-horizon', 'sourcing', 'promotion', 'PACA', 'Marseille', 3300000, 9.8, 32, 7, null, 'Réseau CGP', null, 'Dossier reçu — pré-qualification en attente', '2026-07-22', '2029-03-22', null, '2026-07-22T09:00:00Z', '2026-07-22T09:00:00Z'),
('deal-atlantide-bastide', 'Atlantide — Ilôt Bastide, Bordeaux', 'op-atlantide', 'rembourse', 'marchand_de_biens', 'Nouvelle-Aquitaine', 'Bordeaux', 1050000, 13.5, 12, 3, 'Crédit Agricole Aquitaine', 'Apport direct', null, 'Remboursé intégralement — TRI final 14.1%', '2024-06-01', '2025-06-01', null, '2024-06-01T09:00:00Z', '2025-06-05T10:00:00Z'),
('deal-cavale-tourcoing2', 'Cavale — Résidence Le Colbert, Tourcoing', 'op-cavale', 'collecte', 'marchand_de_biens', 'Hauts-de-France', 'Tourcoing', 760000, 15.0, 12, 3, 'Crédit du Nord', 'Apport direct', null, 'Collecte en cours — 54% souscrit', '2026-07-01', '2027-08-01', null, '2026-07-01T09:00:00Z', '2026-07-30T10:00:00Z');

insert into deal_notes (id, deal_id, author, content, created_at) values
('note-1', 'deal-horizon-aix', 'Nicolas', 'Appel avec Horizon ce matin : ils confirment la dérive sur le gros-œuvre, imputent la hausse du prix de l''acier. Demander un plan de reprise chiffré avant le comité.', '2026-07-28T15:30:00Z'),
('note-2', 'deal-nordis-lambersart', 'Nicolas', 'Négociation du plan d''apurement toujours en cours avec le mandataire judiciaire. Prochaine échéance de reporting : 15 août.', '2026-07-15T11:00:00Z'),
('note-3', 'deal-meridia-part-dieu', 'Nicolas', 'Dossier solide. Rentabilité ajustée du risque parmi les meilleures du pipeline actuel.', '2026-07-29T09:15:00Z');

insert into deal_documents (id, deal_id, name, type, uploaded_at) values
('doc-1', 'deal-horizon-aix', 'Business Plan v3.xlsx', 'Business Plan', '2026-04-05T10:00:00Z'),
('doc-2', 'deal-horizon-aix', 'Compromis de vente.pdf', 'Compromis', '2026-04-08T10:00:00Z'),
('doc-3', 'deal-horizon-aix', 'Permis de construire.pdf', 'Permis', '2026-04-20T10:00:00Z'),
('doc-4', 'deal-atlantide-chartrons', 'Business Plan.xlsx', 'Business Plan', '2025-11-12T10:00:00Z'),
('doc-5', 'deal-atlantide-chartrons', 'Photos avancement juillet.zip', 'Photos', '2026-07-15T10:00:00Z'),
('doc-6', 'deal-meridia-part-dieu', 'Plans de division.pdf', 'Plans', '2026-05-20T10:00:00Z');

insert into decisions (id, deal_id, committee_date, decision, rationale, risques_identifies, decided_by, vote_result) values
('dec-1', 'deal-atlantide-chartrons', '2025-11-08', 'approuve', 'Opérateur de confiance, TRI historique élevé, ratio LTC conservateur (58%). Approuvé à l''unanimité.', array['Risque de marché limité sur ce quartier prisé', 'Délai de revente en cas de retournement'], 'Comité Estrella (Nicolas + 2 membres externes)', '3 pour / 0 contre'),
('dec-2', 'deal-nordis-lambersart', '2023-02-10', 'conditionnel', 'Approuvé sous réserve d''une garantie personnelle du dirigeant et d''un reporting mensuel renforcé.', array['Opérateur en croissance rapide, structure financière tendue', 'Marché secondaire Lambersart peu liquide'], 'Comité Estrella', '2 pour / 1 abstention');

insert into tasks (id, title, description, priority, status, due_date, related_deal_id, source, created_at) values
('task-1', 'Statuer sur le plan de reprise Horizon avant le comité du 5 août', 'Le vote sur Horizon — Aix-en-Provence expire dans quelques jours. Dérive budgétaire de 12% à documenter.', 'haute', 'a_faire', '2026-08-05', 'deal-horizon-aix', 'alerte', '2026-07-28T08:00:00Z'),
('task-2', 'Relancer Nordis sur le reporting du plan d''apurement', 'Échéance de reporting mensuel dépassée de 3 jours.', 'haute', 'a_faire', '2026-08-02', 'deal-nordis-lambersart', 'alerte', '2026-07-30T08:00:00Z'),
('task-3', 'Valider la sortie anticipée Atlantide Bacalan', 'Commercialisation à 90% — préparer le remboursement anticipé.', 'moyenne', 'a_faire', '2026-08-10', 'deal-atlantide-bacalan', 'manuel', '2026-07-25T08:00:00Z'),
('task-4', 'Revue trimestrielle du portefeuille — préparer les supports', null, 'basse', 'en_cours', '2026-08-15', null, 'manuel', '2026-07-20T08:00:00Z');

insert into alerts (id, type, severity, message, related_deal_id, created_at, resolved) values
('alert-1', 'Dérive budgétaire', 'critique', 'Horizon — Aix-en-Provence : dérive de 12% sur le lot gros-œuvre. Vote de comité dans moins d''une semaine.', 'deal-horizon-aix', '2026-07-28T08:00:00Z', false),
('alert-2', 'Reporting en retard', 'elevee', 'Nordis — Lambersart : reporting mensuel du plan d''apurement attendu, non reçu depuis 3 jours.', 'deal-nordis-lambersart', '2026-07-30T08:00:00Z', false),
('alert-3', 'Retard travaux', 'moderee', 'Nordis — Tourcoing Centre : retard de 2 mois sur le permis modificatif.', 'deal-nordis-tourcoing', '2026-07-22T08:00:00Z', false),
('alert-4', 'Échéance proche', 'moderee', 'Cavale — Vauban Esquermes : remboursement attendu sous 6 semaines, confirmer le calendrier avec l''opérateur.', 'deal-cavale-lille-vauban', '2026-07-27T08:00:00Z', false);
