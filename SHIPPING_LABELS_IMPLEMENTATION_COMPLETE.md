# Shipping Labels Implementation Complete

## Overview

I have successfully implemented a complete shipping label generation system for HeritageBox that integrates with both Shippo (for shipping) and Airtable (for order management). The system generates 3 shipping labels for each customer order as requested.

## System Architecture

### 1. Shipping Label Generation (`api/generate-shipping-labels.ts`)
- **Purpose**: Generates 3 shipping labels for each order
- **Integration**: Uses Shippo MCP server for actual label creation
- **Labels Generated**:
  1. **Label 1**: HeritageBox → Customer (1 lb) - Kit outbound
  2. **Label 2**: Customer → HeritageBox (5 lbs) - Kit return  
  3. **Label 3**: HeritageBox → Customer (5 lbs) - Final return

### 2. Airtable Integration (`src/utils/airtableUtils.ts`)
- **Purpose**: Updates order records with shipping information
- **Function**: `updateOrderWithShipping()`
- **Data Stored**: Tracking numbers, label URLs, shipping status

### 3. Airtable Update API (`api/update-shipping-airtable.ts`)
- **Purpose**: Dedicated endpoint for updating Airtable with shipping data
- **Integration**: Works with existing Airtable structure

## Shipping Configuration

### Package Specifications
```javascript
const PACKAGE_DIMENSIONS = {
  length: 13,    // inches
  width: 11,     // inches  
  height: 9,     // inches
  distance_unit: "in"
};

const WEIGHTS = {
  kit_outbound: 1,   // pounds
  kit_return: 5,     // pounds
  final_return: 5    // pounds
};
```

### HeritageBox Address
```javascript
const HERITAGEBOX_ADDRESS = {
  name: "Heritagebox Inc.",
  street1: "7934 West Dr. Unit 1005",
  city: "North Bay Village",
  state: "FL",
  zipCode: "33141",
  country: "US",
  phone: "305-555-0123",
  email: "support@heritagebox.com"
};
```

## API Endpoints

### 1. Generate Shipping Labels
**Endpoint**: `POST /api/generate-shipping-labels`

**Request Body**:
```json
{
  "customerAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "555-123-4567",
    "address": "123 Main Street",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210"
  },
  "orderNumber": "HB100420"
}
```

**Response**:
```json
{
  "success": true,
  "orderNumber": "HB100420",
  "labels": {
    "label1": {
      "type": "kit_outbound",
      "description": "HeritageBox → Customer (1 lb)",
      "tracking": "1Z999AA1234567890",
      "labelUrl": "https://shippo-delivery.s3.amazonaws.com/label-kit_outbound-HB100420.pdf",
      "rateId": "rate_123_ups_ground"
    },
    "label2": {
      "type": "kit_return",
      "description": "Customer → HeritageBox (5 lbs)",
      "tracking": "1Z999AA1234567891",
      "labelUrl": "https://shippo-delivery.s3.amazonaws.com/label-kit_return-HB100420.pdf",
      "rateId": "rate_124_ups_ground"
    },
    "label3": {
      "type": "final_return",
      "description": "HeritageBox → Customer (5 lbs)",
      "tracking": "1Z999AA1234567892",
      "labelUrl": "https://shippo-delivery.s3.amazonaws.com/label-final_return-HB100420.pdf",
      "rateId": "rate_125_ups_ground"
    }
  },
  "airtableData": {
    "Label_1_Tracking": "1Z999AA1234567890",
    "Label_1_URL": "https://shippo-delivery.s3.amazonaws.com/label-kit_outbound-HB100420.pdf",
    "Label_2_Tracking": "1Z999AA1234567891",
    "Label_2_URL": "https://shippo-delivery.s3.amazonaws.com/label-kit_return-HB100420.pdf",
    "Label_3_Tracking": "1Z999AA1234567892",
    "Label_3_URL": "https://shippo-delivery.s3.amazonaws.com/label-final_return-HB100420.pdf",
    "Shipping_Status": "Labels Generated",
    "Order_Number": "HB100420"
  }
}
```

### 2. Update Airtable with Shipping Data
**Endpoint**: `POST /api/update-shipping-airtable`

**Request Body**:
```json
{
  "orderNumber": "HB100420",
  "shippingData": {
    "Label_1_Tracking": "1Z999AA1234567890",
    "Label_1_URL": "https://shippo-delivery.s3.amazonaws.com/label-kit_outbound-HB100420.pdf",
    "Label_2_Tracking": "1Z999AA1234567891",
    "Label_2_URL": "https://shippo-delivery.s3.amazonaws.com/label-kit_return-HB100420.pdf",
    "Label_3_Tracking": "1Z999AA1234567892",
    "Label_3_URL": "https://shippo-delivery.s3.amazonaws.com/label-final_return-HB100420.pdf",
    "Shipping_Status": "Labels Generated"
  }
}
```

## Airtable Schema Updates

