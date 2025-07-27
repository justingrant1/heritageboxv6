import { generateAllShippingLabels, formatCustomerAddress } from '../src/utils/shippingUtils';

interface CustomerAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface ShippingLabelRequest {
  customerAddress: CustomerAddress;
  orderNumber: string;
}

/**
 * API endpoint to generate 3 shipping labels using direct Shippo API
 * 
 * This endpoint:
 * 1. Generates Label 1: HeritageBox → Customer (1 lb) - Kit outbound
 * 2. Generates Label 2: Customer → HeritageBox (5 lbs) - Kit return
 * 3. Generates Label 3: HeritageBox → Customer (5 lbs) - Final return
 * 
 * All labels use the lowest available UPS rate
 */
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting shipping label generation');
    
    const { customerAddress, orderNumber }: ShippingLabelRequest = req.body;
    
    // Validate required fields
    if (!customerAddress || !orderNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerAddress and orderNumber are required' 
      });
    }

    // Validate customer address fields
    const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode'];
    for (const field of requiredFields) {
      if (!customerAddress[field as keyof CustomerAddress]) {
        return res.status(400).json({ 
          error: `Missing required customer address field: ${field}` 
        });
      }
    }

    console.log('📦 Order:', orderNumber);
    console.log('👤 Customer:', `${customerAddress.firstName} ${customerAddress.lastName}`);
    console.log('📍 Address:', `${customerAddress.city}, ${customerAddress.state} ${customerAddress.zipCode}`);

    // Format customer address for Shippo
    const shippoCustomerAddress = formatCustomerAddress(customerAddress);

    // Generate all 3 shipping labels
    const result = await generateAllShippingLabels(shippoCustomerAddress, orderNumber);

    // Format response for Airtable integration
    const airtableData = {
      Label_1_Tracking: result.labels.label1.tracking,
      Label_1_URL: result.labels.label1.labelUrl,
      Label_2_Tracking: result.labels.label2.tracking,
      Label_2_URL: result.labels.label2.labelUrl,
      Label_3_Tracking: result.labels.label3.tracking,
      Label_3_URL: result.labels.label3.labelUrl,
      Shipping_Status: 'Labels Generated',
      Order_Number: orderNumber
    };

    console.log('✅ All shipping labels generated successfully');
    console.log('📊 Summary:');
    console.log(`   Label 1: ${result.labels.label1.tracking} (${result.labels.label1.service})`);
    console.log(`   Label 2: ${result.labels.label2.tracking} (${result.labels.label2.service})`);
    console.log(`   Label 3: ${result.labels.label3.tracking} (${result.labels.label3.service})`);

    return res.status(200).json({
      success: true,
      orderNumber: orderNumber,
      labels: result.labels,
      airtableData: airtableData,
      summary: {
        totalLabels: 3,
        totalCost: (
          parseFloat(result.labels.label1.amount) +
          parseFloat(result.labels.label2.amount) +
          parseFloat(result.labels.label3.amount)
        ).toFixed(2),
        estimatedDelivery: {
          label1: `${result.labels.label1.estimatedDays} days`,
          label2: `${result.labels.label2.estimatedDays} days`,
          label3: `${result.labels.label3.estimatedDays} days`
        }
      }
    });

  } catch (error) {
    console.error('❌ Shipping label generation failed:', error);
    
    // Return detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate shipping labels',
      details: errorMessage,
      orderNumber: req.body?.orderNumber || 'unknown'
    });
  }
}
