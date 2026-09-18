import { createPortal } from 'react-dom';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  PREQUALIFICATION_STATUS_LABELS,
  PREQUALIFICATION_ORIENTATION_LABELS,
  PREQUALIFICATION_CONFIDENCE_LABELS,
  PREQUALIFICATION_PROJECT_TYPE_LABELS,
  PREQUAL_PERSON_ROLE_LABELS,
  PREQUAL_COMPANY_STATE_LABELS,
  PREQUAL_COMPANY_ROLE_LABELS,
  PREQUAL_ACQUISITION_STATUS_LABELS,
  type PrequalificationCaseDetail,
} from '@/types';

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(1)} %`;
}

function money(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : formatCurrency(value);
}

function text(value: string | null | undefined): string {
  return value && value.trim() ? value : '—';
}

/**
 * Export pré-comité (Trame Prequal) — structure imposée par l'utilisateur
 * (7 sections numérotées + bloc Data room), en remplacement de la mise en
 * page précédente ("revue en 90 secondes" façon Fractionné) qui ne
 * correspondait pas au document réellement utilisé en interne. Aucun champ
 * inventé : chaque section affiche "—" quand la donnée n'est pas renseignée,
 * jamais une valeur recalculée pour combler un vide.
 */
export function PrequalMemoPrintSheet({ prequalCase }: { prequalCase: PrequalificationCaseDetail }) {
  const f = prequalCase.financial;
  const project = prequalCase.project;
  const planning = prequalCase.planning;

  const societeDeProjet = prequalCase.companies.filter((c) => c.role === 'SOCIETE_PROJET');
  const companiesToShow = societeDeProjet.length > 0 ? societeDeProjet : prequalCase.companies;

  const porteurPrincipal = prequalCase.people.find((p) => p.role === 'PORTEUR_PRINCIPAL') ?? prequalCase.people[0];
  const greetingFirstName = porteurPrincipal?.fullName?.split(' ')[0];

  return createPortal(
    <div className="hidden print:block print:bg-white print:p-6 print:text-black">
      <header className="mb-4 border-b border-black pb-2">
        <p className="text-xs uppercase tracking-wide text-black/60">
          {PREQUALIFICATION_STATUS_LABELS[prequalCase.status]} · Version {prequalCase.version} · {formatDate(prequalCase.updatedAt)}
        </p>
        <h1 className="text-2xl font-semibold">Préqualification — {prequalCase.name}</h1>
        <div className="mt-2 flex gap-4 text-sm">
          <span>
            <strong>Orientation :</strong> {prequalCase.orientation ? PREQUALIFICATION_ORIENTATION_LABELS[prequalCase.orientation] : '—'}
          </span>
          <span>
            <strong>Confiance :</strong> {prequalCase.confidence ? PREQUALIFICATION_CONFIDENCE_LABELS[prequalCase.confidence] : '—'}
          </span>
        </div>
      </header>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">1. Canal d'entrée</h2>
        <p className="text-sm">
          Canal : {text(prequalCase.entryChannel)} · Apporteur : {text(prequalCase.introducer)} · Analyste :{' '}
          {prequalCase.assignedAnalyst ? `${prequalCase.assignedAnalyst.firstName} ${prequalCase.assignedAnalyst.lastName}` : '—'}
        </p>
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">2. Présentation du PDP</h2>
        {prequalCase.people.length === 0 && <p className="text-sm text-black/50">Aucun porteur renseigné.</p>}
        {prequalCase.people.map((p) => (
          <div key={p.id} className="mb-2 text-sm">
            <p className="font-medium">
              {p.fullName} <span className="font-normal text-black/60">— {PREQUAL_PERSON_ROLE_LABELS[p.role]}</span>
            </p>
            {p.cv && <p className="text-black/80">{p.cv}</p>}
            <div className="mt-0.5 grid grid-cols-3 gap-x-3 text-xs text-black/70">
              <span>Patrimoine déclaré : {money(p.declaredNetWorth)}</span>
              <span>Fonds propres disponibles : {money(p.availableEquity)}</span>
              <span>Track record : {p.trackRecord.length} opération(s)</span>
            </div>
            {p.incidentsNote && <p className="mt-0.5 text-xs text-black/70">Incidents : {p.incidentsNote}</p>}
          </div>
        ))}
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">3. Société de projet</h2>
        {companiesToShow.length === 0 && <p className="text-sm text-black/50">Aucune société renseignée.</p>}
        {companiesToShow.map((c) => (
          <div key={c.id} className="mb-2 text-sm">
            <p className="font-medium">
              {c.legalName} <span className="font-normal text-black/60">— {PREQUAL_COMPANY_ROLE_LABELS[c.role]} · {PREQUAL_COMPANY_STATE_LABELS[c.state]}</span>
            </p>
            <div className="mt-0.5 grid grid-cols-3 gap-x-3 text-xs text-black/70">
              <span>SIREN : {text(c.siren)}</span>
              <span>Forme : {text(c.legalForm)}</span>
              <span>Comptes disponibles : {c.accountsAvailable ? 'Oui' : 'Non'}</span>
            </div>
            {c.knownDebtNote && <p className="mt-0.5 text-xs text-black/70">Dette connue : {c.knownDebtNote}</p>}
          </div>
        ))}
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/70">4. Présentation du projet</h2>

        <h3 className="text-xs font-semibold uppercase tracking-wide text-black/60">Type d'opération</h3>
        <p className="mb-2 text-sm">{prequalCase.projectType ? PREQUALIFICATION_PROJECT_TYPE_LABELS[prequalCase.projectType] : '—'}</p>

        <h3 className="text-xs font-semibold uppercase tracking-wide text-black/60">Situation du projet</h3>
        <p className="text-sm">
          {[project?.address, project?.postcode, project?.city].filter(Boolean).join(' ') || '—'}
          {project?.cadastralRef ? ` (réf. cadastrale : ${project.cadastralRef})` : ''}
        </p>
        {project?.description && <p className="mt-1 text-sm">{project.description}</p>}
        <div className="mt-1 grid grid-cols-3 gap-x-3 text-xs text-black/70">
          <span>Surface existante : {project?.existingSurfaceSqm != null ? `${project.existingSurfaceSqm} m²` : '—'}</span>
          <span>Surface créée : {project?.createdSurfaceSqm != null ? `${project.createdSurfaceSqm} m²` : '—'}</span>
          <span>Lots : {project?.lotCount ?? '—'}</span>
          <span>Statut d'acquisition : {project?.acquisitionStatus ? PREQUAL_ACQUISITION_STATUS_LABELS[project.acquisitionStatus] : '—'}</span>
          <span>Prix d'acquisition : {money(project?.acquisitionPrice)}</span>
        </div>
        {project?.worksDescription && <p className="mt-1 text-sm">Travaux : {project.worksDescription}</p>}
        {project?.exitStrategy && <p className="mt-1 text-sm">Sortie : {project.exitStrategy}</p>}

        <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-black/60">Urbanisme</h3>
        <p className="text-sm">{text(project?.urbanismeNote)}</p>

        <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-black/60">Commercialisation</h3>
        <p className="text-sm">{text(project?.commercialisationNote)}</p>
        {prequalCase.lots.length > 0 && (
          <p className="mt-0.5 text-xs text-black/70">{prequalCase.lots.length} lot(s) suivi(s) — détail dans l'onglet Lots de l'application.</p>
        )}
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">5. Préqual</h2>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <span>Montant recherché : {money(f?.amountRequested)}</span>
          <span>Coût de revient : {money(f?.coutDeRevient)}</span>
          <span>Chiffre d'affaires : {money(f?.chiffreAffaires)}</span>
          <span>Marge annoncée : {pct(f?.declaredMarginPct)}</span>
          <span>
            Marge recalculée : {money(f?.margeRecalculee)} ({pct(f?.margeRecalculeePct)})
          </span>
          <span>Apport prouvé : {money(f?.provenEquity)}</span>
          <span>LTA : {pct(f?.ltaPct)}</span>
          <span>LTC : {pct(f?.ltcPct)}</span>
          <span>LTV : {pct(f?.ltvPct)}</span>
        </div>
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">6. Ressenti du chargé d'affaires sur le projet</h2>
        <p className="text-sm">{text(prequalCase.analystImpressionNote)}</p>
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/70">7. Temporalité du dossier (pour quand)</h2>
        <p className="text-sm">Urgence métier : {text(planning?.businessUrgencyNote)}</p>
        <p className="text-sm">Calendrier réaliste : {text(planning?.realisticTimeline)}</p>
      </section>

      <section className="mb-4 break-inside-avoid border-t border-black pt-3">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/70">Data room — modèle d'email de conditions</h2>
        <p className="text-sm">
          Bonjour{greetingFirstName ? ` ${greetingFirstName}` : ''},
        </p>
        <p className="mt-1 text-sm">
          Je fais suite à notre échange téléphonique et vous en remercie. Je vous prie de trouver ci-dessous le détails de nos conditions d'accompagnement dans le cadre de votre
          opération :
        </p>
        <ul className="ml-4 mt-1 list-disc text-sm">
          <li>Montant collecté : {money(f?.amountRequested)}</li>
          <li>Montant décaissé chez le notaire : {money(f?.montantDecaisseNotaire)}</li>
          <li>Frais de dossier : {pct(f?.feesPctHT)}</li>
          <li>Taux annuel : {pct(f?.interestRatePct)}</li>
          <li>Durée minimale : {f?.durationMinMonths != null ? `${f.durationMinMonths} mois` : '—'}</li>
          <li>Durée maximale : {f?.durationMaxMonths != null ? `${f.durationMaxMonths} mois` : '—'}</li>
          <li>Garanties : {text(f?.guaranteesNote)}</li>
        </ul>

        <p className="mt-2 text-sm">Afin de présenter l'opération en comité d'investissement, j'aurai besoin des éléments suivants :</p>

        <p className="mt-1 text-sm font-medium">Vous concernant :</p>
        <ul className="ml-4 list-disc text-sm">
          <li>Pièce d'identité en cours de validité et lisible.</li>
          <li>Un CV ou descriptif d'expérience professionnelle.</li>
          <li>Un formulaire track record des précédentes opérations.</li>
          <li>
            Un formulaire de déclaration de patrimoine (
            <a href="https://airtable.com/shrrQXrtM7ChtZhha" className="underline">
              lien
            </a>
            ).
          </li>
          <li>Les deux derniers avis d'imposition.</li>
          <li>Un justificatif de domicile de moins de 3 mois à vos noms.</li>
          <li>Un justificatif de fonds propres (relevé de compte, compromis de vente à venir, etc).</li>
          <li>Une copie de votre casier judiciaire B3 (mode d'emploi disponible sur demande).</li>
        </ul>

        <p className="mt-1 text-sm font-medium">Concernant la société de projet :</p>
        <ul className="ml-4 list-disc text-sm">
          <li>Les 3 derniers relevés bancaires.</li>
          <li>Les deux dernières plaquettes comptables.</li>
          <li>Un kbis de moins de 3 mois.</li>
          <li>Le détail des dettes en cours contractées par la société (le cas échéant).</li>
          <li>Éléments de présentation des dernières opérations de la société.</li>
        </ul>

        <p className="mt-1 text-sm font-medium">Concernant le projet :</p>
        <ul className="ml-4 list-disc text-sm">
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

        <p className="mt-2 text-sm">
          À titre informatif, si vous validez cette simulation, un contrat de mission vous sera envoyé sous peu pour signature électronique via UniverSign. Veuillez noter
          également que, sans ce contrat de mission signé, nous ne pourrons procéder à l'audit de votre opération ni la soumettre au comité d'investissement.
        </p>
        <p className="mt-1 text-sm">Je vous en souhaite une bonne réception et je reste dans l'attente de votre confirmation.</p>
        <p className="mt-1 text-sm">Bien cordialement</p>
      </section>

      <footer className="mt-6 border-t border-black pt-2 text-xs text-black/50">
        Document généré depuis ATLAS — dossier de préqualification, pré-comité. Le détail des calculs, sociétés et pièces reste accessible dans l'application.
      </footer>
    </div>,
    document.body,
  );
}
