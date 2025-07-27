// Test script for shipping label generation
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

async function testShippingLabels() {
  try {
    console.log('🧪 Testing shipping label generation...');
    console.log('📦 Order:', testOrderNumber);
    console.log('👤 Customer:', testCustomerData);
    
    // This would call the API endpoint
    const response = await fetch('/api/generate-shipping-labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerAddress: testCustomerData,
        orderNumber: testOrderNumber
      })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ SUCCESS - Shipping labels generated:');
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    // Display the 3 labels
    console.log('\n📦 LABEL SUMMARY:');
    console.log('1. Kit Outbound (HeritageBox → Customer, 1 lb):');
    console.log(`   Tracking: ${result.labels.label1.tracking}`);
    console.log(`   Label URL: ${result.labels.label1.labelUrl}`);
    
    console.log('\n2. Kit Return (Customer → HeritageBox, 5 lbs):');
    console.log(`   Tracking: ${result.labels.label2.tracking}`);
    console.log(`   Label URL: ${result.labels.label2.labelUrl}`);
    
    console.log('\n3. Final Return (HeritageBox → Customer, 5 lbs):');
    console.log(`   Tracking: ${result.labels.label3.tracking}`);
    console.log(`   Label URL: ${result.labels.label3.labelUrl}`);
    
    console.log('\n📊 AIRTABLE DATA:');
    console.log(JSON.stringify(result.airtableData, null, 2));
    
    return result;
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    return null;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testShippingLabels, testCustomerData, testOrderNumber };
}

// Run test if called directly
if (typeof window === 'undefined') {
  testShippingLabels();
}
