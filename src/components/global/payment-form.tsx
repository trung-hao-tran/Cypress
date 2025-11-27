'use client';

import React, { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import Loader from './Loader';
import { useToast } from '../ui/use-toast';

interface PaymentFormProps {
  priceId: string;
  onSuccess?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ priceId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!priceId) {
      setError('Please select a plan to subscribe');
      return;
    }

    setError('');

    if (!stripe || !elements) {
      setError('Payment system is not ready. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (confirmError) {
        console.error('[PAYMENT_FORM] Confirm error:', confirmError);
        setError(confirmError.message || 'Payment failed');
        toast({
          title: 'Payment failed',
          description: confirmError.message || 'Please try a different card',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Payment successful!',
          description: 'Your subscription is now active',
        });
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('[PAYMENT_FORM] Error:', error);
      setError('An unexpected error occurred');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      <PaymentElement />

      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full h-12 text-base"
        size="lg"
      >
        {isLoading ? <Loader /> : 'Subscribe Now'}
      </Button>
    </form>
  );
};

export default PaymentForm;
