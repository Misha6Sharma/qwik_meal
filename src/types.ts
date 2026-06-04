export type Role = 'SUPER_ADMIN' | 'BRAND_ADMIN' | 'CORPORATE_USER';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  company?: string;
  isWhitelisted?: boolean;
  brandId?: string; // For Brand Admins
  passwordHash?: string;
  needsPasswordChange?: boolean;
};

export type LoginActivity = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: Role;
  loginTime: string;
  logoutTime?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type TransactionAudit = {
  id: string;
  transactionId: string;
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  refundStatus: RefundStatus;
  timestamp: string;
  details?: string;
};

export type Brand = {
  id: string;
  name: string;
  logo: string;
  description: string;
  offer: string;
  isActive?: boolean;
  uploadTimestamp?: string;
  lastModifiedTimestamp?: string;
  modifiedBy?: string;
};

export type CampaignPrivacy = 'PUBLIC' | 'PRIVATE' | 'CUSTOMERS';

export type CoverageType = 'ALL_INDIA' | 'PINCODES' | 'CITIES' | 'RADIUS' | 'STORES';

export interface CampaignServiceability {
  enabled: boolean;
  coverageType: CoverageType;
  pincodes?: string[];
  cities?: string[];
  radiusInfo?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  storeIds?: string[];
}

export type FulfillmentMode = 'FIXED' | 'RANGE' | 'OPEN';

export interface FulfillmentSettings {
  mode: FulfillmentMode;
  fixedDeliveryDate?: string;
  fixedDeliveryTime?: string;
  fixedPickupDate?: string;
  fixedPickupTime?: string;
  rangeStartDate?: string;
  rangeEndDate?: string;
}

export type Campaign = {
  id: string;
  brandId: string;
  name: string;
  isActive: boolean;
  sharePrivacy?: CampaignPrivacy;
  serviceability?: CampaignServiceability;
  startDate?: string;
  endDate?: string;
  fulfillmentSettings?: FulfillmentSettings;
  benefits?: {
    freeDelivery: boolean;
    minOrderValueForFreeDelivery: number;
    deliveryChargeAmount: number;
    packagingChargeAmount: number;
    waivePackagingCharge: boolean;
    processingFeeAmount: number;
    waiveProcessingFee: boolean;
  };
  socialProof?: {
    enabled: boolean;
    ordersPlaced: number;
    rating: number;
    showPopularity: boolean;
  };
  ctaConfig?: {
    enabled: boolean;
    text: string;
    theme: string;
  };
};

export type ItemVariant = {
  size: 'Normal' | 'Medium' | 'Large';
  mrp: number;
  offerPrice: number;
  isActive: boolean;
};

export type MenuItem = {
  id: string;
  brandId: string;
  campaignId: string;
  name: string;
  description?: string;
  mealImage: string;
  mrp: number;
  offerPrice: number;
  deliveryCharges: number;
  proposedSaving: number;
  dietaryType: 'VEG' | 'NON_VEG';
  category?: string;
  displayOrder?: number;
  isActive?: boolean;
  variants?: ItemVariant[];
};

export type CartItem = {
  menuItem: MenuItem;
  variantSize?: 'Normal' | 'Medium' | 'Large';
  quantity: number;
};

export type OrderVariant = 'SELF' | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type DeliveryStatus = 'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FINISHED';
export type RefundStatus = 'NONE' | 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type AuditLog = {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details?: string;
};

export type CampaignLog = {
  id: string;
  campaignId: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details?: string;
  pincode?: string;
};

export type Order = {
  id: string;
  userId: string;
  campaignId?: string;
  campaignName?: string;
  campaignExpiry?: string;
  scheduledDeliveryDate?: string;
  scheduledDeliveryTime?: string;
  items: CartItem[];
  totalAmount: number;
  gstAmount?: number;
  savingsAmount?: number;
  paymentMethod?: string;
  status: DeliveryStatus;
  paymentStatus: PaymentStatus;
  refundStatus: RefundStatus;
  orderVariant: OrderVariant;
  recipientName?: string;
  recipientContact?: string;
  recipientEmail?: string;
  deliveryAddress?: string;
  deliveryPinCode?: string;
  deliveryContact?: string;
  deliveryDate: string;
  deliveryTime: string;
  createdAt: string;
  cancellationDate?: string;
  auditLogs: AuditLog[];
};

export type EventLeadStatus = 'NEW' | 'CONTACTED' | 'PROPOSAL_SENT' | 'CONVERTED' | 'CLOSED';

export type EventLead = {
  id: string;
  customerId?: string;
  orderId?: string;
  campaignId?: string;
  name: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  location: string;
  requirements?: string;
  status: EventLeadStatus;
  timestamp: string;
};

export type MealPlan = {
  id: string;
  title: string;
  description: string;
  pricePerMeal: number;
  tags: string[];
  imageUrl: string;
};

export type FeedbackInfo = {
  orderId: string;
  rating: number;
  comment: string;
};
