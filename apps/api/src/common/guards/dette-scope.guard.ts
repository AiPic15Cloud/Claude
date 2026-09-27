import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Même règle que DetteScopeGuard, pour les objets partagés/polymorphes
 * (documents, notes, tâches, actions, alertes, cockpit, recherche,
 * bandeau marché) que le guard lui-même ne couvre pas — voir son
 * commentaire. Chaque service consommateur doit l'appliquer explicitement
 * (filtrer sur `dealId: null` ou sauter la requête Deal), le guard
 * ci-dessous ne peut pas le faire à leur place puisque ce sont des routes
 * partiellement dette (un accès sans dealId reste légitime).
 */
export function isDetteRestricted(workspaceScope: string): boolean {
  return workspaceScope !== 'FULL';
}

/**
 * Spec ATLAS v2 §2/D02 (espaces étanches) — stopgap avant le vrai modèle
 * d'espaces (Lot B, workspace_id par objet). Bloque tout compte
 * FRACTIONAL_ONLY sur les contrôleurs exclusivement scopés Deal/dette
 * (pipeline, garanties, remboursements, préqual, risk engine, playbooks,
 * knowledge graph, assistant IA...). Ne couvre pas les objets
 * partagés/polymorphes (documents, notes, tags, action items, cockpit,
 * alertes, recherche) — leur filtrage par objet reste à faire au Lot B.
 * Toujours utilisé après JwtAuthGuard : lit `request.user` déjà authentifié.
 */
@Injectable()
export class DetteScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || user.workspaceScope !== 'FULL') {
      throw new ForbiddenException("Cet espace n'est pas accessible à ce compte.");
    }
    return true;
  }
}
