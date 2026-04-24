import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const userService = {
  /**
   * Get user profile by UID
   */
  async getProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      throw err;
    }
  },

  /**
   * Get driver record by UID
   */
  async getDriver(uid: string): Promise<any | null> {
    const path = `drivers/${uid}`;
    try {
      const docRef = doc(db, 'drivers', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      throw err;
    }
  },

  /**
   * Create or update driver record
   */
  async saveDriver(uid: string, driverData: any): Promise<void> {
    const path = `drivers/${uid}`;
    const docRef = doc(db, 'drivers', uid);
    try {
      await setDoc(docRef, driverData, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      throw err;
    }
  },

  /**
   * Create or update user profile
   */
  async saveProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
    const path = `users/${uid}`;
    const docRef = doc(db, 'users', uid);
    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await updateDoc(docRef, profileData);
      } else {
        const newProfile: UserProfile = {
          uid,
          fullName: profileData.fullName || '',
          email: profileData.email || '',
          role: profileData.role || 'user',
          tier: 'Bronze',
          createdAt: new Date().toISOString(),
          ...profileData
        };
        await setDoc(docRef, newProfile);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      throw err;
    }
  },

  /**
   * Delete user profile
   */
  async deleteProfile(uid: string): Promise<void> {
    const path = `users/${uid}`;
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      throw err;
    }
  }
};
