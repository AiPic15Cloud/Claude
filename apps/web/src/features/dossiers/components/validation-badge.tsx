import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDealValidations, useValidateEntity } from '../hooks/use-data-validation';
import { useDealFieldChanges } from '../hooks/use-field-changes';
import { formatDate } from '@/lib/format';

/**
 * Sign-off d'une seule personne (pas un maker-checker à deux) : distingue
 * "juste enregistré" de "relu et confirmé". Auto-invalidé dès qu'un nouveau
 * FieldChange survient pour cette entité (voir FieldChangeService côté API)
 * — ce badge ne peut donc jamais afficher "validé" sur une valeur modifiée
 * depuis la dernière confirmation.
 */
export function ValidationBadge({ dealId, entityType }: { dealId: string; entityType: string }) {
  const { data: validations } = useDealValidations(dealId);
  const { data: changes } = useDealFieldChanges(dealId);
  const validate = useValidateEntity(dealId);

  const current = validations?.find((v) => v.entityType === entityType);
  const lastChange = changes?.find((c) => c.entityType === entityType);

  if (current) {
    return (
      <Badge variant="success" className="gap-1 font-normal">
        <CheckCircle2 className="h-3 w-3" />
        Validé le {formatDate(current.validatedAt)} par {current.validatedBy.firstName} {current.validatedBy.lastName}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="warning" className="gap-1 font-normal">
        <ShieldAlert className="h-3 w-3" />
        {lastChange ? `À vérifier — modifié le ${formatDate(lastChange.changedAt)}` : 'Non validé'}
      </Badge>
      <Button size="sm" variant="outline" onClick={() => validate.mutate(entityType)} disabled={validate.isPending}>
        {validate.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        Marquer comme validé
      </Button>
    </div>
  );
}
