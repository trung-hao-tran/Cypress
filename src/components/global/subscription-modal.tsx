'use client';
import { useSubscriptionModal } from '@/lib/providers/subscription-modal-provider';
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { formatPrice } from '@/lib/utils';
import { Price, ProductWirhPrice } from '@/lib/supabase/supabase.types';
import { useToast } from '../ui/use-toast';
import { getStripe } from '@/lib/stripe/stripeClient';
import CypressDiamondIcon from '../icons/cypressDiamongIcon';
import { Elements } from '@stripe/react-stripe-js';
import { StripeElementsOptions } from '@stripe/stripe-js';
import PaymentForm from './payment-form';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';
import Loader from './Loader';

interface SubscriptionModalProps {
  products: ProductWirhPrice[];
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ products }) => {
  const { open, setOpen } = useSubscriptionModal();
  const { toast } = useToast();
  const { subscription, user } = useSupabaseUser();
  const router = useRouter();

  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const stripeOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'flat',
    },
  };

  useEffect(() => {
    if (!selectedPrice || !user) return;

    const createSubscription = async () => {
      try {
        setIsLoading(true);
        console.log('[SUBSCRIPTION] Creating subscription...', { priceId: selectedPrice.id });

        const response = await fetch('/api/create-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: selectedPrice.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create subscription');
        }

        const data = await response.json();
        console.log('[SUBSCRIPTION] Subscription created:', data);

        setClientSecret(data.clientSecret);

        // If updating existing subscription, show success
        if (subscription?.status === 'active') {
          toast({
            title: 'Success',
            description: 'Your plan has been successfully upgraded!',
          });
          setOpen(false);
          router.refresh();
        }
      } catch (error: any) {
        console.error('[SUBSCRIPTION] Error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to initialize payment',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    createSubscription();
  }, [selectedPrice, user]);

  const handleSuccess = () => {
    toast({
      title: 'Welcome to Pro!',
      description: 'Your subscription is now active',
    });
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {subscription?.status === 'active' ? (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Already on Pro Plan</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            You're already subscribed to the Pro plan. Manage your subscription in settings.
          </p>
        </DialogContent>
      ) : (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Upgrade to Pro Plan</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-muted-foreground">
            Unlock all premium features and take your workspace to the next level.
          </DialogDescription>

          {/* Pro Features List */}
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-5 w-5 text-primary shrink-0">
                <CypressDiamondIcon />
              </div>
              <div>
                <p className="font-medium">Unlimited Folders</p>
                <p className="text-sm text-muted-foreground">
                  Create as many folders as you need
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-5 w-5 text-primary shrink-0">
                <CypressDiamondIcon />
              </div>
              <div>
                <p className="font-medium">Unlimited Collaborators</p>
                <p className="text-sm text-muted-foreground">
                  Invite your entire team
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-5 w-5 text-primary shrink-0">
                <CypressDiamondIcon />
              </div>
              <div>
                <p className="font-medium">Custom Workspace Logos</p>
                <p className="text-sm text-muted-foreground">Brand your workspace</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-5 w-5 text-primary shrink-0">
                <CypressDiamondIcon />
              </div>
              <div>
                <p className="font-medium">Priority Support</p>
                <p className="text-sm text-muted-foreground">Get help when you need it</p>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          {products.length ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Plan</h3>
              {products.map((product) => (
                <div key={product.id} className="space-y-3">
                  {product.prices?.map((price) => (
                    <Card
                      key={price.id}
                      onClick={() => !clientSecret && setSelectedPrice(price)}
                      className={cn(
                        'relative cursor-pointer transition-all p-6 hover:border-primary',
                        {
                          'border-primary bg-primary/5': selectedPrice?.id === price.id,
                          'cursor-not-allowed opacity-50': clientSecret,
                        }
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-2xl font-bold">
                            {formatPrice(price)}
                            <span className="text-base text-muted-foreground ml-2">
                              / {price.interval}
                            </span>
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {product.name}
                          </p>
                        </div>
                        {selectedPrice?.id === price.id && (
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-primary-foreground"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ))}

              {/* Payment Form */}
              {selectedPrice && (
                <>
                  {clientSecret ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Payment Method</h3>
                      <Elements stripe={getStripe()} options={stripeOptions}>
                        <PaymentForm priceId={selectedPrice.id} onSuccess={handleSuccess} />
                      </Elements>
                    </div>
                  ) : (
                    isLoading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader />
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                No plans available at the moment. Please contact support.
              </p>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
};

export default SubscriptionModal;
