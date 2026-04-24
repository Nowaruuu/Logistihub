import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  addDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Notification } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const notificationService = {
  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(uid: string, callback: (notifications: Notification[]) => void) {
    const path = `users/${uid}/notifications`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Notification));
      callback(notifications);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  },

  /**
   * Mark notification as read
   */
  async markAsRead(uid: string, notificationId: string): Promise<void> {
    const path = `users/${uid}/notifications/${notificationId}`;
    try {
      const docRef = doc(db, `users/${uid}/notifications`, notificationId);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(uid: string): Promise<void> {
    const path = `users/${uid}/notifications`;
    try {
      const q = query(
        collection(db, path),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const promises = snapshot.docs.map(n => updateDoc(doc(db, path, n.id), { read: true }));
      await Promise.all(promises);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  /**
   * Create a new notification
   */
  async createNotification(notification: Partial<Notification>): Promise<string> {
    const uid = notification.uid || '';
    const path = `users/${uid}/notifications`;
    try {
      const fullNotification: Omit<Notification, 'id'> = {
        uid,
        title: notification.title || 'New Notification',
        message: notification.message || '',
        type: notification.type || 'Shipments',
        read: false,
        createdAt: new Date().toISOString(),
        ...notification
      };

      const docRef = await addDoc(collection(db, path), fullNotification);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      throw err;
    }
  }
};
