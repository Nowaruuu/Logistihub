import { getAddresses, saveAddress, deleteAddress } from '../lib/api';
import { SavedAddress } from '../types';

export const addressService = {
  async getAddresses(uid: string): Promise<SavedAddress[]> {
    const rows = await getAddresses();
    return rows.map((r: any) => ({
      id: r.id?.toString(),
      uid: r.user_id?.toString() || uid,
      label: r.label || 'Home',
      fullName: r.full_name || '',
      phone: r.phone || '',
      address: r.address || '',
      city: r.city || '',
      zipCode: r.zip_code || '',
      createdAt: r.created_at || new Date().toISOString()
    }));
  },

  async saveAddress(uid: string, addressData: Partial<SavedAddress>): Promise<string> {
    const result = await saveAddress({
      label: addressData.label || 'Home',
      full_name: addressData.fullName || '',
      phone: addressData.phone || '',
      address: addressData.address || '',
      city: addressData.city || '',
      zip_code: addressData.zipCode || ''
    });
    return result.id?.toString() || '';
  },

  async deleteAddress(id: string): Promise<void> {
    await deleteAddress(id);
  }
};
