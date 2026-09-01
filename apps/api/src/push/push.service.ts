import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PrismaService } from '../common/prisma/prisma.service';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Web Push (VAPID) delivery — same degrade-gracefully pattern as the
 * Anthropic key: no VAPID keys configured means sends are silently skipped,
 * never an error that could take down the alert-creation flow that
 * triggers them. A subscription whose push endpoint reports 404/410 (the
 * browser unregistered it, e.g. the user uninstalled the PWA) is pruned so
 * it isn't retried forever.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly configured: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const publicKey = this.config.get<string>('push.vapidPublicKey');
    const privateKey = this.config.get<string>('push.vapidPrivateKey');
    const subject = this.config.get<string>('push.vapidSubject');
    this.configured = Boolean(publicKey && privateKey && subject);
    if (this.configured) {
      webPush.setVapidDetails(subject!, publicKey!, privateKey!);
    }
  }

  isConfigured() {
    return this.configured;
  }

  getVapidPublicKey(): string | null {
    return this.configured ? this.config.get<string>('push.vapidPublicKey')! : null;
  }

  async subscribe(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
      // Re-subscribing (e.g. the browser rotated the endpoint's keys) just
      // refreshes this row rather than erroring on the unique constraint.
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /** Sends to every subscribed device of every user in the organization — alerts are org-scoped, not per-assignee. */
  async sendToOrganization(organizationId: string, payload: PushPayload) {
    if (!this.configured) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { user: { organizationId } },
    });
    await this.sendToSubscriptions(subscriptions, payload);
  }

  /** Sends only to the given user's own devices — used by the "send a test" button so verifying delivery doesn't page the whole team. */
  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.configured) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await this.sendToSubscriptions(subscriptions, payload);
  }

  private async sendToSubscriptions(
    subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
    payload: PushPayload,
  ) {
    if (subscriptions.length === 0) return;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          // Without an explicit urgency, Apple's push gateway (what actually
          // delivers these on iOS Safari/PWA) tends to treat the message as
          // background-priority — landing silently in Notification Centre
          // instead of interrupting with a banner + sound, confirmed on a
          // real device. 'high' is what Web Push's RFC 8030 Urgency header
          // is for, and every notification this service sends (critical
          // alerts, the manual test) is exactly the "worth interrupting for"
          // case it exists for.
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
            { urgency: 'high' },
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          } else {
            this.logger.warn(`Push send failed for subscription ${sub.id}: ${(error as Error).message}`);
          }
        }
      }),
    );
  }
}
