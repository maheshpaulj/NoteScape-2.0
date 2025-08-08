// src/components/NotificationPermissionBanner.tsx
'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BellOff, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { savePushSubscription } from '@/actions/actions';

// The props this component expects from its parent (RemindersPage)
interface NotificationPermissionBannerProps {
  permission: PermissionState | null;
  isSubscribed: boolean | null; // Is THIS specific device/browser subscribed?
}

export function NotificationPermissionBanner({ permission, isSubscribed }: NotificationPermissionBannerProps) {
  const [isSubscribing, setIsSubscribing] = useState(false);

  // This function handles the entire process of getting a subscription and saving it.
  const subscribeToPush = async () => {
    // navigator.serviceWorker.ready waits for the active service worker.
    const swRegistration = await navigator.serviceWorker.ready;
    if (!swRegistration) {
      toast.error('Service worker not ready. Please refresh the page and try again.');
      return;
    }

    setIsSubscribing(true);
    try {
      // Ask the browser's PushManager for a new subscription object for this device.
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true, // Required for web push
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, // The public key from our .env file
      });

      // Send the new subscription "address" to our server to be saved in the user's "address book".
      await savePushSubscription(subscription.toJSON());

      toast.success('Success! This device will now receive reminders.');
      // A reload is the simplest way to refresh the component's state and hide the banner.
      window.location.reload(); 
    } catch (error) {
      // Handle common errors gracefully.
      if ((error as Error).name === 'NotAllowedError') {
        toast.error('Permission was denied. You will need to enable it in your browser settings.');
      } else {
        toast.error('Could not subscribe. Please try again.');
        console.error('Failed to subscribe to push notifications:', error);
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  // Don't render anything until the parent component has finished checking the state.
  if (permission === null || isSubscribed === null) {
    return null;
  }

  // --- UI Display Logic ---

  // 1. HIGHEST PRIORITY: If the user has explicitly blocked notifications, show an error.
  if (permission === 'denied') {
    return (
      <Alert variant="destructive" className="mb-6">
        <BellOff className="h-4 w-4" />
        <AlertTitle>Notifications Blocked</AlertTitle>
        <AlertDescription>
          You have blocked notifications for this site. To receive reminders, please enable them in your browser's site settings.
        </AlertDescription>
      </Alert>
    );
  }

  // 2. THE CORE LOGIC: If this device is NOT subscribed, and permission is NOT denied,
  //    we should show the button to enable notifications. This covers both the 'prompt'
  //    and the 'granted' states where the device isn't yet synced with our backend.
  if (!isSubscribed && permission !== 'prompt') {
    return (
      <Alert className="mb-6">
        <BellRing className="h-4 w-4" />
        <AlertTitle>Enable Reminders on This Device</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Get notified about your reminders even when the app is closed.</span>
          <Button onClick={subscribeToPush} disabled={isSubscribing} className="mt-2 sm:mt-0 flex-shrink-0">
            {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enable Notifications
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // 3. If none of the above are true, it means permission is 'granted' AND this device
  //    is already subscribed. Everything is perfect, so we render nothing.
  return null;
}