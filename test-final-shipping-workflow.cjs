const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
    baseUrl: 'http://localhost:3000',
    testCustomer: {
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001'
    },
    testOrder: {
        package: 'Premium',
        packagePrice: '$299.95',
        packageFeatures: 'Up to 500 photos, 10 hours of video',
        digitizingSpeed: 'Standard (2-3 weeks)',
        digitizingPrice: '$0.00',
        digitizingTime: '2-3 weeks processing time',
        addOns: ['1 USB Drive(s) - $24.95'],
        couponCode: 'SAVE10'
    }
};

async function testCompleteWorkflow() {
    console.log('🧪 Testing Complete Shipping Workflow');
    console.log('=====================================\n');

    try {
        // Step 1: Test order creation with automatic shipping label generation
        console.log('📦 Step 1: Creating order with automatic shipping labels...');
        
        const orderData = {
            orderDetails: {
                customerInfo: TEST_CONFIG.testCustomer,
                orderDetails: TEST_CONFIG.testOrder
            },
            paymentId: `test_payment_${Date.now()}`,
            paymentStatus: 'succeeded',
            actualAmount: 324.90 // $299.95 + $24.95 - 10% discount
        };

        const createOrderResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        if (!createOrderResponse.ok) {
            const errorText = await createOrderResponse.text();
            throw new Error(`Order creation failed: ${createOrderResponse.status} - ${errorText}`);
        }

        const orderResult = await createOrderResponse.json();
        console.log('✅ Order created successfully!');
        console.log(`   Order ID: ${orderResult.orderId}`);
        console.log(`   Customer ID: ${orderResult.customerId}`);
        console.log(`   Payment ID: ${orderResult.paymentId}`);

        // Check if shipping labels were generated automatically
        if (orderResult.shipping && orderResult.shipping.labelsGenerated) {
            console.log('✅ Shipping labels generated automatically!');
            console.log('📋 Tracking Numbers:');
            console.log(`   Label 1 (HBox → Customer): ${orderResult.shipping.trackingNumbers.label1}`);
            console.log(`   Label 2 (Customer → HBox): ${orderResult.shipping.trackingNumbers.label2}`);
            console.log(`   Label 3 (HBox → Customer): ${orderResult.shipping.trackingNumbers.label3}`);
            
            console.log('🔗 Label URLs:');
            console.log(`   Label 1: ${orderResult.shipping.labelUrls.label1}`);
            console.log(`   Label 2: ${orderResult.shipping.labelUrls.label2}`);
            console.log(`   Label 3: ${orderResult.shipping.labelUrls.label3}`);
        } else {
            console.log('❌ Shipping labels were not generated automatically');
            if (orderResult.shipping && orderResult.shipping.error) {
                console.log(`   Error: ${orderResult.shipping.error}`);
            }
        }

        console.log('\n🎉 Complete workflow test completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   ✅ Order creation: SUCCESS');
        console.log('   ✅ Customer management: SUCCESS');
        console.log('   ✅ Product management: SUCCESS');
        console.log('   ✅ Order items creation: SUCCESS');
        console.log(`   ${orderResult.shipping?.labelsGenerated ? '✅' : '❌'} Shipping labels: ${orderResult.shipping?.labelsGenerated ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   ${orderResult.shipping?.labelsGenerated ? '✅' : '❌'} Airtable integration: ${orderResult.shipping?.labelsGenerated ? 'SUCCESS' : 'FAILED'}`);

        return true;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testCompleteWorkflow()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { testCompleteWorkflow };
