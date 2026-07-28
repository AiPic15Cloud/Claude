import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Bell, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '@/features/alerts/use-alerts';
import { cn } from '@/lib/utils';
import type { Alert, AlertSeverity } from '@/types';

const SEVERITY_ICON: Record<AlertSeverity, typeof Info> = {
  INFO: Info,
  WARNING: TriangleAlert,
  CRITICAL: CircleAlert,
};

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  INFO: 'text-primary',
  WARNING: 'text-warning',
  CRITICAL: 'text-destructive',
};

export function NotificationsMenu() {
  const { data: alerts = [] } = useAlerts();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const navigate = useNavigate();
  const unreadCount = alerts.filter((a) => !a.read).length;

  const handleOpen = (alert: Alert) => {
    if (!alert.read) markRead.mutate(alert.id);
    if (alert.dealId) {
      navigate(`/deals/${alert.dealId}`);
    } else if (alert.article?.url) {
      window.open(alert.article.url, '_blank', 'noopener,noreferrer');
    } else if (alert.articleId) {
      navigate('/market');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Tout marquer lu
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {alerts.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">Aucune notification</p>
          )}
          {alerts.map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity];
            return (
              <DropdownMenuItem
                key={alert.id}
                onClick={() => handleOpen(alert)}
                className="flex items-start gap-2.5 whitespace-normal py-2"
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', SEVERITY_COLOR[alert.severity])} />
                <div className="flex-1">
                  <p className={cn('text-sm', !alert.read && 'font-medium')}>{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                {!alert.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
