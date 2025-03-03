import { useState, useEffect } from 'react';
import {
  PiAppStoreLogo as AppStore,
  PiGooglePlayLogo as PlayStore
} from 'react-icons/pi';
import { isIOS } from 'react-device-detect';

function InstallButton({ onClick }: { onClick: () => void }) {
  const [isButtonVisible, setIsButtonVisible] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [hasInstalledRelatedApps, setHasInstalledRelatedApps] =
    useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = (): boolean => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: tabbed)').matches
      );
    };

    setIsStandalone(checkStandalone());

    async function checkInstalledApps() {
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (
            navigator as any
          ).getInstalledRelatedApps();
          setHasInstalledRelatedApps(relatedApps.length > 0);
        } catch (e) {
          console.error('Error checking for installed related apps:', e);
        }
      }
    }

    checkInstalledApps();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setIsButtonVisible(true);
    };

    const handleAppInstalled = () => {
      setIsButtonVisible(false);
      (window as any).deferredPrompt = undefined;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    setIsButtonVisible(
      (window as any).deferredPrompt !== undefined ||
        ('onbeforeinstallprompt' in window &&
          !isStandalone &&
          !hasInstalledRelatedApps)
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  function handleInstallClick() {
    onClick();
    if ((window as any).deferredPrompt) {
      (window as any).deferredPrompt.prompt();
    }
  }

  if (!isButtonVisible || isStandalone || hasInstalledRelatedApps) {
    return null;
  }

  return (
    <button
      className="flex w-full items-center justify-between bg-green-600 px-4 py-4 text-xl text-white duration-300 active:bg-green-500"
      onClick={handleInstallClick}
    >
      Install Vibes
      {isIOS ? (
        <AppStore className="text-3xl text-green-200" />
      ) : (
        <PlayStore className="text-3xl text-green-200" />
      )}
    </button>
  );
}

export default InstallButton;
