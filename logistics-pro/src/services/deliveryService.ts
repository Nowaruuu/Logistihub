import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  limit, 
  addDoc, 
  getDocs,
  doc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Delivery } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const deliveryService = {
  /**
   * Create a new delivery shipment
   */
  async createDelivery(deliveryData: Partial<Delivery>): Promise<string> {
    const path = 'deliveries';
    try {
      const trackingNumber = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Ensure coordinates are set (even if mock)
      const originLat = deliveryData.originLat || 14.5489;
      const originLng = deliveryData.originLng || 121.0486;
      const destLat = deliveryData.destLat || (originLat + (Math.random() - 0.5) * 0.2);
      const destLng = deliveryData.destLng || (originLng + (Math.random() - 0.5) * 0.2);

      const fullDelivery: Omit<Delivery, 'id'> = {
        trackingNumber,
        senderUid: deliveryData.senderUid || '',
        senderName: deliveryData.senderName || '',
        receiverName: deliveryData.receiverName || 'Recipient',
        origin: deliveryData.origin || '',
        destination: deliveryData.destination || '',
        status: 'Processing',
        estimatedArrival: deliveryData.estimatedArrival || '3-5 business days',
        weight: deliveryData.weight || 0,
        size: deliveryData.size || 'Small (Box)',
        shippingMethod: deliveryData.shippingMethod || 'Standard Delivery',
        totalFee: deliveryData.totalFee || 0,
        currentLat: originLat,
        currentLng: originLng,
        originLat,
        originLng,
        destLat,
        destLng,
        history: [
          {
            status: 'Processing',
            location: deliveryData.origin || 'Origin',
            timestamp: new Date().toISOString(),
            description: 'Package information received'
          }
        ],
        createdAt: new Date().toISOString(),
        ...deliveryData
      };

      const docRef = await addDoc(collection(db, path), fullDelivery);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      throw err;
    }
  },

  /**
   * Subscribe to active deliveries for a specific user
   */
  subscribeToActiveDeliveries(uid: string, callback: (deliveries: Delivery[]) => void) {
    const path = 'deliveries';
    const q = query(
      collection(db, path),
      where('senderUid', '==', uid),
      where('status', 'in', ['Processing', 'In Transit', 'Out for Delivery']),
      limit(10)
    );

    return onSnapshot(q, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => {
        const data = doc.data() as Delivery;
        // Ensure coordinates exist for UI mapping
        if (!data.destLat || !data.destLng) {
          const baseLat = data.currentLat || 14.5995;
          const baseLng = data.currentLng || 120.9842;
          data.destLat = baseLat + (Math.random() - 0.5) * 0.1;
          data.destLng = baseLng + (Math.random() - 0.5) * 0.1;
        }
        return { id: doc.id, ...data } as Delivery;
      });
      callback(deliveries);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  },

  /**
   * Subscribe to all deliveries for a specific user
   */
  subscribeToAllDeliveries(uid: string, callback: (deliveries: Delivery[]) => void) {
    const path = 'deliveries';
    const q = query(
      collection(db, path),
      where('senderUid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Delivery));
      callback(deliveries);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  },

  /**
   * Subscribe to a single delivery by tracking number
   */
  subscribeToDeliveryByTracking(trackingNumber: string, callback: (delivery: Delivery | null) => void) {
    const path = 'deliveries';
    const q = query(
      collection(db, path),
      where('trackingNumber', '==', trackingNumber),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }
      
      const data = snapshot.docs[0].data() as Delivery;
      // Ensure coordinates exist for UI mapping
      if (!data.destLat || !data.destLng) {
        const baseLat = data.currentLat || 14.5995;
        const baseLng = data.currentLng || 120.9842;
        data.destLat = baseLat + (Math.random() - 0.5) * 0.1;
        data.destLng = baseLng + (Math.random() - 0.5) * 0.1;
      }
      
      callback({ id: snapshot.docs[0].id, ...data } as Delivery);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  },

  /**
   * Clear all deliveries for a user (Admin/Utility)
   */
  async clearAllDeliveries(uid: string): Promise<void> {
    const q = query(collection(db, 'deliveries'), where('senderUid', '==', uid));
    const snapshot = await getDocs(q);
    const { deleteDoc, doc } = await import('firebase/firestore');
    
    const promises = snapshot.docs.map(d => deleteDoc(doc(db, 'deliveries', d.id)));
    await Promise.all(promises);
  },

  /**
   * Subscribe to available jobs (Processing shipments with no driver)
   */
  subscribeToAvailableJobs(callback: (deliveries: Delivery[]) => void) {
    const path = 'deliveries';
    const q = query(
      collection(db, path),
      where('status', '==', 'Processing'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Delivery));
      callback(deliveries);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  },

  /**
   * Subscribe to active assignments for a specific driver
   */
  subscribeToDriverDeliveries(driverUid: string, callback: (deliveries: Delivery[]) => void) {
    const path = 'deliveries';
    const q = query(
      collection(db, path),
      where('driverUid', '==', driverUid),
      where('status', 'in', ['In Transit', 'Out for Delivery']),
      limit(10)
    );

    return onSnapshot(q, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Delivery));
      callback(deliveries);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  },

  /**
   * Accept a delivery job
   */
  async acceptJob(deliveryId: string, driverUid: string, driverName: string): Promise<void> {
    const { updateDoc, doc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'deliveries', deliveryId), {
      driverUid,
      driverName,
      status: 'In Transit',
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Update delivery status
   */
  async updateStatus(deliveryId: string, status: Delivery['status'], location: string): Promise<void> {
    const { updateDoc, doc, arrayUnion } = await import('firebase/firestore');
    await updateDoc(doc(db, 'deliveries', deliveryId), {
      status,
      history: arrayUnion({
        status,
        location,
        timestamp: new Date().toISOString(),
        description: `Status updated to ${status}`
      }),
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Delete an individual delivery
   */
  async deleteDelivery(id: string): Promise<void> {
    const { deleteDoc, doc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'deliveries', id));
  }
};
