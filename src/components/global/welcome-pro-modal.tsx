'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import CypressDiamondIcon from '../icons/cypressDiamongIcon';

interface WelcomeProModalProps {
  open: boolean;
  onClose: () => void;
}

const WelcomeProModal: React.FC<WelcomeProModalProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-16 w-16 text-primary">
            <CypressDiamondIcon />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            Welcome to Pro!
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4">
          <p className="text-lg">
            Thank you for upgrading to our Pro plan!
          </p>
          <p className="text-muted-foreground">
            You now have access to all premium features including unlimited folders,
            unlimited collaborators, custom workspace logos, and priority support.
          </p>
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              Your workspace has been upgraded and all features are now available.
            </p>
          </div>
        </div>
        <Button
          onClick={onClose}
          className="w-full mt-4"
          size="lg"
        >
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeProModal;
