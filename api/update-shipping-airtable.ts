import { updateOrderWithShipping } from '../src/utils/airtableUtils';

interface AirtableShippingRequest {
  orderNumber: string;
  shippingData: {
    Label_1_Tracking: string;
    Label_1_URL: string;
    Label_2_Tracking: string;
    Label_2_URL: string;
    Label_3_Tracking: string;
    Label_3_URL: string;
    Shipping_Status: string;
  };
}

/**
 * API endpoint to update Airtable with shipping information
 */
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📊 Starting Airtable shipping update');
    
    const { orderNumber, shippingData }: AirtableShippingRequest = req.body;
    
    if (!orderNumber || !shippingData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('📦 Updating order in Airtable:', orderNumber);
    console.log('📋 Shipping data:', shippingData);
    
    // Update the order in Airtable
    const success = await updateOrderWithShipping(orderNumber, shippingData);
    
    if (success) {
      console.log('✅ Successfully updated Airtable with shipping data');
      return res.status(200).json({
        success: true,
        message: 'Order updated with shipping information',
        orderNumber: orderNumber
      });
    } else {
      console.error('❌ Failed to update Airtable');
      return res.status(500).json({
        success: false,
        error: 'Failed to update Airtable with shipping information'
      });
    }
    
  } catch (error) {
    console.error('❌ Airtable update failed:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to update Airtable',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
