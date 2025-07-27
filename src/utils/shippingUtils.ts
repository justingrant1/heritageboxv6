// Direct Shippo API integration for shipping label generation
// This replaces the MCP server approach with direct API calls

interface ShippoAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

interface ShippoParcel {
  length: number;
  width: number;
  height: number;
  distance_unit: string;
  weight: number;
  mass_unit: string;
}

interface ShippoRate {
  object_id: string;
  amount: string;
  currency: string;
  provider: string;
  servicelevel: {
    name: string;
    token: string;
  };
  estimated_days: number;
}

interface ShippoTransaction {
  object_id: string;
  status: string;
  tracking_number: string;
  label_url: string;
  rate: string;
}

// HeritageBox company address
export const HERITAGEBOX_ADDRESS: ShippoAddress = {
  name: "Heritagebox Inc.",
  street1: "7934 West Dr. Unit 1005",
  city: "North Bay Village",
  state: "FL",
  zip: "33141",
  country: "US",
  phone: "305-555-0123",
  email: "support@heritagebox.com"
};

// Package specifications
export const PACKAGE_DIMENSIONS = {
  length: 13,
  width: 11,
  height: 9,
  distance_unit: "in"
};

export const PACKAGE_WEIGHTS = {
  kit_outbound: 1,    // pounds
  kit_return: 5,      // pounds  
  final_return: 5     // pounds
};

/**
 * Make authenticated request to Shippo API
 */
