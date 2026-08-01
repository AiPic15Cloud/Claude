export function AtlasUnavailable({ reason }: { reason: string }) {
  return (
    <div className="rounded border border-dashed border-line bg-raised/40 p-5 text-sm text-muted">
      <p className="mb-1 text-micro font-medium uppercase tracking-wider text-faint">
        Atlas indisponible
      </p>
      <p>{reason}</p>
      {reason.includes("ANTHROPIC_API_KEY") && (
        <p className="mt-2 text-xs text-faint">
          Renseignez <code className="text-accent">ANTHROPIC_API_KEY</code> dans votre fichier{" "}
          <code>.env.local</code> pour activer les synthèses Atlas.
        </p>
      )}
    </div>
  );
}
