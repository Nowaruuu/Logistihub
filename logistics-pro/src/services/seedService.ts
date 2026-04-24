import { deliveryService } from './deliveryService';
import { notificationService } from './notificationService';
import { UserProfile } from '../types';

export const seedService = {
  async seedSampleData(profile: UserProfile): Promise<void> {
    const deliveries = [
      {
        trackingNumber: 'TRK-829104',
        senderUid: profile.uid,
        senderName: profile.fullName,
        origin: 'Quezon City, PH',
        destination: 'Manila, PH',
        status: 'Out for Delivery' as const,
        estimatedArrival: 'Today, 4:00 PM',
        weight: 2.5,
        size: 'Small (Box)',
        shippingMethod: 'Standard Delivery',
        totalFee: 150,
        currentLat: 14.6091,
        currentLng: 121.0223,
        history: [
          { status: 'Processing' as const, location: 'Quezon City, PH', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), description: 'Package received' },
          { status: 'In Transit' as const, location: 'Manila Hub', timestamp: new Date(Date.now() - 86400000).toISOString(), description: 'Arrived at sorting facility' },
          { status: 'Out for Delivery' as const, location: 'Manila, PH', timestamp: new Date().toISOString(), description: 'Driver is on the way' }
        ],
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        trackingNumber: 'TRK-910328',
        senderUid: profile.uid,
        senderName: profile.fullName,
        origin: 'Davao City, PH',
        destination: 'Cebu City, PH',
        status: 'In Transit' as const,
        estimatedArrival: 'Tomorrow, Aug 24',
        weight: 5.0,
        size: 'Medium (Crate)',
        shippingMethod: 'Express Delivery',
        totalFee: 450,
        currentLat: 10.3157,
        currentLng: 123.8854,
        history: [
          { status: 'Processing' as const, location: 'Davao City, PH', timestamp: new Date(Date.now() - 86400000).toISOString(), description: 'Package received' },
          { status: 'In Transit' as const, location: 'Davao Hub', timestamp: new Date().toISOString(), description: 'Departed from origin' }
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    const notifications = [
      {
        uid: profile.uid,
        title: 'Package Out for Delivery',
        message: 'Your package PH-12345678 is arriving today. Ensure someone is available to receive it.',
        type: 'Shipments' as const,
        read: false,
        createdAt: new Date().toISOString(),
        relatedTrackingNumber: 'TRK-829104'
      },
      {
        uid: profile.uid,
        title: 'Shipment Delayed',
        message: 'Weather conditions have delayed your shipment PH-98765432. New estimate: Tomorrow.',
        type: 'Shipments' as const,
        read: true,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    const deliveryPromises = deliveries.map(d => deliveryService.createDelivery(d));
    const notificationPromises = notifications.map(n => notificationService.createNotification(n));

    await Promise.all([...deliveryPromises, ...notificationPromises]);
  }
};
