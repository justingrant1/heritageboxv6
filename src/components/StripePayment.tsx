import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CreditCard as CardIcon, ShieldCheck } from 'lucide-react';

// Load Stripe outside of a component's render to avoid recreating the Stripe object on every render
const getStripePublishableKey = () => {
  const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  console.log('Environment key:', envKey ? `${envKey.substring(0, 20)}...` : 'NOT FOUND');
  
  if (!envKey) {
    console.error('VITE_STRIPE_PUBLISHABLE_KEY not found in environment variables');
    throw new Error('Stripe publishable key not configured');
  }
  
  return envKey;
};

const stripePromise = loadStripe(getStripePublishableKey());

interface StripePaymentProps {
  onSuccess: (paymentMethod: any, details: any) => void;
  buttonColorClass: string;
  isProcessing: boolean;
  amount: string;
}

const CheckoutForm = ({ onSuccess, buttonColorClass, isProcessing, amount }: StripePaymentProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        setError(error.message || 'An error occurred');
        toast.error("Payment failed", {
          description: error.message || "Please check your card details and try again",
        });
      } else {
        // Call the success handler with the payment method
        onSuccess(paymentMethod, {
          card: {
            brand: paymentMethod.card?.brand,
            last4: paymentMethod.card?.last4,
            exp_month: paymentMethod.card?.exp_month,
            exp_year: paymentMethod.card?.exp_year,
          }
        });
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred');
      toast.error("Payment processing error", {
        description: "Please try again or use a different card",
      });
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#374151',
        fontFamily: 'Arial, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  return (
    <div className="max-w-lg mx-auto bg-white">
      {/* Secure Payment Processing Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-green-500 text-white flex items-center justify-center rounded-full">
          <ShieldCheck size={20} />
        </div>
        <span className="text-lg font-medium text-gray-700">Secure payment processing</span>
      </div>
      
      {/* Card Information Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gray-700 text-white flex items-center justify-center rounded-xl">
            <CardIcon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Card Information</h2>
            <p className="text-gray-600">Enter your card details below</p>
          </div>
        </div>
        
        {/* Credit Card Logos */}
        <div className="flex items-center gap-4 mb-6 justify-center">
          <img src="/mastercard.svg" alt="MasterCard" className="h-8" />
          <img src="/visa.svg" alt="Visa" className="h-8" />
          <img src="/amex.svg" alt="American Express" className="h-8" />
        </div>
        
        {/* Card Input Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 border-2 border-gray-200 rounded-xl focus-within:border-primary transition-colors">
            <CardElement options={cardElementOptions} />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {/* All Major Credit Cards Accepted */}
          <div className="flex items-center justify-center gap-2 text-gray-600 mt-4">
            <CardIcon size={16} />
            <span className="text-sm">All major credit cards accepted</span>
          </div>
          
          {/* Pay Button */}
          <Button
            type="submit"
            className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mb-6"
            disabled={!stripe || loading || isProcessing}
          >
            {loading || isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                Pay {amount}
                <ShieldCheck className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>
      </div>
      
      {/* Security Badges */}
      <div className="flex items-center justify-around mb-6 py-4">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-green-500 text-white flex items-center justify-center rounded-full mb-2">
            <ShieldCheck size={16} />
          </div>
          <span className="text-sm text-gray-600 text-center">SSL Secured</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-green-500 text-white flex items-center justify-center rounded-full mb-2">
            <ShieldCheck size={16} />
          </div>
          <span className="text-sm text-gray-600 text-center">Powered by<br/>Stripe</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-green-500 text-white flex items-center justify-center rounded-full mb-2">
            <ShieldCheck size={16} />
          </div>
          <span className="text-sm text-gray-600 text-center">PCI Compliant</span>
        </div>
      </div>
      
      {/* Bottom Security Message */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 text-center">
        <ShieldCheck size={16} className="text-green-600" />
        <span>Your payment information is secure and encrypted with 256-bit SSL</span>
      </div>
    </div>
  );
};

const StripePayment = (props: StripePaymentProps) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};

export default StripePayment;
