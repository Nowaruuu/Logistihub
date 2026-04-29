import { getDeliveries, createDelivery, getDeliveryDetail, updateDeliveryStatus, getAvailableJobs, acceptJob } from '../lib/api';
import { Delivery } from '../types';

export const deliveryService = {
  /**
   * Get active deliveries for the current user (polling-based)
   */
  async getActiveDeliveries(): Promise<Delivery[]> {
    const all = await getDeliveries();
    return all.filter((d: any) => ['Pending', 'In-Transit', 'Out for Delivery'].includes(d.status))
      .map(mapShipmentToDelivery);
  },

  /**
   * Get all deliveries for the current user
   */
  async getAllDeliveries(): Promise<Delivery[]> {
    const all = await getDeliveries();
    return all.map(mapShipmentToDelivery);
  },

  /**
   * Create a new delivery shipment
   */
  async createDelivery(deliveryData: Partial<Delivery> & { item_type_flag?: string; receiverPhone?: string }): Promise<string> {
    const result = await createDelivery({
      pickup_location: deliveryData.origin || '',
      dropoff_location: deliveryData.destination || '',
      pickup_lat: deliveryData.originLat,
      pickup_lng: deliveryData.originLng,
      dropoff_lat: deliveryData.destLat,
      dropoff_lng: deliveryData.destLng,
      receiver_name: deliveryData.receiverName,
      receiver_phone: deliveryData.receiverPhone,
      receiver_address: deliveryData.destination,
      item_type_flag: deliveryData.item_type_flag || 'PACKAGE',
      weight: deliveryData.weight,
      size: deliveryData.size,
      shipping_method: deliveryData.shippingMethod,
      total_fee: deliveryData.totalFee,
      content_description: deliveryData.origin,
      estimated_arrival: deliveryData.estimatedArrival,
    });
    return result.delivery_number;
  },

  /**
   * Get delivery detail by tracking/delivery number
   */
  async getDeliveryByTracking(trackingNumber: string): Promise<{ shipment: any; history: any[]; payments: any[] } | null> {
    try {
      return await getDeliveryDetail(trackingNumber);
    } catch {
      return null;
    }
  },

  /**
   * Update delivery status (driver only)
   */
  async updateStatus(deliveryNumber: string, status: string, location?: string): Promise<void> {
    await updateDeliveryStatus(deliveryNumber, status);
  },

  /**
   * Get available jobs for drivers
   */
  async getAvailableJobs(): Promise<Delivery[]> {
    const jobs = await getAvailableJobs();
    return jobs.map(mapShipmentToDelivery);
  },

  /**
   * Accept a delivery job (driver)
   */
  async acceptJob(deliveryNumber: string): Promise<void> {
    await acceptJob(deliveryNumber);
  },

  /**
   * Get driver's assigned deliveries
   */
  async getDriverDeliveries(): Promise<Delivery[]> {
    const all = await getDeliveries();
    return all.filter((d: any) => ['In-Transit', 'Out for Delivery'].includes(d.status))
      .map(mapShipmentToDelivery);
  }
};

/**
 * Map backend SHIPMENT row to frontend Delivery type
 */
function mapShipmentToDelivery(row: any): Delivery {
  return {
    id: row.delivery_number || row.id || '',
    trackingNumber: row.delivery_number || row.trackingNumber || '',
    senderUid: (row.sender_user_id || '').toString(),
    senderName: row.sender_name || row.client_name || '',
    receiverName: row.receiver_name || '',
    driverUid: row.assigned_driver_id?.toString(),
    driverName: row.driver_name || '',
    origin: row.pickup_location || '',
    destination: row.dropoff_location || '',
    status: normalizeStatus(row.status || ''),
    estimatedArrival: row.estimated_arrival || 'Calculating...',
    weight: row.weight || row.distance_km || 0,
    size: row.size || row.item_type_flag || '',
    shippingMethod: row.shipping_method || 'Standard',
    totalFee: parseFloat(row.total_fee || row.total_amount || 0) || 0,
    currentLat: row.pickup_lat || 14.5995,
    currentLng: row.pickup_lng || 120.9842,
    originLat: row.pickup_lat,
    originLng: row.pickup_lng,
    destLat: row.dropoff_lat,
    destLng: row.dropoff_lng,
    history: [],
    createdAt: row.created_at || new Date().toISOString()
  };
}

function normalizeStatus(status: string): 'Processing' | 'In Transit' | 'Out for Delivery' | 'Delivered' {
  const map: Record<string, any> = {
    'Pending': 'Processing',
    'Processing': 'Processing',
    'In-Transit': 'In Transit',
    'In Transit': 'In Transit',
    'Out for Delivery': 'Out for Delivery',
    'Delivered': 'Delivered',
    'Failed': 'Processing'
  };
  return map[status] || 'Processing';
}
