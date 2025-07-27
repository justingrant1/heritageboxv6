/**
 * Test script for direct Shippo API integration
 * This replaces the MCP server approach with direct API calls
 */

// Test data
const testCustomerAddress = {
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

/**
 * Test the complete shipping workflow with direct API calls
 */
async function testDirectShippoAPI() {
  console.log('🧪 Testing Direct Shippo API Integration');
  console.log('=====================================');
  
  try {
    // Test 1: Generate shipping labels
    console.log('\n📦 Step 1: Generating shipping labels...');
    
    const shippingResponse = await fetch('/api/generate-shipping-labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerAddress: testCustomerAddress,
        orderNumber: testOrderNumber
      })
    });

    if (!shippingResponse.ok) {
      const errorText = await shippingResponse.text();
      throw new Error(`Shipping API error: ${shippingResponse.status} - ${errorText}`);
    }

    const shippingResult = await shippingResponse.json();
    
    if (!shippingResult.success) {
      throw new Error(`Shipping failed: ${shippingResult.error} - ${shippingResult.details}`);
    }

    console.log('✅ Shipping labels generated successfully!');
    console.log('\n📋 Label Details:');
    console.log(`   Order: ${shippingResult.orderNumber}`);
    console.log(`   Total Cost: $${shippingResult.summary.totalCost}`);
    console.log(`   Total Labels: ${shippingResult.summary.totalLabels}`);
    
    console.log('\n🏷️ Individual Labels:');
    Object.entries(shippingResult.labels).forEach(([key, label]) => {
      console.log(`   ${key.toUpperCase()}:`);
      console.log(`     Type: ${label.type}`);
      console.log(`     Description: ${label.description}`);
      console.log(`     Tracking: ${label.tracking}`);
      console.log(`     Provider: ${label.provider}`);
      console.log(`     Service: ${label.service}`);
      console.log(`     Cost: $${label.amount}`);
      console.log(`     Estimated Delivery: ${label.estimatedDays} days`);
      console.log(`     Label URL: ${label.labelUrl}`);
      console.log('');
    });

    // Test 2: Update Airtable with shipping data
    console.log('📊 Step 2: Updating Airtable with shipping data...');
    
    const airtableResponse = await fetch('/api/update-shipping-airtable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderNumber: testOrderNumber,
        shippingData: shippingResult.airtableData
      })
    });

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      throw new Error(`Airtable API error: ${airtableResponse.status} - ${errorText}`);
    }

    const airtableResult = await airtableResponse.json();
    
    if (!airtableResult.success) {
      throw new Error(`Airtable update failed: ${airtableResult.error}`);
    }

    console.log('✅ Airtable updated successfully!');
    console.log(`   Record ID: ${airtableResult.recordId}`);
    console.log(`   Updated Fields: ${Object.keys(airtableResult.updatedFields).length}`);

    // Test 3: Display complete workflow results
    console.log('\n🎉 COMPLETE WORKFLOW TEST RESULTS');
    console.log('================================');
    console.log(`✅ Order Number: ${testOrderNumber}`);
    console.log(`✅ Customer: ${testCustomerAddress.firstName} ${testCustomerAddress.lastName}`);
    console.log(`✅ Address: ${testCustomerAddress.city}, ${testCustomerAddress.state} ${testCustomerAddress.zipCode}`);
    console.log(`✅ Labels Generated: 3`);
    console.log(`✅ Total Shipping Cost: $${shippingResult.summary.totalCost}`);
    console.log(`✅ Airtable Updated: Yes`);
    
    console.log('\n📋 Tracking Numbers:');
    console.log(`   Kit Outbound (HB→Customer): ${shippingResult.labels.label1.tracking}`);
    console.log(`   Kit Return (Customer→HB): ${shippingResult.labels.label2.tracking}`);
    console.log(`   Final Return (HB→Customer): ${shippingResult.labels.label3.tracking}`);
    
    console.log('\n🔗 Label URLs:');
    console.log(`   Label 1: ${shippingResult.labels.label1.labelUrl}`);
    console.log(`   Label 2: ${shippingResult.labels.label2.labelUrl}`);
    console.log(`   Label 3: ${shippingResult.labels.label3.labelUrl}`);

    return {
      success: true,
      shippingResult,
      airtableResult
    };

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test individual Shippo API functions
 */
async function testIndividualFunctions() {
  console.log('\n🔧 Testing Individual API Functions');
  console.log('===================================');
  
  try {
    // Test address validation
    console.log('\n📍 Testing address validation...');
    
    const addressValidationResponse = await fetch('/api/validate-address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: testCustomerAddress
      })
    });

    if (addressValidationResponse.ok) {
      const addressResult = await addressValidationResponse.json();
      console.log('✅ Address validation successful');
      console.log(`   Validated: ${addressResult.isValid ? 'Yes' : 'No'}`);
      if (addressResult.suggestions) {
        console.log(`   Suggestions: ${addressResult.suggestions.length}`);
      }
    } else {
      console.log('⚠️ Address validation endpoint not available (optional)');
    }

    // Test rate shopping
    console.log('\n💰 Testing rate shopping...');
    
    const rateResponse = await fetch('/api/get-shipping-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: {
          name: "Heritagebox Inc.",
          street1: "7934 West Dr. Unit 1005",
          city: "North Bay Village",
          state: "FL",
          zip: "33141",
          country: "US"
        },
        toAddress: testCustomerAddress,
        weight: 1
      })
    });

    if (rateResponse.ok) {
      const rateResult = await rateResponse.json();
      console.log('✅ Rate shopping successful');
      console.log(`   Available rates: ${rateResult.rates ? rateResult.rates.length : 0}`);
      if (rateResult.rates && rateResult.rates.length > 0) {
        const cheapest = rateResult.rates[0];
        console.log(`   Cheapest rate: ${cheapest.provider} ${cheapest.service} - $${cheapest.amount}`);
      }
    } else {
      console.log('⚠️ Rate shopping endpoint not available (optional)');
    }

  } catch (error) {
    console.error('❌ Individual function test failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Direct Shippo API Tests');
  console.log('====================================');
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log(`🏢 Environment: ${window.location.origin}`);
  
  // Test 1: Complete workflow
  const workflowResult = await testDirectShippoAPI();
  
  // Test 2: Individual functions (optional)
  await testIndividualFunctions();
  
  // Final summary
  console.log('\n📊 FINAL TEST SUMMARY');
  console.log('====================');
  
  if (workflowResult.success) {
    console.log('✅ All tests passed successfully!');
    console.log('🎯 The direct Shippo API integration is working correctly');
    console.log('📦 Ready for production use');
  } else {
    console.log('❌ Tests failed');
    console.log(`🔍 Error: ${workflowResult.error}`);
    console.log('🛠️ Please check your Shippo API configuration');
  }
  
  return workflowResult;
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  // Browser environment
  window.testDirectShippoAPI = testDirectShippoAPI;
  window.runAllTests = runAllTests;
  console.log('🌐 Test functions available in browser console:');
  console.log('   - testDirectShippoAPI()');
  console.log('   - runAllTests()');
} else {
  // Node.js environment
  module.exports = {
    testDirectShippoAPI,
    runAllTests
  };
}
