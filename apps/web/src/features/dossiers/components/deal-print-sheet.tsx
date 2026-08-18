import type { Deal, Guarantee } from '@/types';
import { DEAL_TYPE_LABELS, DEAL_STAGE_LABELS, GUARANTEE_TYPE_LABELS, GUARANTEE_STATUS_LABELS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';

/**
 * Rendu uniquement à l'impression (voir la classe `hidden print:block` du
 * conteneur) — un vrai one-pager pensé pour un board/investisseur, pas une
 * capture des onglets interactifs de la page. Réutilise les données déjà
 * chargées par DossierPage (deal + garanties), aucun appel réseau propre.
 */
export function DealPrintSheet({ deal, guarantees }: { deal: Deal; guarantees: Guarantee[] }) {
  return (
    <div className="hidden print:block print:bg-white print:p-6 print:text-black">
      <header className="mb-4 flex items-start justify-between border-b border-black pb-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-black/60">{deal.reference} · {DEAL_TYPE_LABELS[deal.type]}</p>
          <h1 className="text-2xl font-semibold">{deal.name}</h1>
          {deal.city && <p className="text-sm text-black/70">{deal.address ? `${deal.address}, ` : ''}{deal.postcode} {deal.city}</p>}
        </div>
        <div className="text-right text-xs text-black/60">
          <p>Fiche générée le {formatDate(new Date().toISOString())}</p>
          <p>Étape : {DEAL_STAGE_LABELS[deal.stage]}</p>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-black/60">Montant cible</p>
          <p className="text-lg font-semibold">{formatCurrency(deal.amountTarget)}</p>
        </div>
        <div>
          <p className="text-xs text-black/60">Collecté</p>
          <p className="text-lg font-semibold">{formatCurrency(deal.amountRaised)}</p>
        </div>
        <div>
          <p className="text-xs text-black/60">Taux</p>
          <p className="text-lg font-semibold">{deal.interestRate ? `${deal.interestRate}%` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-black/60">Score ATLAS</p>
          <p className="text-lg font-semibold">{deal.atlasScore ?? '—'}</p>
        </div>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div className="flex justify-between border-b border-black/10 py-1">
          <span className="text-black/60">Durée</span>
          <span>{deal.durationMonths ? `${deal.durationMonths} mois` : '—'}</span>
        </div>
        <div className="flex justify-between border-b border-black/10 py-1">
          <span className="text-black/60">Fees</span>
          <span>{deal.feesRate ? `${deal.feesRate}%` : '—'}</span>
        </div>
        <div className="flex justify-between border-b border-black/10 py-1">
          <span className="text-black/60">Date de début</span>
          <span>{deal.startDate ? formatDate(deal.startDate) : '—'}</span>
        </div>
        <div className="flex justify-between border-b border-black/10 py-1">
          <span className="text-black/60">Échéance</span>
          <span>{deal.endDate ? formatDate(deal.endDate) : '—'}</span>
        </div>
        <div className="flex justify-between border-b border-black/10 py-1">
          <span className="text-black/60">Porteur</span>
          <span>{deal.porteurNom || deal.porteurSociete || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-black/10 py-1">
          <span className="text-black/60">Statut recouvrement</span>
          <span>{deal.repaid ? 'Remboursé' : deal.recoveryStatus}</span>
        </div>
      </section>

      {deal.description && (
        <section className="mb-4">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-black/60">Description</h2>
          <p className="text-sm">{deal.description}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/60">Garanties ({guarantees.length})</h2>
        {guarantees.length === 0 ? (
          <p className="text-sm text-black/60">Aucune garantie enregistrée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1 pr-2 font-medium">Type</th>
                <th className="py-1 pr-2 font-medium">Description</th>
                <th className="py-1 pr-2 font-medium text-right">Montant</th>
                <th className="py-1 pr-2 font-medium">Rang</th>
                <th className="py-1 pr-2 font-medium">Statut</th>
                <th className="py-1 font-medium">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {guarantees.map((g) => (
                <tr key={g.id} className="border-b border-black/10">
                  <td className="py-1 pr-2">{GUARANTEE_TYPE_LABELS[g.type]}</td>
                  <td className="py-1 pr-2">{g.description}</td>
                  <td className="py-1 pr-2 text-right">{formatCurrency(g.amount)}</td>
                  <td className="py-1 pr-2">{g.rank}</td>
                  <td className="py-1 pr-2">{GUARANTEE_STATUS_LABELS[g.status]}</td>
                  <td className="py-1">{g.endDate ? formatDate(g.endDate) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="mt-4 text-[10px] text-black/40">Atlas Capital — document interne, non contractuel.</footer>
    </div>
  );
}
