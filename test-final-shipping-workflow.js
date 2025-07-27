const fetch = require('node-fetch');

async function testCompleteShippingWorkflow() {
    console.log('🚀 Testing Complete Shipping Workflow...\n');

    // Test data
    const testOrder = {
        orderId: 'TEST-' + Date.now(),
        customerName: 'John Doe',
        customerEmail: 'john.doe@example.com',
        customerAddress: {
            name: 'John Doe',
            street1: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'US'
        },
        heritageBoxAddress: {
            name: 'Heritage Box',
            street1: '456 Business Ave',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90210',
            country: 'US'
        }
    };

    try {
        // Step 1: Generate shipping labels
        console.log('📦 Step 1: Generating shipping labels...');
        const labelsResponse = await fetch('http://localhost:3000/api/generate-shipping-labels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testOrder)
        });

        if (!labelsResponse.ok) {
            const errorText = await labelsResponse.text();
            throw new Error(`Labels API failed: ${labelsResponse.status} - ${errorText}`);
        }

        const labelsData = await labelsResponse.json();
        console.log('✅ Labels generated successfully!');
        console.log('Labels:', {
            label1: labelsData.label1?.tracking_number || 'N/A',
            label2: labelsData.label2?.tracking_number || 'N/A',
            label3: labelsData.label3?.tracking_number || 'N/A'
        });

        // Step 2: Update Airtable with shipping data
        console.log('\n📊 Step 2: Updating Airtable...');
        const airtableResponse = await fetch('http://localhost:3000/api/update-shipping-airtable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: testOrder.orderId,
                customerName: testOrder.customerName,
                customerEmail: testOrder.customerEmail,
                shippingLabels: labelsData
            })
        });

        if (!airtableResponse.ok) {
            const errorText = await airtableResponse.text();
            throw new Error(`Airtable API failed: ${airtableResponse.status} - ${errorText}`);
        }

        const airtableData = await airtableResponse.json();
        console.log('✅ Airtable updated successfully!');
        console.log('Record ID:', airtableData.recordId);

        // Step 3: Create order (complete workflow)
        console.log('\n🛒 Step 3: Testing complete order creation...');
        const orderResponse = await fetch('http://localhost:3000/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerName: testOrder.customerName,
                customerEmail: testOrder.customerEmail,
                customerAddress: testOrder.customerAddress,
                packageType: 'premium',
                totalAmount: 99.99
            })
        });

        if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            throw new Error(`Order API failed: ${orderResponse.status} - ${errorText}`);
        }

        const orderData = await orderResponse.json();
        console.log('✅ Order created successfully!');
        console.log('Order ID:', orderData.orderId);
        console.log('Shipping Labels Generated:', orderData.shippingLabels ? 'Yes' : 'No');
        console.log('Airtable Updated:', orderData.airtableRecordId ? 'Yes' : 'No');

        console.log('\n🎉 Complete shipping workflow test PASSED!');
        console.log('\n📋 Summary:');
        console.log('- Shipping labels generated: ✅');
        console.log('- Airtable records created: ✅');
        console.log('- Complete order workflow: ✅');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

// Run the test
testCompleteShippingWorkflow();
