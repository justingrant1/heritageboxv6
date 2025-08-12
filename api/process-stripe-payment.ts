export const config = {
    runtime: 'nodejs',
};

// Helper function for structured logging
function logEvent(event: string, data: any) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ...data
    }));
}

export default async function handler(request: any) {
    logEvent('stripe_request_received', {
        method: request.method,
        url: request.url,
        headers: request.headers
    });

    if (request.method !== 'POST') {
        logEvent('method_not_allowed', {method: request.method});
        return new Response(JSON.stringify({success: false, error: 'Method not allowed'}), {
            status: 405,
            headers: {'Content-Type': 'application/json'}
        });
    }

    try {
        // Parse request body for Node.js runtime
        let rawBody = '';
        request.on('data', (chunk: any) => {
            rawBody += chunk.toString();
        });
        
        await new Promise((resolve) => {
            request.on('end', resolve);
        });
        
        const body = JSON.parse(rawBody);
        logEvent('stripe_request_body_parsed', {
            hasPaymentMethod: !!body.paymentMethod,
            amount: body.amount,
            orderDetails: body.orderDetails
        });

        const {paymentMethod, amount, orderDetails} = body;

        if (!paymentMethod || !amount) {
            logEvent('stripe_validation_failed', {
                missingPaymentMethod: !paymentMethod,
                missingAmount: !amount
            });
            return new Response(JSON.stringify({success: false, error: 'Missing required fields'}), {
                status: 400,
                headers: {'Content-Type': 'application/json'}
            });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

        logEvent('stripe_environment_check', {
            hasSecretKey: !!stripeSecretKey,
            nodeEnv: process.env.NODE_ENV
        });

        if (!stripeSecretKey) {
            logEvent('stripe_configuration_error', {error: 'STRIPE_SECRET_KEY not configured'});
            return new Response(JSON.stringify({success: false, error: 'Payment service not configured - missing secret key'}), {
                status: 500,
                headers: {'Content-Type': 'application/json'}
            });
        }

        logEvent('stripe_payment_initiated', {
            amount,
            paymentMethodId: paymentMethod.id,
            environment: process.env.NODE_ENV,
            hasOrderDetails: !!orderDetails,
            customerEmail: orderDetails?.customerInfo?.email
        });

        // Step 1: Create or retrieve Stripe customer
        let stripeCustomerId = null;
        if (orderDetails?.customerInfo) {
            const customerInfo = orderDetails.customerInfo;
            
            logEvent('stripe_customer_creation_started', {
                email: customerInfo.email,
                name: customerInfo.fullName
            });

            const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${stripeSecretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    email: customerInfo.email,
                    name: customerInfo.fullName,
                    phone: customerInfo.phone || '',
                    'address[line1]': customerInfo.address || '',
                    'address[city]': customerInfo.city || '',
                    'address[state]': customerInfo.state || '',
                    'address[postal_code]': customerInfo.zipCode || '',
                    'address[country]': 'US',
                    'metadata[first_name]': customerInfo.firstName,
                    'metadata[last_name]': customerInfo.lastName
                })
            });

            if (customerResponse.ok) {
                const customer = await customerResponse.json();
                stripeCustomerId = customer.id;
                logEvent('stripe_customer_created', {
                    customerId: stripeCustomerId,
                    email: customerInfo.email
                });
            } else {
                const customerError = await customerResponse.json();
                logEvent('stripe_customer_creation_failed', {
                    error: customerError,
                    email: customerInfo.email
                });
                // Continue without customer - payment can still work
            }
        }

        // Step 2: Prepare comprehensive metadata
        const metadata: { [key: string]: string } = {
            account_id: 'acct_1RoprfEr0BqcN5eb'
        };

        if (orderDetails) {
            // Customer information
            if (orderDetails.customerInfo) {
                metadata.customer_name = orderDetails.customerInfo.fullName;
                metadata.customer_email = orderDetails.customerInfo.email;
                metadata.customer_phone = orderDetails.customerInfo.phone;
                metadata.customer_address = `${orderDetails.customerInfo.address}, ${orderDetails.customerInfo.city}, ${orderDetails.customerInfo.state} ${orderDetails.customerInfo.zipCode}`;
            }

            // Order information
            if (orderDetails.orderDetails) {
                metadata.package_type = orderDetails.orderDetails.package;
                metadata.package_price = orderDetails.orderDetails.packagePrice;
                metadata.subtotal = orderDetails.orderDetails.subtotal;
                metadata.total_amount = orderDetails.orderDetails.totalAmount;
                metadata.digitizing_speed = orderDetails.orderDetails.digitizingSpeed;
                metadata.digitizing_time = orderDetails.orderDetails.digitizingTime;
                
                if (orderDetails.orderDetails.couponCode && orderDetails.orderDetails.couponCode !== 'None') {
                    metadata.coupon_code = orderDetails.orderDetails.couponCode;
                    metadata.discount_percent = orderDetails.orderDetails.discountPercent?.toString();
                    metadata.discount_amount = orderDetails.orderDetails.discountAmount;
                }

                if (orderDetails.orderDetails.addOns && orderDetails.orderDetails.addOns.length > 0) {
                    metadata.add_ons = orderDetails.orderDetails.addOns.join('; ');
                }
            }
        }

        // Step 3: Create payment intent with comprehensive data
        const paymentIntentParams = new URLSearchParams({
            amount: Math.round(amount * 100).toString(), // Convert to cents
            currency: 'usd',
            payment_method: paymentMethod.id,
            confirm: 'true',
            return_url: 'https://heritagebox.com/order-confirmation',
            description: orderDetails?.orderDetails?.package 
                ? `Heritage Box ${orderDetails.orderDetails.package} Package - ${orderDetails.orderDetails.digitizingSpeed} Processing`
                : 'Heritage Box Memory Digitization Service'
        });

        // Add customer if created successfully
        if (stripeCustomerId) {
            paymentIntentParams.append('customer', stripeCustomerId);
            paymentIntentParams.append('receipt_email', orderDetails.customerInfo.email);
        }

        // Add all metadata
        Object.entries(metadata).forEach(([key, value]) => {
            if (value) {
                paymentIntentParams.append(`metadata[${key}]`, value.toString());
            }
        });

        logEvent('stripe_payment_intent_creation', {
            hasCustomer: !!stripeCustomerId,
            metadataKeys: Object.keys(metadata),
            description: paymentIntentParams.get('description')
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
        logEvent('stripe_response_received', {
            status: response.status,
            ok: response.ok,
            hasError: !!result.error,
            errorDetails: result.error,
            paymentIntentStatus: result.status,
            fullResponse: result
        });

        if (!response.ok) {
            logEvent('stripe_api_error', {
                status: response.status,
                error: result.error,
                fullErrorResponse: result
            });
            
            const errorMessage = result.error?.message || result.error?.code || 'Payment failed';
            throw new Error(errorMessage);
        }

        // Check if payment requires additional action
        if (result.status === 'requires_action' || result.status === 'requires_source_action') {
            logEvent('stripe_payment_requires_action', {
                paymentIntentId: result.id,
                clientSecret: result.client_secret
            });
            
            return new Response(JSON.stringify({
                success: false,
                requiresAction: true,
                clientSecret: result.client_secret,
                error: 'Payment requires additional authentication'
            }), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            });
        }

        if (result.status !== 'succeeded') {
            logEvent('stripe_payment_not_succeeded', {
                paymentIntentId: result.id,
                status: result.status
            });
            
            throw new Error(`Payment ${result.status}`);
        }

        logEvent('stripe_payment_successful', {
            paymentIntentId: result.id,
            amount: result.amount,
            status: result.status
        });

        // Save the order to Airtable
        if (orderDetails) {
            try {
                logEvent('airtable_integration_started', {
                    paymentIntentId: result.id,
                    hasOrderDetails: !!orderDetails
                });

                // Get the base URL from the current request
                const url = new URL(request.url);
                const baseUrl = `${url.protocol}//${url.host}`;
                
                const airtableResponse = await fetch(`${baseUrl}/api/create-order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderDetails,
                        paymentId: result.id,
                        paymentStatus: result.status,
                        actualAmount: result.amount / 100 // Convert back from cents
                    })
                });

                if (airtableResponse.ok) {
                    logEvent('airtable_integration_success', {
                        paymentIntentId: result.id
                    });
                } else {
                    const airtableError = await airtableResponse.text();
                    logEvent('airtable_integration_failed', {
                        paymentIntentId: result.id,
                        error: airtableError
                    });
                }
            } catch (error) {
                logEvent('airtable_integration_error', {
                    paymentIntentId: result.id,
                    error: error.message
                });
                // Don't fail the payment if Airtable fails
            }
        }

        return new Response(JSON.stringify({
            success: true,
            paymentIntent: result
        }), {
            status: 200,
            headers: {'Content-Type': 'application/json'}
        });
    } catch (error) {
        logEvent('stripe_payment_error', {
            error: error.message,
            stack: error.stack,
            name: error.name
        });

        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: {'Content-Type': 'application/json'}
        });
    }
}
