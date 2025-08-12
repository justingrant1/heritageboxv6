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

        if (!paymentMethod || !amount) {
            console.log('❌ Missing required fields');
            return res.status(400).json({success: false, error: 'Missing required fields'});
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.log('❌ Missing Stripe secret key');
            return res.status(500).json({success: false, error: 'Payment service not configured'});
        }

        console.log('💳 Creating payment intent...');

        // Create payment intent with minimal data
        const paymentIntentParams = new URLSearchParams({
            amount: Math.round(amount * 100).toString(),
            currency: 'usd',
            payment_method: paymentMethod.id,
            confirm: 'true',
            return_url: 'https://heritagebox.com/order-confirmation',
            description: 'Heritage Box Memory Digitization Service'
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

        return res.status(200).json({
            success: true,
            paymentIntent: result
        });

    } catch (error: any) {
        console.log('💥 Payment error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
