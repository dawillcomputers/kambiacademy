const registerBackgroundSync = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const syncCapableRegistration = registration as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
  };

  if (syncCapableRegistration.sync) {
    await syncCapableRegistration.sync.register('background-sync');
  }
};

const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (window.confirm('New content is available. Reload to update?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });

  window.addEventListener('online', () => {
    console.log('Back online - syncing data...');
    void registerBackgroundSync().catch((error) => {
      console.log('Background sync registration failed: ', error);
    });
  });

  window.addEventListener('offline', () => {
    console.log('Gone offline');
  });
};

registerServiceWorker();