// Google Ads Conversion Tracking Utility

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

/**
 * Reports a conversion to Google Ads
 * This function should be called when a successful purchase is completed
 */
export const reportGoogleAdsConversion = (transactionId?: string, value?: number) => {
  // Check if gtag is available
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      // Google Ads conversion tracking event
      window.gtag('event', 'conversion', {
        'send_to': 'AW-754907361/hOtZCNj4iWMBEPOHx--oC',
        'transaction_id': transactionId || '',
        'value': value || 0,
        'currency': 'USD',
        'event_callback': () => {
          console.log('Google Ads conversion tracked successfully');
        }
      });

      console.log('Google Ads conversion event sent:', {
        transaction_id: transactionId,
        value: value
      });
    } catch (error) {
      console.error('Error tracking Google Ads conversion:', error);
    }
  } else {
    console.warn('Google Ads tracking not available - gtag not found');
  }
};

/**
 * Reports a purchase event to Google Analytics
 * This complements the conversion tracking with additional purchase data
 */
export const reportGoogleAnalyticsPurchase = (orderDetails: {
  transactionId: string;
  value: number;
  items: Array<{
    item_id: string;
    item_name: string;
    category: string;
    quantity: number;
    price: number;
  }>;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      window.gtag('event', 'purchase', {
        transaction_id: orderDetails.transactionId,
        value: orderDetails.value,
        currency: 'USD',
        items: orderDetails.items
      });

      console.log('Google Analytics purchase event sent:', orderDetails);
    } catch (error) {
      console.error('Error tracking Google Analytics purchase:', error);
    }
  }
};

/**
 * Combined tracking function for both Google Ads conversion and GA purchase
 */
export const trackSuccessfulPurchase = (purchaseData: {
  transactionId: string;
  totalAmount: number;
  packageType: string;
  packagePrice: number;
  addOns?: string[];
}) => {
  // Track Google Ads conversion
  reportGoogleAdsConversion(purchaseData.transactionId, purchaseData.totalAmount);

  // Track Google Analytics purchase with detailed item data
  const items = [
    {
      item_id: `package_${purchaseData.packageType.toLowerCase().replace(' ', '_')}`,
      item_name: `Heritage Box ${purchaseData.packageType} Package`,
      category: 'Memory Digitization Package',
      quantity: 1,
      price: purchaseData.packagePrice
    }
  ];

  // Add add-ons as separate items if they exist
  if (purchaseData.addOns && purchaseData.addOns.length > 0) {
    purchaseData.addOns.forEach((addOn, index) => {
      items.push({
        item_id: `addon_${index}`,
        item_name: addOn,
        category: 'Add-on Service',
        quantity: 1,
        price: 0 // Add-on pricing would need to be calculated separately
      });
    });
  }

  reportGoogleAnalyticsPurchase({
    transactionId: purchaseData.transactionId,
    value: purchaseData.totalAmount,
    items
  });
};
