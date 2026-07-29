export interface MiseEnDemeureInput {
  organizationName: string;
  dealName: string;
  dealReference: string;
  porteurNom: string;
  porteurSociete: string | null;
  porteurAdresse: string;
  dateMax: Date | null;
  today?: Date;
  responseDelayDays?: number;
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Builds a ready-to-copy/print mise en demeure — per the team's actual
 * process this goes out by courrier recommandé, not by email from the
 * app, so the deliverable is text to paste into a Word/letterhead
 * template, not an automated send.
 */
export function buildMiseEnDemeure(input: MiseEnDemeureInput): { subject: string; body: string } {
  const today = input.today ?? new Date();
  const responseDelayDays = input.responseDelayDays ?? 8;
  const deadline = new Date(today.getTime() + responseDelayDays * 86_400_000);

  const echeanceLine = input.dateMax
    ? `L'échéance contractuelle de ce dossier est fixée au ${DATE_FMT.format(input.dateMax)}.`
    : "Ce dossier n'a pas d'échéance contractuelle enregistrée à ce jour.";

  const destinataire = input.porteurSociete ? `${input.porteurNom} — ${input.porteurSociete}` : input.porteurNom;

  const subject = `Mise en demeure — Dossier ${input.dealReference} (${input.dealName})`;

  const body = `${input.organizationName}
${DATE_FMT.format(today)}

À l'attention de : ${destinataire}
${input.porteurAdresse}

Objet : Mise en demeure — reporting dû sur le dossier ${input.dealReference} (${input.dealName})

Madame, Monsieur,

Malgré nos relances successives concernant le dossier ${input.dealReference} (${input.dealName}), nous
n'avons à ce jour reçu aucun élément permettant d'informer nos investisseurs de l'état d'avancement de
l'opération, en dépit de vos obligations contractuelles de reporting.

${echeanceLine}

Nous vous mettons donc en demeure de nous transmettre, dans un délai de ${responseDelayDays} jours à
compter de la présente, soit au plus tard le ${DATE_FMT.format(deadline)} :

  — l'état d'avancement des travaux et le budget consommé à date ;
  — l'état de la commercialisation (lots vendus, prix obtenus) ;
  — tout élément permettant d'apprécier l'atterrissage prévisionnel de l'opération.

À défaut de réponse dans ce délai, nous nous verrons contraints de saisir nos investisseurs d'un vote
relatif à la suite à donner à ce dossier, sans préjudice de toute autre voie de droit.

Nous restons à votre disposition pour tout échange utile.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

${input.organizationName}`;

  return { subject, body };
}
