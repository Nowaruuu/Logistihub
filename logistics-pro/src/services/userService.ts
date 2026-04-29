import { getProfile, updateProfile } from '../lib/api';
import { UserProfile } from '../types';

export const userService = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    try {
      return await getProfile();
    } catch {
      return null;
    }
  },

  async saveProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
    await updateProfile({
      first_name: profileData.fullName?.split(' ')[0],
      last_name: profileData.fullName?.split(' ').slice(1).join(' '),
      phone: profileData.phone
    });
  },

  async getDriver(uid: string): Promise<any | null> {
    try {
      const profile = await getProfile();
      if (profile?.role === 'driver') return profile;
      return null;
    } catch {
      return null;
    }
  },

  async saveDriver(uid: string, driverData: any): Promise<void> {
    await updateProfile(driverData);
  },

  async deleteProfile(uid: string): Promise<void> {
    console.warn('deleteProfile not implemented for API backend');
  }
};
