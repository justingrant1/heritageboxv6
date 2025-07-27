# Shipping Labels Direct API Implementation Complete

## Overview

I have successfully implemented a complete shipping label generation system for HeritageBox using **direct Shippo API calls** instead of MCP servers. This corrected implementation follows proper production architecture patterns where the application communicates directly with external APIs.

## ✅ Architecture Correction

### ❌ Previous (Incorrect) Architecture:
```
HeritageBox Frontend → HeritageBox API → Shippo MCP Server → Shippo API
```

### ✅ Current (Correct) Architecture:
```
HeritageBox Frontend → HeritageBox API → Shippo API (direct)
```

## System Architecture

### 1. Direct Shippo API Integration (`src/utils/shippingUtils.ts`)
- **Purpose**: Direct communication with Shippo REST API
- **Authentication**: Uses `SHIPPO_API_KEY` environment variable
- **Functions**:
  - `shippoRequest()` - Authenticated API requests
  - `createShippoAddress()` - Address creation and validation
  - `createShippoParcel()` - Package specification
  - `createShippoShipment()` - Shipment creation and rate shopping
  - `selectBestUPSRate()` - UPS rate selection logic
  - `purchaseShippingLabel()` - Label purchase
  - `generateAllShippingLabels()` - Complete workflow

### 2. Main API Endpoint (`api/generate-shipping-labels.ts`)
- **Purpose**: Generates 3 shipping labels per order
- **Integration**: Uses direct Shippo API utilities
- **Labels Generated**:
  1. **Label 1**: HeritageBox → Customer (1 lb) - Kit outbound
  2. **Label 2**: Customer → HeritageBox (5 lbs) - Kit return  
  3. **Label 3**: HeritageBox → Customer (5 lbs) - Final return

### 3. Airtable Integration (`api/update-shipping-airtable.ts`)
- **Purpose**: Updates order records with shipping information
- **Data Stored**: Tracking numbers, label URLs, shipping status

## Shipping Configuration

### Package Specifications
```javascript
const PACKAGE_DIMENSIONS = {
  length: 13,    // inches
  width: 11,     // inches  
  height: 9,     // inches
  distance_unit: "in"
};

const PACKAGE_WEIGHTS = {
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
  zip: "33141",
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
      "labelUrl": "https://shippo-delivery.s3.amazonaws.com/label.pdf",
      "rateId": "rate_123_ups_ground",
      "amount": "8.50",
      "provider": "UPS",
      "service": "Ground",
      "estimatedDays": 3
    },
    "label2": {
      "type": "kit_return",
      "description": "Customer → HeritageBox (5 lbs)",
      "tracking": "1Z999AA1234567891",
      "labelUrl": "https://shippo-delivery.s3.amazonaws.com/label2.pdf",
      "rateId": "rate_124_ups_ground",
      "amount": "12.75",
      "provider": "UPS",
      "service": "Ground",
      "estimatedDays": 3
    },
    "label3": {
      "type": "final_return",
      "description": "HeritageBox → Customer (5 lbs)",
      "tracking": "1Z999AA1234567892",
      "labelUrl": "https://shippo-delivery.s3.amazonaws.com/label3.pdf",
      "rateId": "rate_125_ups_ground",
      "amount": "12.75",
      "provider": "UPS",
      "service": "Ground",
      "estimatedDays": 3
    }
  },
  "airtableData": {
    "Label_1_Tracking": "1Z999AA1234567890",
    "Label_1_URL": "https://shippo-delivery.s3.amazonaws.com/label.pdf",
    "Label_2_Tracking": "1Z999AA1234567891",
    "Label_2_URL": "https://shippo-delivery.s3.amazonaws.com/label2.pdf",
    "Label_3_Tracking": "1Z999AA1234567892",
    "Label_3_URL": "https://shippo-delivery.s3.amazonaws.com/label3.pdf",
    "Shipping_Status": "Labels Generated",
    "Order_Number": "HB100420"
  },
  "summary": {
    "totalLabels": 3,
    "totalCost": "34.00",
    "estimatedDelivery": {
      "label1": "3 days",
      "label2": "3 days",
      "label3": "3 days"
    }
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
    "Label_1_URL": "https://shippo-delivery.s3.amazonaws.com/label.pdf",
    "Label_2_Tracking": "1Z999AA1234567891",
    "Label_2_URL": "https://shippo-delivery.s3.amazonaws.com/label2.pdf",
    "Label_3_Tracking": "1Z999AA1234567892",
    "Label_3_URL": "https://shippo-delivery.s3.amazonaws.com/label3.pdf",
    "Shipping_Status": "Labels Generated"
  }
}
```

## Environment Variables Required

