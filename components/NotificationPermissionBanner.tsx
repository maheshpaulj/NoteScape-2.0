// src/components/NotificationPermissionBanner.tsx
'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BellOff, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { savePushSubscription } from '@/actions/actions';

interface NotificationPermissionBannerProps {
  permission: PermissionState | null;
}

export function NotificationPermissionBanner({ permission }: NotificationPermissionBannerProps) {
  const [isSubscribing, setIsSubscribing] = useState(false);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported by your browser.');
      return;
    }
    
    setIsSubscribing(true);
    try {
      const swRegistration = await navigator.serviceWorker.register('/sw-push-logic.js');
      
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      await savePushSubscription(subscription);
      toast.success('You are subscribed to reminders!');
      // You might want to reload the page or hide the banner after success
      window.location.reload(); 
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      toast.error('Failed to enable notifications. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // ... (the JSX for 'denied' and 'granted' states remains the same)
  if (permission === 'denied') {
    return (
      <Alert variant="destructive" className="mb-6">
        <BellOff className="h-4 w-4" />
        <AlertTitle>Notifications Blocked</AlertTitle>
        <AlertDescription>
          You have blocked notifications. To receive reminders, please enable them in your browser&apos;s site settings.
        </AlertDescription>
      </Alert>
    );
  }

  if (permission === 'prompt') {
    return (
      <Alert className="mb-6">
        <BellRing className="h-4 w-4" />
        <AlertTitle>Enable Reminders</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span>
            Get notified about your reminders even when your browser is closed.
          </span>
          <Button onClick={subscribeToPush} disabled={isSubscribing} className="mt-2 sm:mt-0">
            {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enable Notifications
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}