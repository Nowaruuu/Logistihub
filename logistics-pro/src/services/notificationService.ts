import { getNotifications, markNotificationRead } from '../lib/api';
import { Notification } from '../types';

export const notificationService = {
  async getNotifications(uid: string): Promise<Notification[]> {
    const rows = await getNotifications();
    return rows.map((r: any) => ({
      id: r.id?.toString(),
      uid: r.user_id?.toString() || uid,
      title: r.title || '',
      message: r.message || '',
      type: r.type || 'Shipments',
      read: !!r.is_read,
      createdAt: r.created_at || new Date().toISOString(),
      relatedTrackingNumber: r.related_tracking
    }));
  },

  async markAsRead(id: string): Promise<void> {
    await markNotificationRead(id);
  },

  async createNotification(data: Partial<Notification>): Promise<void> {
    // Notifications are created server-side automatically
    console.log('Notifications are created server-side');
  },

  async getUnreadCount(uid: string): Promise<number> {
    const all = await this.getNotifications(uid);
    return all.filter(n => !n.read).length;
  }
};
