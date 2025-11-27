'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WelcomeProModal from './welcome-pro-modal';

const PaymentSuccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectStatus = searchParams?.get('redirect_status');
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (redirectStatus === 'succeeded') {
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Show welcome modal
      setShowWelcome(true);

      // Refresh to get updated subscription data
      router.refresh();
    }
  }, [redirectStatus, router]);

  const handleClose = () => {
    setShowWelcome(false);
  };

  return <WelcomeProModal open={showWelcome} onClose={handleClose} />;
};

export default PaymentSuccess;
