// A deal that's fully repaid or written off as DEFAUT is closed out — every
// active-monitoring condition (deadline escalation, checkpoint health,
// guarantee renewal warnings, newsletter follow-up) exists to drive a
// decision on a deal still being worked, so none of them apply anymore
// once it lands in either state. Shared by the deals and guarantees
// modules so the definition of "closed" can't drift between them.
//
// Three lifecycle-adjacent signals coexist on purpose and are NOT unified
// into this one: Deal.status (ACTIVE/ON_HOLD/CLOSED/ARCHIVED — a manual,
// independently-audited operational flag, see deal-consistency.util.ts for
// the gap that opens when it diverges from this function's result) and
// computeCycleProjet() in risk-engine.service.ts (a narrative-only label
// derived from stage+repaid for display, never persisted, never a gate).
// Merging them would risk regressing the background jobs that depend on
// this exact boolean for a purely cosmetic simplification.
export function isDealClosed(deal: { repaid: boolean; stage: string }): boolean {
  return deal.repaid || deal.stage === 'DEFAUT' || deal.stage === 'REMBOURSE';
}
