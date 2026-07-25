import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Activity } from '@/types';

interface ActivityFeedCardProps {
  activities: Activity[];
}

export function ActivityFeedCard({ activities }: ActivityFeedCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activities.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Aucune activité récente</p>}
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-2.5 text-sm">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <div className="flex-1">
              <p className="text-foreground">
                {activity.message}
                {activity.deal && (
                  <>
                    {' — '}
                    <Link to={`/portfolio?dealId=${activity.deal.id}`} className="text-primary hover:underline">
                      {activity.deal.name}
                    </Link>
                  </>
                )}
              </p>
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