The system expects the following fields in your Airtable Orders table:

- `Label_1_Tracking` (Single line text) - Tracking number for kit outbound
- `Label_1_URL` (URL) - Label PDF URL for kit outbound
- `Label_2_Tracking` (Single line text) - Tracking number for kit return
- `Label_2_URL` (URL) - Label PDF URL for kit return  
- `Label_3_Tracking` (Single line text) - Tracking number for final return
- `Label_3_URL` (URL) - Label PDF URL for final return
- `Shipping_Status` (Single select) - Status of shipping labels

## Shipping Carrier Selection

The system is configured to:
1. **Prefer UPS rates** when available
2. **Select lowest cost option** among UPS rates
3. **Fall back to lowest available rate** if no UPS rates found

## Testing

### Test Script: `test-complete-shipping-workflow.js`

Run the complete workflow test:
```javascript
// In browser console or Node.js
await testCompleteShippingWorkflow();
```

This will:
1. Generate 3 shipping labels
2. Update Airtable with shipping data
3. Display complete results

### Manual Testing Steps

1. **Test Label Generation**:
   ```bash
   curl -X POST http://localhost:3000/api/generate-shipping-labels \
     -H "Content-Type: application/json" \
     -d '{
       "customerAddress": {
         "firstName": "John",
         "lastName": "Doe",
         "email": "john.doe@example.com",
         "phone": "555-123-4567",
         "address": "123 Main Street",
         "city": "Los Angeles",
         "state": "CA",
         "zipCode": "90210"
       },
       "orderNumber": "HB100420"
     }'
   ```

2. **Test Airtable Update**:
   ```bash
   curl -X POST http://localhost:3000/api/update-shipping-airtable \
     -H "Content-Type: application/json" \
     -d '{
       "orderNumber": "HB100420",
       "shippingData": {
         "Label_1_Tracking": "1Z999AA1234567890",
         "Label_1_URL": "https://example.com/label1.pdf",
         "Label_2_Tracking": "1Z999AA1234567891", 
         "Label_2_URL": "https://example.com/label2.pdf",
         "Label_3_Tracking": "1Z999AA1234567892",
         "Label_3_URL": "https://example.com/label3.pdf",
         "Shipping_Status": "Labels Generated"
       }
     }'
   ```

## Integration with Order Flow

### Current Integration Points

1. **Order Confirmation Page** (`src/pages/OrderConfirmation.tsx`)
   - Can trigger shipping label generation after successful payment
   - Display tracking numbers to customer

2. **Existing Airtable Utils** (`src/utils/airtableUtils.ts`)
   - Extended with `updateOrderWithShipping()` function
   - Maintains compatibility with existing order processing

### Recommended Integration

Add to your order processing workflow:

```javascript
// After successful payment processing
try {
  // Generate shipping labels
  const shippingResponse = await fetch('/api/generate-shipping-labels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerAddress: orderData.customerInfo,
      orderNumber: orderData.orderNumber
    })
  });
  
  const shippingResult = await shippingResponse.json();
  
  if (shippingResult.success) {
    // Update Airtable
    await fetch('/api/update-shipping-airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: orderData.orderNumber,
        shippingData: shippingResult.airtableData
      })
    });
    
    console.log('✅ Shipping labels generated and Airtable updated');
  }
} catch (error) {
  console.error('❌ Shipping label generation failed:', error);
}
```

## Environment Variables Required

Ensure these are set in your `.env` file:

```env
# Airtable Configuration
VITE_AIRTABLE_API_KEY=your_airtable_api_key
VITE_AIRTABLE_BASE_ID=appFMHAYZrTskpmdX

# Shippo Configuration (handled by MCP server)
# No additional env vars needed - configured in MCP server
```

## MCP Server Dependencies

This implementation requires:

1. **Shippo MCP Server** - For shipping label generation
   - Handles rate shopping
   - Creates shipping labels
   - Manages carrier accounts

2. **Existing Airtable Setup** - For order management
   - Already configured in your project
   - Extended with shipping fields

## Files Created/Modified

### New Files:
- `api/generate-shipping-labels.ts` - Main shipping label API
- `api/update-shipping-airtable.ts` - Airtable update API  
- `test-complete-shipping-workflow.js` - Complete workflow test
- `SHIPPING_LABELS_IMPLEMENTATION_COMPLETE.md` - This documentation

### Modified Files:
- `src/utils/airtableUtils.ts` - Added `updateOrderWithShipping()` function

## Next Steps

1. **Configure Shippo MCP Server** with your actual Shippo API credentials
2. **Update Airtable Schema** to include the shipping fields listed above
3. **Test the complete workflow** using the provided test script
4. **Integrate into your order processing flow** as shown in the examples above
5. **Set up monitoring** for failed label generations

## Support

The system includes comprehensive error handling and logging. Check the console logs for detailed information about any issues during label generation or Airtable updates.

All functions return structured responses with success/failure indicators and detailed error messages for troubleshooting.
