import { escapeHtml, text, wrapPrintDocument } from '../pdf-export/print-html.util';
import type { PrequalificationService } from './prequalification.service';

type PrequalCaseDetail = Awaited<ReturnType<PrequalificationService['getById']>>;

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Brouillon', NEEDS_REVIEW: 'À revoir', VALIDATED: 'Validé', ARCHIVED: 'Classé' };
const ORIENTATION_LABELS: Record<string, string> = { GO: 'Go', GO_SOUS_CONDITIONS: 'Go sous conditions', WAIT: 'Wait', NO_GO_EN_L_ETAT: "No-go en l'état" };
const CONFIDENCE_LABELS: Record<string, string> = { LOW: 'Faible', MEDIUM: 'Moyenne', HIGH: 'Élevée' };
const PROJECT_TYPE_LABELS: Record<string, string> = {
  LAND_DIVISION: 'Division foncière',
  PROPERTY_TRADING_NO_WORKS: 'Marchand de biens sans travaux',
  PROPERTY_TRADING_WITH_WORKS: 'Marchand de biens avec travaux',
  BUILDING_DIVISION: "Division d'immeuble",
  RESIDENTIAL_DEVELOPMENT: 'Promotion résidentielle',
  COMMERCIAL_PROPERTY: 'Immobilier commercial',
  REFINANCING: 'Refinancement',
  OTHER: 'Autre',
};
const PERSON_ROLE_LABELS: Record<string, string> = { PORTEUR_PRINCIPAL: 'Porteur principal', ASSOCIE: 'Associé', DIRIGEANT: 'Dirigeant', GARANT: 'Garant', AUTRE: 'Autre' };
const COMPANY_STATE_LABELS: Record<string, string> = { EXISTANTE: 'Existante', A_CREER: 'À créer', RADIEE: 'Radiée', INCONNUE: 'Inconnue' };
const COMPANY_ROLE_LABELS: Record<string, string> = {
  OPERATEUR: 'Opérateur',
  SOCIETE_PROJET: 'Société de projet',
  HOLDING: 'Holding',
  GARANTE: 'Garante',
  ENTREPRISE_TRAVAUX: 'Entreprise de travaux',
  AUTRE: 'Autre',
};
const ACQUISITION_STATUS_LABELS: Record<string, string> = { OFFRE: 'Offre', PROMESSE: 'Promesse', ACTE: 'Acte', PROPRIETE: 'Propriété' };

