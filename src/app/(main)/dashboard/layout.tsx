import { SubscriptionModalProvider } from '@/lib/providers/subscription-modal-provider';
import { getActiveProductsWithPrice } from '@/lib/supabase/queries';
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  params: any;
}

const Layout: React.FC<LayoutProps> = async ({ children, params }) => {
  const { data: products, error } = await getActiveProductsWithPrice();

  // Log error but don't crash if products aren't set up yet
  if (error) {
    console.warn('⚠️ Could not fetch products:', error);
  }

  return (
    <main className="flex over-hidden h-screen">
      <SubscriptionModalProvider products={products || []}>
        {children}
      </SubscriptionModalProvider>
    </main>
  );
};

export default Layout;