Add to your `.env` file:

```env
# Shippo Configuration
SHIPPO_API_KEY=your_shippo_api_key_here

# Airtable Configuration (existing)
VITE_AIRTABLE_API_KEY=your_airtable_api_key
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_AIRTABLE_TABLE_NAME=Orders
```

## Shippo API Key Setup

1. **Sign up for Shippo**: https://goshippo.com/
2. **Get API Key**: 
   - Go to Settings → API
   - Copy your Live or Test API key
   - Add to `.env` as `SHIPPO_API_KEY=shippo_live_...` or `SHIPPO_API_KEY=shippo_test_...`

## Carrier Selection Logic

The system is configured to:
1. **Prefer UPS rates** when available
2. **Select lowest cost option** among UPS rates
3. **Fall back to lowest available rate** if no UPS rates found

```javascript
export function selectBestUPSRate(rates) {
  // Filter for UPS rates first
  const upsRates = rates.filter(rate => 
    rate.provider.toLowerCase().includes('ups')
  );
  
  // If we have UPS rates, select the cheapest one
  if (upsRates.length > 0) {
    return upsRates.reduce((cheapest, current) => 
      parseFloat(current.amount) < parseFloat(cheapest.amount) ? current : cheapest
    );
  }
  
  // Fallback to cheapest available rate
  return rates.reduce((cheapest, current) => 
    parseFloat(current.amount) < parseFloat(cheapest.amount) ? current : cheapest
  );
}
```

## Testing

### Test Script: `test-direct-shippo-api.js`

Run the complete workflow test:
```javascript
// In browser console
await runAllTests();
```

This will:
1. Generate 3 shipping labels using direct Shippo API
2. Update Airtable with shipping data
3. Display complete results with tracking numbers and costs

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

### Recommended Integration

Add to your order processing workflow:

```javascript
// After successful payment processing
try {
  // Generate shipping labels using direct API
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
    console.log(`💰 Total shipping cost: $${shippingResult.summary.totalCost}`);
  }
} catch (error) {
  console.error('❌ Shipping label generation failed:', error);
}
```

## Error Handling

The system includes comprehensive error handling:

- **API Authentication**: Validates Shippo API key
- **Address Validation**: Ensures deliverable addresses
- **Rate Availability**: Handles cases with no available rates
- **Label Purchase**: Validates successful label creation
- **Airtable Updates**: Handles record update failures

## Files Created/Modified

### New Files:
- `src/utils/shippingUtils.ts` - Direct Shippo API utilities (rewritten)
- `api/generate-shipping-labels.ts` - Main shipping API (rewritten)
- `test-direct-shippo-api.js` - Direct API test script
- `SHIPPING_LABELS_DIRECT_API_IMPLEMENTATION_COMPLETE.md` - This documentation

### Modified Files:
- `.env.example` - Added `SHIPPO_API_KEY` configuration
- `api/update-shipping-airtable.ts` - Unchanged (still works with new system)
- `src/utils/airtableUtils.ts` - Unchanged (still works with new system)

### Deprecated Files:
- `test-complete-shipping-workflow.js` - Replaced by `test-direct-shippo-api.js`
- `test-shipping-labels.js` - Replaced by direct API tests

## Key Differences from MCP Implementation

| Aspect | MCP Implementation (❌ Wrong) | Direct API Implementation (✅ Correct) |
|--------|------------------------------|---------------------------------------|
| **Architecture** | App → MCP Server → Shippo API | App → Shippo API (direct) |
| **Dependencies** | Requires MCP server running | No external dependencies |
| **Authentication** | MCP server handles auth | App handles auth directly |
| **Error Handling** | Limited MCP error info | Full Shippo API error details |
| **Performance** | Extra network hop | Direct communication |
| **Production Ready** | No (MCP is for development) | Yes (standard API integration) |
| **Scalability** | Limited by MCP server | Scales with Shippo API limits |

## Next Steps

1. **Add your Shippo API key** to `.env` file
2. **Test the complete workflow** using `test-direct-shippo-api.js`
3. **Update Airtable schema** with shipping fields (if not already done)
4. **Integrate into your order processing flow** as shown in examples above
5. **Set up monitoring** for failed label generations

## Support

The system includes comprehensive logging and error handling. Check the console logs for detailed information about any issues during label generation or Airtable updates.

All functions return structured responses with success/failure indicators and detailed error messages for troubleshooting.

## MCP Server Usage (Development Only)

MCP servers should only be used by Cline (the AI assistant) for:
- **Development setup** and configuration
- **Testing API endpoints** during development
- **Prototyping** shipping workflows
- **Understanding** Shippo API capabilities

They should **never** be part of your production application architecture.
