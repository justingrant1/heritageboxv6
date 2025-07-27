// Complete test script for shipping label generation and Airtable integration
const testCustomerData = {
  firstName: "John",
  lastName: "Doe", 
  email: "john.doe@example.com",
  phone: "555-123-4567",
  address: "123 Main Street",
  city: "Los Angeles",
  state: "CA",
  zipCode: "90210"
};

const testOrderNumber = "HB100420";

async function testCompleteShippingWorkflow() {
  console.log('🚀 TESTING COMPLETE SHIPPING WORKFLOW');
  console.log('=====================================');
  
  try {
    // Step 1: Generate shipping labels
    console.log('\n📦 STEP 1: Generating shipping labels...');
    console.log('Order:', testOrderNumber);
    console.log('Customer:', testCustomerData);
    
    const shippingResponse = await fetch('/api/generate-shipping-labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerAddress: testCustomerData,
        orderNumber: testOrderNumber
      })
    });
    
    if (!shippingResponse.ok) {
      throw new Error(`Shipping API failed: ${shippingResponse.statusText}`);
    }
    
    const shippingResult = await shippingResponse.json();
    console.log('✅ Shipping labels generated successfully!');
    
    // Display the 3 labels
    console.log('\n📋 GENERATED LABELS:');
    console.log('Label 1 (Kit Outbound):', shippingResult.labels.label1);
    console.log('Label 2 (Kit Return):', shippingResult.labels.label2);
    console.log('Label 3 (Final Return):', shippingResult.labels.label3);
    
    // Step 2: Update Airtable with shipping data
    console.log('\n📊 STEP 2: Updating Airtable with shipping data...');
    
    const airtableResponse = await fetch('/api/update-shipping-airtable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        shippingData: shippingResult.airtableData
      })
    });
    
    if (!airtableResponse.ok) {
      throw new Error(`Airtable API failed: ${airtableResponse.statusText}`);
    }
    
    const airtableResult = await airtableResponse.json();
    console.log('✅ Airtable updated successfully!');
    console.log('Result:', airtableResult);
    
    // Step 3: Summary
    console.log('\n🎉 WORKFLOW COMPLETE!');
    console.log('Summary:');
    console.log('- 3 shipping labels generated');
    console.log('- Tracking numbers assigned');
    console.log('- Airtable updated with shipping data');
    console.log('- Order ready for fulfillment');
    
    return {
      success: true,
      labels: shippingResult.labels,
      airtableUpdate: airtableResult
    };
    
  } catch (error) {
    console.error('❌ Workflow failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCompleteShippingWorkflow };
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
  // Browser environment - add to window for manual testing
  window.testCompleteShippingWorkflow = testCompleteShippingWorkflow;
  console.log('📋 Test function available as: window.testCompleteShippingWorkflow()');
}
