import { useState } from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFractionalProvenance, useUpsertProvenance } from '../hooks/use-fractional';
import {
  PROVENANCE_SOURCE_LEVEL_LABELS,
  PROVENANCE_VERIFICATION_STATUS_LABELS,
  PROVENANCE_CONFIDENCE_LABELS,
  type ProvenanceSourceLevel,
  type ProvenanceVerificationStatus,
  type ProvenanceConfidence,
} from '@/types';

const SOURCE_LEVELS: ProvenanceSourceLevel[] = [
  'LEVEL_A_LEGAL_EXECUTED',
  'LEVEL_B_THIRD_PARTY_VERIFIED',
  'LEVEL_C_INVESTMENT_OPERATOR_DOCUMENT',
  'LEVEL_D_DECLARATIVE',
  'LEVEL_E_ATLAS_ASSUMPTION',
];
const VERIFICATION_STATUSES: ProvenanceVerificationStatus[] = ['UNVERIFIED', 'CROSS_CHECKED', 'VERIFIED', 'CONFLICTING'];
const CONFIDENCE_LEVELS: ProvenanceConfidence[] = ['LOW', 'MEDIUM', 'HIGH'];

/**
 * Data Integrity Engine (V3.1 §3, V2 §2-3) — badge cliquable à côté d'un
 * champ critique, pour retrouver/saisir sa provenance (niveau de source,
 * référence documentaire, statut de vérification, confiance) sans jamais
 * dupliquer la valeur elle-même (Single Source of Truth) : la valeur réelle
 * reste sur le champ d'origine, ce composant n'annote que sa preuve.
 */
export function ProvenanceBadge({ entityType, entityId, fieldKey, label }: { entityType: string; entityId: string; fieldKey: string; label: string }) {
  const { data: records } = useFractionalProvenance(entityType, entityId);
  const record = records?.find((r) => r.fieldKey === fieldKey);
  const upsert = useUpsertProvenance(entityType, entityId, fieldKey);

  const [sourceLevel, setSourceLevel] = useState<ProvenanceSourceLevel>(record?.sourceLevel ?? 'LEVEL_D_DECLARATIVE');
  const [sourceReference, setSourceReference] = useState(record?.sourceReference ?? '');
  const [verificationStatus, setVerificationStatus] = useState<ProvenanceVerificationStatus>(record?.verificationStatus ?? 'UNVERIFIED');
  const [confidence, setConfidence] = useState<ProvenanceConfidence>(record?.confidence ?? 'MEDIUM');
  const [isOverride, setIsOverride] = useState(record?.isOverride ?? false);
  const [overrideJustification, setOverrideJustification] = useState(record?.overrideJustification ?? '');

  const syncFromRecord = () => {
    setSourceLevel(record?.sourceLevel ?? 'LEVEL_D_DECLARATIVE');
    setSourceReference(record?.sourceReference ?? '');
    setVerificationStatus(record?.verificationStatus ?? 'UNVERIFIED');
    setConfidence(record?.confidence ?? 'MEDIUM');
    setIsOverride(record?.isOverride ?? false);
    setOverrideJustification(record?.overrideJustification ?? '');
  };

  const handleSave = () => {
    upsert.mutate({
      sourceLevel,
      sourceReference: sourceReference || undefined,
      verificationStatus,
      confidence,
      isOverride,
      overrideJustification: isOverride ? overrideJustification : undefined,
    });
  };

  const Icon = !record ? ShieldQuestion : record.verificationStatus === 'VERIFIED' ? ShieldCheck : ShieldAlert;
  const iconClass = !record ? 'text-muted-foreground/50' : record.verificationStatus === 'VERIFIED' ? 'text-success' : record.verificationStatus === 'CONFLICTING' ? 'text-destructive' : 'text-warning';

  return (
    <Popover onOpenChange={(open) => open && syncFromRecord()}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex shrink-0 outline-none" title={record ? `${PROVENANCE_SOURCE_LEVEL_LABELS[record.sourceLevel]} · ${PROVENANCE_VERIFICATION_STATUS_LABELS[record.verificationStatus]}` : 'Provenance non renseignée'}>
          <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
          <span className="sr-only">Provenance de {label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provenance — {label}</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Niveau de source</Label>
            <Select value={sourceLevel} onValueChange={(v) => setSourceLevel(v as ProvenanceSourceLevel)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {PROVENANCE_SOURCE_LEVEL_LABELS[lvl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Référence (document/page/URL)</Label>
            <Input className="h-8 text-xs" value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} placeholder="ex. Bail signé, article 3, p.2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Statut</Label>
              <Select value={verificationStatus} onValueChange={(v) => setVerificationStatus(v as ProvenanceVerificationStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERIFICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROVENANCE_VERIFICATION_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Confiance</Label>
              <Select value={confidence} onValueChange={(v) => setConfidence(v as ProvenanceConfidence)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_LEVELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PROVENANCE_CONFIDENCE_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-normal">
            <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={isOverride} onChange={(e) => setIsOverride(e.target.checked)} />
            Valeur corrigée manuellement (override)
          </label>
          {isOverride && (
            <Input
              className="h-8 text-xs"
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
              placeholder="Justification de l'override (obligatoire)"
            />
          )}
          <Button size="sm" onClick={handleSave} disabled={upsert.isPending || (isOverride && !overrideJustification.trim())}>
            {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          {record && <p className="text-[11px] text-muted-foreground">Version {record.version} — dernière saisie {new Date(record.observedAt).toLocaleDateString('fr-FR')}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