function pct(value: unknown): string {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)} %`;
}

function money(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const amount = Number(value);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: amount >= 100_000 ? 0 : 2,
    notation: amount >= 1_000_000 ? 'compact' : 'standard',
  }).format(amount);
}

function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

/**
 * Port serveur exact du contenu de `prequal-memo-print-sheet.tsx` (Trame
 * Prequal — 7 sections numérotées + bloc Data room) — même texte, même
 * structure, même doctrine "—" pour toute valeur absente. Nécessaire car
 * `window.print()` ne fonctionne quasiment pas sur Chrome Android : cette
 * version est rendue en PDF côté serveur (voir PdfRenderService) et
 * téléchargée comme un fichier, donc indépendante du navigateur du client.
 * Toute donnée dynamique passe par `escapeHtml`/`text` — jamais interpolée
 * brute (le PDF est généré depuis du HTML, une injection non échappée y
 * serait aussi dangereuse qu'une XSS stockée classique).
 */
export function buildPrequalMemoHtml(prequalCase: PrequalCaseDetail): string {
  const f = prequalCase.financial;
  const project = prequalCase.project;
  const planning = prequalCase.planning;

  const societeDeProjet = prequalCase.companies.filter((c) => c.role === 'SOCIETE_PROJET');
  const companiesToShow = societeDeProjet.length > 0 ? societeDeProjet : prequalCase.companies;

  const porteurPrincipal = prequalCase.people.find((p) => p.role === 'PORTEUR_PRINCIPAL') ?? prequalCase.people[0];
  const greetingFirstName = porteurPrincipal?.fullName?.split(' ')[0];

  const peopleHtml =
    prequalCase.people.length === 0
      ? `<p class="small muted">Aucun porteur renseigné.</p>`
      : prequalCase.people
          .map(
            (p) => `
        <div style="margin-bottom:8px;">
          <p><strong>${escapeHtml(p.fullName)}</strong> <span class="muted">— ${escapeHtml(PERSON_ROLE_LABELS[p.role] ?? p.role)}</span></p>
          ${p.cv ? `<p>${escapeHtml(p.cv)}</p>` : ''}
          <div class="grid grid-3 small muted" style="margin-top:2px;">
            <span>Patrimoine déclaré : ${money(p.declaredNetWorth)}</span>
            <span>Fonds propres disponibles : ${money(p.availableEquity)}</span>
            <span>Track record : ${p.trackRecord.length} opération(s)</span>
          </div>
          ${p.incidentsNote ? `<p class="small muted" style="margin-top:2px;">Incidents : ${escapeHtml(p.incidentsNote)}</p>` : ''}
        </div>`,
          )
          .join('');

  const companiesHtml =
    companiesToShow.length === 0
      ? `<p class="small muted">Aucune société renseignée.</p>`
      : companiesToShow
          .map(
            (c) => `
        <div style="margin-bottom:8px;">
          <p><strong>${escapeHtml(c.legalName)}</strong> <span class="muted">— ${escapeHtml(COMPANY_ROLE_LABELS[c.role] ?? c.role)} · ${escapeHtml(COMPANY_STATE_LABELS[c.state] ?? c.state)}</span></p>
          <div class="grid grid-3 small muted" style="margin-top:2px;">
            <span>SIREN : ${text(c.siren)}</span>
            <span>Forme : ${text(c.legalForm)}</span>
            <span>Comptes disponibles : ${c.accountsAvailable ? 'Oui' : 'Non'}</span>
          </div>
          ${c.knownDebtNote ? `<p class="small muted" style="margin-top:2px;">Dette connue : ${escapeHtml(c.knownDebtNote)}</p>` : ''}
        </div>`,
          )
          .join('');

  const situationLine = [project?.address, project?.postcode, project?.city].filter(Boolean).join(' ') || '—';
  const cadastralSuffix = project?.cadastralRef ? ` (réf. cadastrale : ${escapeHtml(project.cadastralRef)})` : '';

  const body = `
    <header class="doc-header">
      <p class="doc-meta">${escapeHtml(STATUS_LABELS[prequalCase.status] ?? prequalCase.status)} · Version ${prequalCase.version} · ${formatDate(prequalCase.updatedAt)}</p>
      <h1>Préqualification — ${escapeHtml(prequalCase.name)}</h1>
      <div class="small" style="margin-top:8px; display:flex; gap:16px;">
        <span><strong>Orientation :</strong> ${prequalCase.orientation ? escapeHtml(ORIENTATION_LABELS[prequalCase.orientation] ?? prequalCase.orientation) : '—'}</span>
        <span><strong>Confiance :</strong> ${prequalCase.confidence ? escapeHtml(CONFIDENCE_LABELS[prequalCase.confidence] ?? prequalCase.confidence) : '—'}</span>
      </div>
    </header>

    <section>
      <h2>1. Canal d'entrée</h2>
      <p>Canal : ${text(prequalCase.entryChannel)} · Apporteur : ${text(prequalCase.introducer)} · Analyste : ${
        prequalCase.assignedAnalyst ? escapeHtml(`${prequalCase.assignedAnalyst.firstName} ${prequalCase.assignedAnalyst.lastName}`) : '—'
      }</p>
    </section>

    <section>
      <h2>2. Présentation du PDP</h2>
      ${peopleHtml}
    </section>

    <section>
      <h2>3. Société de projet</h2>
      ${companiesHtml}
    </section>

    <section>
      <h2>4. Présentation du projet</h2>
      <h3>Type d'opération</h3>
      <p style="margin-bottom:8px;">${prequalCase.projectType ? escapeHtml(PROJECT_TYPE_LABELS[prequalCase.projectType] ?? prequalCase.projectType) : '—'}</p>

      <h3>Situation du projet</h3>
      <p>${escapeHtml(situationLine)}${cadastralSuffix}</p>
      ${project?.description ? `<p style="margin-top:4px;">${escapeHtml(project.description)}</p>` : ''}
      <div class="grid grid-3 small muted" style="margin-top:4px;">
        <span>Surface existante : ${project?.existingSurfaceSqm != null ? `${project.existingSurfaceSqm} m²` : '—'}</span>
        <span>Surface créée : ${project?.createdSurfaceSqm != null ? `${project.createdSurfaceSqm} m²` : '—'}</span>
        <span>Lots : ${project?.lotCount ?? '—'}</span>
        <span>Statut d'acquisition : ${project?.acquisitionStatus ? escapeHtml(ACQUISITION_STATUS_LABELS[project.acquisitionStatus] ?? project.acquisitionStatus) : '—'}</span>
        <span>Prix d'acquisition : ${money(project?.acquisitionPrice)}</span>
      </div>
      ${project?.worksDescription ? `<p style="margin-top:4px;">Travaux : ${escapeHtml(project.worksDescription)}</p>` : ''}
      ${project?.exitStrategy ? `<p style="margin-top:4px;">Sortie : ${escapeHtml(project.exitStrategy)}</p>` : ''}

      <h3>Urbanisme</h3>
      <p>${text(project?.urbanismeNote)}</p>

      <h3>Commercialisation</h3>
      <p>${text(project?.commercialisationNote)}</p>
      ${prequalCase.lots.length > 0 ? `<p class="small muted" style="margin-top:2px;">${prequalCase.lots.length} lot(s) suivi(s) — détail dans l'onglet Lots de l'application.</p>` : ''}
    </section>

    <section>
      <h2>5. Préqual</h2>
      <div class="grid grid-3">
        <span>Montant recherché : ${money(f?.amountRequested)}</span>
        <span>Coût de revient : ${money(f?.coutDeRevient)}</span>
        <span>Chiffre d'affaires : ${money(f?.chiffreAffaires)}</span>
        <span>Marge annoncée : ${pct(f?.declaredMarginPct)}</span>
        <span>Marge recalculée : ${money(f?.margeRecalculee)} (${pct(f?.margeRecalculeePct)})</span>
        <span>Apport prouvé : ${money(f?.provenEquity)}</span>
        <span>LTA : ${pct(f?.ltaPct)}</span>
        <span>LTC : ${pct(f?.ltcPct)}</span>
        <span>LTV : ${pct(f?.ltvPct)}</span>
      </div>
    </section>

    <section>
      <h2>6. Ressenti du chargé d'affaires sur le projet</h2>
      <p>${text(prequalCase.analystImpressionNote)}</p>
    </section>

    <section>
      <h2>7. Temporalité du dossier (pour quand)</h2>
      <p>Urgence métier : ${text(planning?.businessUrgencyNote)}</p>
      <p>Calendrier réaliste : ${text(planning?.realisticTimeline)}</p>
    </section>

    <section style="border-top:1px solid #000; padding-top:12px;">
      <h2>Data room — modèle d'email de conditions</h2>
      <p>Bonjour${greetingFirstName ? ` ${escapeHtml(greetingFirstName)}` : ''},</p>
      <p style="margin-top:4px;">Je fais suite à notre échange téléphonique et vous en remercie. Je vous prie de trouver ci-dessous le détails de nos conditions d'accompagnement dans le cadre de votre opération :</p>
      <ul>
        <li>Montant collecté : ${money(f?.amountRequested)}</li>
        <li>Montant décaissé chez le notaire : ${money(f?.montantDecaisseNotaire)}</li>
        <li>Frais de dossier : ${pct(f?.feesPctHT)}</li>
        <li>Taux annuel : ${pct(f?.interestRatePct)}</li>
        <li>Durée minimale : ${f?.durationMinMonths != null ? `${f.durationMinMonths} mois` : '—'}</li>
        <li>Durée maximale : ${f?.durationMaxMonths != null ? `${f.durationMaxMonths} mois` : '—'}</li>
        <li>Garanties : ${text(f?.guaranteesNote)}</li>
      </ul>

      <p style="margin-top:8px;">Afin de présenter l'opération en comité d'investissement, j'aurai besoin des éléments suivants :</p>

      <p style="margin-top:4px; font-weight:600;">Vous concernant :</p>
      <ul>
        <li>Pièce d'identité en cours de validité et lisible.</li>
        <li>Un CV ou descriptif d'expérience professionnelle.</li>
        <li>Un formulaire track record des précédentes opérations.</li>
        <li>Un formulaire de déclaration de patrimoine (<a href="https://airtable.com/shrrQXrtM7ChtZhha">lien</a>).</li>
        <li>Les deux derniers avis d'imposition.</li>
        <li>Un justificatif de domicile de moins de 3 mois à vos noms.</li>
        <li>Un justificatif de fonds propres (relevé de compte, compromis de vente à venir, etc).</li>
        <li>Une copie de votre casier judiciaire B3 (mode d'emploi disponible sur demande).</li>
      </ul>

      <p style="margin-top:4px; font-weight:600;">Concernant la société de projet :</p>
      <ul>
        <li>Les 3 derniers relevés bancaires.</li>
        <li>Les deux dernières plaquettes comptables.</li>
        <li>Un kbis de moins de 3 mois.</li>
        <li>Le détail des dettes en cours contractées par la société (le cas échéant).</li>
        <li>Éléments de présentation des dernières opérations de la société.</li>
      </ul>

      <p style="margin-top:4px; font-weight:600;">Concernant le projet :</p>
      <ul>
        <li>Un bilan financier prévisionnel du projet actualisé.</li>
        <li>Le planning prévisionnel du projet.</li>
        <li>Le détail des postes des travaux.</li>
        <li>L'ensemble des devis/facture des travaux.</li>
        <li>Des photos et plans de l'actif (intérieures/extérieures).</li>
        <li>Certificat de dépôt d'urbanisme.</li>
        <li>Justificatif d'obtention de la demande d'urbanisme.</li>
        <li>3 constats d'huissier constatant l'affichage de l'autorisation d'urbanisme.</li>
        <li>Certificat de non-recours sur l'autorisation d'urbanisme.</li>
      </ul>

      <p style="margin-top:8px;">À titre informatif, si vous validez cette simulation, un contrat de mission vous sera envoyé sous peu pour signature électronique via UniverSign. Veuillez noter également que, sans ce contrat de mission signé, nous ne pourrons procéder à l'audit de votre opération ni la soumettre au comité d'investissement.</p>
      <p style="margin-top:4px;">Je vous en souhaite une bonne réception et je reste dans l'attente de votre confirmation.</p>
      <p style="margin-top:4px;">Bien cordialement</p>
    </section>

    <footer class="doc-footer">Document généré depuis ATLAS — dossier de préqualification, pré-comité. Le détail des calculs, sociétés et pièces reste accessible dans l'application.</footer>
  `;

  return wrapPrintDocument(`Préqualification — ${prequalCase.name}`, body);
}
