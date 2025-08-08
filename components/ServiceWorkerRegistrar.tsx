// src/components/ServiceWorkerRegistrar.tsx
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // This effect runs once on the client when the app loads.
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          // The path points to your main service worker file in the public folder.
          await navigator.serviceWorker.register('/sw-push-logic.js');
          console.log('Service Worker registered successfully.');
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          toast.error('Could not initialize background features.');
        }
      };

      // We call the registration function.
      registerServiceWorker();
    }
  }, []); // The empty dependency array ensures this runs only once.

  // This component renders nothing to the DOM.
  return null;
}