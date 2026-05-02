import { getNotifications } from '../lib/api';
import { Notification } from '../types';

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    try {
      const rows = await getNotifications();
      return (rows || []).map((r: any) => ({
        id: r.id?.toString(),
        uid: '',
        title: r.title || '',
        message: r.message || '',
        type: r.type || 'Shipments',
        read: !!r.read,
        createdAt: r.createdAt || r.created_at || new Date().toISOString(),
        relatedTrackingNumber: r.relatedTrackingNumber || r.related_tracking
      }));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      return [];
    }
  },

  async markAsRead(_uid: string, _id: string): Promise<void> {
    // Read status is handled client-side for now
  },

  async markAllAsRead(_uid: string): Promise<void> {
    // Read status is handled client-side for now
  },

  async getUnreadCount(): Promise<number> {
    const all = await this.getNotifications();
    return all.filter(n => !n.read).length;
  }
};
