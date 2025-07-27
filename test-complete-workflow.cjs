const fetch = require('node-fetch');

// Test the complete shipping workflow
async function testCompleteWorkflow() {
    console.log('🚀 Testing Complete Shipping Workflow...\n');

    // Mock order data
    const orderDetails = {
        customerInfo: {
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
        orderDetails: {
            package: 'Premium',
            packagePrice: '$199.99',
            packageFeatures: 'Up to 500 photos, 10 videos, cloud storage',
            digitizingSpeed: 'Standard (2-3 weeks)',
            digitizingPrice: '$0.00',
            digitizingTime: '2-3 weeks processing time',
            addOns: ['1 USB Drive(s) - $24.95'],
            couponCode: 'None'
        }
    };

    const paymentInfo = {
        paymentId: 'test_payment_' + Date.now(),
        paymentStatus: 'succeeded',
        actualAmount: 224.94 // $199.99 + $24.95
    };

    try {
        console.log('📦 Step 1: Creating order with shipping labels...');
        
        const response = await fetch('http://localhost:3000/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderDetails,
                ...paymentInfo
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Order created successfully!');
        console.log('📋 Order Details:', {
            customerId: result.customerId,
            orderId: result.orderId,
            paymentId: result.paymentId
        });

        if (result.shipping) {
            if (result.shipping.labelsGenerated) {
                console.log('🏷️ Shipping Labels Generated:');
                console.log('   Label 1 (HBox → Customer):', result.shipping.trackingNumbers.label1);
                console.log('   Label 2 (Customer → HBox):', result.shipping.trackingNumbers.label2);
                console.log('   Label 3 (HBox → Customer):', result.shipping.trackingNumbers.label3);
                
                console.log('🔗 Label URLs:');
                console.log('   Label 1 URL:', result.shipping.labelUrls.label1);
                console.log('   Label 2 URL:', result.shipping.labelUrls.label2);
                console.log('   Label 3 URL:', result.shipping.labelUrls.label3);
            } else {
                console.log('⚠️ Shipping labels not generated:', result.shipping.error);
            }
        }

        console.log('\n🎉 Complete workflow test completed successfully!');
        return result;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testCompleteWorkflow()
        .then(() => {
            console.log('\n✅ All tests passed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test suite failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testCompleteWorkflow };
