import { getNotifications, markNotificationRead } from '../lib/api';
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

  async markAsRead(_uid: string, id: string): Promise<void> {
    try {
      // Extract numeric id from 'n-123' or 'sh-456' format
      const numId = id.replace(/^[a-z]+-/, '');
      await markNotificationRead(numId);
    } catch {
      // Fallback: read status handled client-side
    }
  },

  async markAllAsRead(_uid: string): Promise<void> {
    // Read status is handled client-side for now
  },

  async getUnreadCount(): Promise<number> {
    const all = await this.getNotifications();
    return all.filter(n => !n.read).length;
  }
};
