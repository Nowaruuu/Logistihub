import { 
  collection, 
  getDocs, 
  query, 
  collectionGroup 
} from 'firebase/firestore';
import { db } from '../firebase';

export const exportService = {
  /**
   * Export all data from Firestore
   * Note: This requires admin privileges in firestore.rules
   */
  async exportAllData() {
    const data: any = {
      users: [],
      drivers: [],
      deliveries: [],
      notifications: [], // Root level if any
      global_stats: {}
    };

    // 1. Fetch all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnapshot.docs) {
      const userData = { id: userDoc.id, ...userDoc.data() } as any;
      
      // Fetch subcollections for each user
      const subcollections = ['notifications', 'addresses', 'payment_methods'];
      for (const sub of subcollections) {
        const subSnapshot = await getDocs(collection(db, 'users', userDoc.id, sub));
        userData[sub] = subSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      data.users.push(userData);
    }

    // 2. Fetch all drivers
    const driversSnapshot = await getDocs(collection(db, 'drivers'));
    data.drivers = driversSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Fetch all deliveries
    const deliveriesSnapshot = await getDocs(collection(db, 'deliveries'));
    data.deliveries = deliveriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Fetch root-level notifications (if any were created there by mistake or design)
    try {
      const rootNotificationsSnapshot = await getDocs(collection(db, 'notifications'));
      data.notifications = rootNotificationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.log("No root-level notifications or access denied");
    }

    return data;
  }
};
