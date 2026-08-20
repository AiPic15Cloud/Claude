// A deal that's fully repaid or written off as DEFAUT is closed out — every
// active-monitoring condition (deadline escalation, checkpoint health,
// guarantee renewal warnings, newsletter follow-up) exists to drive a
// decision on a deal still being worked, so none of them apply anymore
// once it lands in either state. Shared by the deals and guarantees
// modules so the definition of "closed" can't drift between them.
export function isDealClosed(deal: { repaid: boolean; stage: string }): boolean {
  return deal.repaid || deal.stage === 'DEFAUT' || deal.stage === 'REMBOURSE';
}