async function shippoRequest(endpoint: string, method: string = 'GET', data?: any) {
  const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
  
  if (!SHIPPO_API_KEY) {
    throw new Error('SHIPPO_API_KEY environment variable is required');
  }

  const url = `https://api.goshippo.com${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  console.log(`📡 Shippo API ${method} ${endpoint}`);
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Shippo API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Shippo API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`✅ Shippo API response received`);
  return result;
}

/**
 * Create a Shippo address object
 */
export async function createShippoAddress(address: ShippoAddress) {
  console.log('📍 Creating Shippo address:', address.name);
  
  return await shippoRequest('/addresses/', 'POST', {
    name: address.name,
    street1: address.street1,
    street2: address.street2 || '',
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
    phone: address.phone || '',
    email: address.email || '',
    validate: true
  });
}

/**
 * Create a Shippo parcel object
 */
export async function createShippoParcel(weight: number) {
  console.log(`📦 Creating Shippo parcel: ${weight} lbs`);
  
  return await shippoRequest('/parcels/', 'POST', {
    length: PACKAGE_DIMENSIONS.length,
    width: PACKAGE_DIMENSIONS.width,
    height: PACKAGE_DIMENSIONS.height,
    distance_unit: PACKAGE_DIMENSIONS.distance_unit,
    weight: weight,
    mass_unit: 'lb'
  });
}

/**
 * Create a Shippo shipment and get rates
 */
export async function createShippoShipment(fromAddress: string, toAddress: string, parcel: string) {
  console.log('🚢 Creating Shippo shipment');
  
  return await shippoRequest('/shipments/', 'POST', {
    address_from: fromAddress,
    address_to: toAddress,
    parcels: [parcel],
    async: false
  });
}

/**
 * Select the best UPS rate from available rates
 */
export function selectBestUPSRate(rates: ShippoRate[]): ShippoRate {
  console.log(`🔍 Selecting best rate from ${rates.length} options`);
  
  // Filter for UPS rates first
  const upsRates = rates.filter(rate => 
    rate.provider.toLowerCase().includes('ups')
  );
  
  console.log(`📊 Found ${upsRates.length} UPS rates`);
  
  // If we have UPS rates, select the cheapest one
  if (upsRates.length > 0) {
    const cheapestUPS = upsRates.reduce((cheapest, current) => 
      parseFloat(current.amount) < parseFloat(cheapest.amount) ? current : cheapest
    );
    console.log(`✅ Selected UPS rate: ${cheapestUPS.servicelevel.name} - $${cheapestUPS.amount}`);
    return cheapestUPS;
  }
  
  // Fallback to cheapest available rate
  const cheapestRate = rates.reduce((cheapest, current) => 
    parseFloat(current.amount) < parseFloat(cheapest.amount) ? current : cheapest
  );
  
  console.log(`⚠️ No UPS rates found, selected: ${cheapestRate.provider} ${cheapestRate.servicelevel.name} - $${cheapestRate.amount}`);
  return cheapestRate;
}

/**
 * Purchase a shipping label
 */
export async function purchaseShippingLabel(rateId: string): Promise<ShippoTransaction> {
  console.log(`💳 Purchasing shipping label for rate: ${rateId}`);
  
  return await shippoRequest('/transactions/', 'POST', {
    rate: rateId,
    label_file_type: 'PDF',
    async: false
  });
}

/**
 * Convert customer address to Shippo format
 */
export function formatCustomerAddress(customerData: any): ShippoAddress {
  return {
    name: `${customerData.firstName} ${customerData.lastName}`,
    street1: customerData.address,
    city: customerData.city,
    state: customerData.state,
    zip: customerData.zipCode,
    country: 'US',
    phone: customerData.phone || '',
    email: customerData.email || ''
  };
}

/**
 * Generate a single shipping label
 */
export async function generateSingleShippingLabel(
  fromAddress: ShippoAddress,
  toAddress: ShippoAddress,
  weight: number,
  labelType: string
) {
  try {
    console.log(`\n🏷️ Generating ${labelType} label (${weight} lbs)`);
    console.log(`📍 From: ${fromAddress.name}, ${fromAddress.city}, ${fromAddress.state}`);
    console.log(`📍 To: ${toAddress.name}, ${toAddress.city}, ${toAddress.state}`);
    
    // Create addresses
    const fromAddressObj = await createShippoAddress(fromAddress);
    const toAddressObj = await createShippoAddress(toAddress);
    
    // Create parcel
    const parcel = await createShippoParcel(weight);
    
    // Create shipment and get rates
    const shipment = await createShippoShipment(
      fromAddressObj.object_id,
      toAddressObj.object_id,
      parcel.object_id
    );
    
    if (!shipment.rates || shipment.rates.length === 0) {
      throw new Error('No shipping rates available');
    }
    
    // Select best UPS rate
    const selectedRate = selectBestUPSRate(shipment.rates);
    
    // Purchase label
    const transaction = await purchaseShippingLabel(selectedRate.object_id);
    
    if (transaction.status !== 'SUCCESS') {
      throw new Error(`Label purchase failed: ${transaction.status}`);
    }
    
    console.log(`✅ ${labelType} label generated successfully`);
    console.log(`📋 Tracking: ${transaction.tracking_number}`);
    
    return {
      type: labelType,
      tracking: transaction.tracking_number,
      labelUrl: transaction.label_url,
      rateId: selectedRate.object_id,
      amount: selectedRate.amount,
      provider: selectedRate.provider,
      service: selectedRate.servicelevel.name,
      estimatedDays: selectedRate.estimated_days
    };
    
  } catch (error) {
    console.error(`❌ Failed to generate ${labelType} label:`, error);
    throw error;
  }
}

/**
 * Generate all 3 shipping labels for an order
 */
export async function generateAllShippingLabels(customerAddress: ShippoAddress, orderNumber: string) {
  console.log(`\n🚀 Generating all shipping labels for order: ${orderNumber}`);
  console.log('=====================================');
  
  try {
    const labels = [];
    
    // Label 1: HeritageBox → Customer (Kit Outbound - 1 lb)
    const label1 = await generateSingleShippingLabel(
      HERITAGEBOX_ADDRESS,
      customerAddress,
      PACKAGE_WEIGHTS.kit_outbound,
      'kit_outbound'
    );
    labels.push(label1);
    
    // Label 2: Customer → HeritageBox (Kit Return - 5 lbs)
    const label2 = await generateSingleShippingLabel(
      customerAddress,
      HERITAGEBOX_ADDRESS,
      PACKAGE_WEIGHTS.kit_return,
      'kit_return'
    );
    labels.push(label2);
    
    // Label 3: HeritageBox → Customer (Final Return - 5 lbs)
    const label3 = await generateSingleShippingLabel(
      HERITAGEBOX_ADDRESS,
      customerAddress,
      PACKAGE_WEIGHTS.final_return,
      'final_return'
    );
    labels.push(label3);
    
    console.log('\n🎉 All shipping labels generated successfully!');
    console.log(`📊 Total labels: ${labels.length}`);
    
    return {
      success: true,
      orderNumber,
      labels: {
        label1: {
          ...label1,
          description: "HeritageBox → Customer (1 lb)"
        },
        label2: {
          ...label2,
          description: "Customer → HeritageBox (5 lbs)"
        },
        label3: {
          ...label3,
          description: "HeritageBox → Customer (5 lbs)"
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to generate shipping labels:', error);
    throw error;
  }
}
