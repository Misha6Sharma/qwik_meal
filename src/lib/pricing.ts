export interface PricingConfig {
  subtotal: number;
  productSavings: number;
  deliveryChargeAmount: number;
  packagingChargeAmount: number;
  processingFeeAmount: number;
  isFreeDelivery: boolean;
  waivePackagingCharge: boolean;
  waiveProcessingFee: boolean;
  gstRate: number; // e.g. 0.05 for 5%
}

export const calculateOrderPricing = (config: PricingConfig) => {
  const charges = {
    delivery: config.isFreeDelivery ? 0 : config.deliveryChargeAmount,
    packaging: config.waivePackagingCharge ? 0 : config.packagingChargeAmount,
    processing: config.waiveProcessingFee ? 0 : config.processingFeeAmount,
  };
  
  const savings = {
    product: config.productSavings,
    delivery: config.isFreeDelivery ? config.deliveryChargeAmount : 0,
    packaging: config.waivePackagingCharge ? config.packagingChargeAmount : 0,
    processing: config.waiveProcessingFee ? config.processingFeeAmount : 0,
  };
  
  const totalSavings = savings.product + savings.delivery + savings.packaging + savings.processing;
  const gstTotal = config.subtotal * config.gstRate;
  const grandTotal = config.subtotal + gstTotal + charges.delivery + charges.packaging + charges.processing;
  
  return { charges, savings, totalSavings, gstTotal, grandTotal, subtotal: config.subtotal };
};
