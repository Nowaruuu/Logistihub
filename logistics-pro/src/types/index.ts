export interface SavedAddress {
  id: string;
  uid: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  username?: string;
  email: string;
  phone?: string;
  role: 'user' | 'driver' | 'admin';
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  createdAt: string;
  profile_picture?: string;
}

export interface Driver {
  uid: string;
  vehicleType: 'Motorcycle' | 'Van' | 'Truck' | 'Bicycle';
  plateNumber: string;
  vehicleModel: string;
  status: 'Available' | 'On Delivery' | 'Offline';
  verificationStatus: 'Pending' | 'Verified' | 'Suspended';
  rating: number;
  totalDeliveries: number;
  currentLat?: number;
  currentLng?: number;
  lastActive: string;
}

export interface DeliveryHistory {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

export interface Delivery {
  id?: string;
  trackingNumber: string;
  senderUid: string;
  senderName?: string;
  receiverName?: string;
  driverUid?: string;
  driverName?: string;
  origin: string;
  destination: string;
  status: 'Processing' | 'In Transit' | 'Out for Delivery' | 'Delivered';
  estimatedArrival?: string;
  weight?: number;
  size?: string;
  shippingMethod?: string;
  totalFee?: number;
  currentLat?: number;
  currentLng?: number;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  history: DeliveryHistory[];
  createdAt: string;
  isPaid?: boolean;       // true if a 'Paid' payment record exists in DB
  paymentMethod?: string; // e.g. 'gcash', 'card'
  balanceStatus?: string; // 'Pending' | 'Paid' | null (only for split payments)
  balanceAmount?: number; // balance amount due (only for split payments)
}

export interface Notification {
  id?: string;
  uid: string;
  title: string;
  message: string;
  type: 'Shipments' | 'Promotions' | 'Account';
  read: boolean;
  createdAt: string;
  relatedTrackingNumber?: string;
}
