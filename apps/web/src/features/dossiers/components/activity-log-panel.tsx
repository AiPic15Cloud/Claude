import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDealActivities } from '../hooks/use-activities';

export function ActivityLogPanel({ dealId }: { dealId: string }) {
  const { data: activities, isLoading } = useDealActivities(dealId);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        {isLoading && <Skeleton className="h-48 w-full" />}
        {!isLoading && (!activities || activities.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune activité enregistrée sur ce dossier.</p>
        )}
        {activities?.map((activity) => (
          <div key={activity.id} className="flex gap-2.5 text-sm">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <div className="flex-1">
              <p className="text-foreground">{activity.message}</p>
              <p className="text-xs text-muted-foreground">
                {activity.user ? `${activity.user.firstName} ${activity.user.lastName} · ` : ''}
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: fr })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
