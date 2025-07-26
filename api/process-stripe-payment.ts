export const config = {
    runtime: 'edge',
};

// Helper function for structured logging
function logEvent(event: string, data: any) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ...data
    }));
}

export default async function handler(request: Request) {
    logEvent('stripe_request_received', {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
    });

    if (request.method !== 'POST') {
        logEvent('method_not_allowed', {method: request.method});
        return new Response(JSON.stringify({success: false, error: 'Method not allowed'}), {
            status: 405,
            headers: {'Content-Type': 'application/json'}
        });
    }

    try {
        const body = await request.json();
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
            environment: process.env.NODE_ENV
        });

        // Create payment intent with Stripe
        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                amount: Math.round(amount * 100).toString(), // Convert to cents
                currency: 'usd',
                payment_method: paymentMethod.id,
                confirm: 'true',
                return_url: 'https://heritagebox.com/order-confirmation',
                'metadata[account_id]': 'acct_1RoprfEr0BqcN5eb'
            })
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
