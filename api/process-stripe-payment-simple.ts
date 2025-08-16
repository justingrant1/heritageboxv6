export default async function handler(req: any, res: any) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({success: false, error: 'Method not allowed'});
    }

    try {
        console.log('🚀 Payment API called');
        
        const {paymentMethod, amount, orderDetails} = req.body;

        if (!paymentMethod || !amount || !orderDetails) {
            console.log('❌ Missing required fields');
            return res.status(400).json({success: false, error: 'Missing required fields'});
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.log('❌ Missing Stripe secret key');
            return res.status(500).json({success: false, error: 'Payment service not configured'});
        }

        // STEP 1: Create order first to get the official order number
        console.log('📝 Creating order record first...');
        
        const createOrderResponse = await fetch(`${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderDetails: orderDetails,
                paymentId: 'pending', // Will be updated after payment
                paymentStatus: 'pending',
                actualAmount: amount
            }),
        });

        if (!createOrderResponse.ok) {
            const errorText = await createOrderResponse.text();
            console.error('❌ Failed to create order:', errorText);
            return res.status(500).json({success: false, error: 'Failed to create order record'});
        }

        const createOrderResult = await createOrderResponse.json();
        if (!createOrderResult.success) {
            console.error('❌ Order creation failed:', createOrderResult.error);
            return res.status(500).json({success: false, error: createOrderResult.error});
        }

        const orderNumber = createOrderResult.orderNumber;
        console.log('✅ Order created with number:', orderNumber);

        // STEP 2: Process payment with Stripe
        console.log('💳 Creating payment intent...');

        const paymentIntentParams = new URLSearchParams({
            amount: Math.round(amount * 100).toString(),
            currency: 'usd',
            payment_method: paymentMethod.id,
            confirm: 'true',
            return_url: 'https://heritagebox.com/order-confirmation',
            description: `Heritage Box Order #${orderNumber}`,
            'metadata[order_number]': orderNumber,
            'metadata[customer_email]': orderDetails.customerInfo?.email || 'unknown'
        });

        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: paymentIntentParams
        });

        const result = await response.json();
        console.log('📊 Stripe response status:', response.status);

        if (!response.ok) {
            console.log('❌ Stripe API error:', result.error);
            const errorMessage = result.error?.message || 'Payment failed';
            return res.status(400).json({success: false, error: errorMessage});
        }

        if (result.status === 'requires_action' || result.status === 'requires_source_action') {
            console.log('🔐 Payment requires additional authentication');
            return res.status(200).json({
                success: false,
                requiresAction: true,
                clientSecret: result.client_secret,
                error: 'Payment requires additional authentication'
            });
        }

        if (result.status !== 'succeeded') {
            console.log('❌ Payment not succeeded:', result.status);
            return res.status(400).json({success: false, error: `Payment ${result.status}`});
        }

        console.log('✅ Payment successful:', result.id);

        // STEP 3: Update the order with successful payment info
        console.log('📝 Updating order with payment info...');
        
        try {
            const updateOrderResponse = await fetch(`${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderDetails: orderDetails,
                    paymentId: result.id,
                    paymentStatus: 'succeeded',
                    actualAmount: amount,
                    updateExisting: true,
                    orderNumber: orderNumber
                }),
            });

            if (updateOrderResponse.ok) {
                console.log('✅ Order updated with payment info');
            } else {
                console.warn('⚠️ Failed to update order with payment info, but payment succeeded');
            }
        } catch (updateError) {
            console.warn('⚠️ Error updating order with payment info:', updateError);
            // Don't fail the payment if update fails
        }

        return res.status(200).json({
            success: true,
            paymentIntent: result,
            orderNumber: orderNumber
        });

    } catch (error: any) {
        console.log('💥 Payment error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
