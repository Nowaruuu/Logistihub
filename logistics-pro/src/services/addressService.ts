import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { SavedAddress } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const addressService = {
  /**
   * Subscribe to user's saved addresses
   */
  subscribeToAddresses(uid: string, callback: (addresses: SavedAddress[]) => void) {
    const path = `users/${uid}/addresses`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const addresses = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as SavedAddress));
      callback(addresses);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  },

  /**
   * Add a new address
   */
  async addAddress(uid: string, address: Partial<SavedAddress>): Promise<string> {
    const path = `users/${uid}/addresses`;
    try {
      const fullAddress = {
        uid,
        createdAt: new Date().toISOString(),
        ...address
      };
      const docRef = await addDoc(collection(db, path), fullAddress);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      throw err;
    }
  },

  /**
   * Delete an address
   */
  async deleteAddress(uid: string, addressId: string): Promise<void> {
    const path = `users/${uid}/addresses/${addressId}`;
    try {
      await deleteDoc(doc(db, `users/${uid}/addresses`, addressId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      throw err;
    }
  }
};
