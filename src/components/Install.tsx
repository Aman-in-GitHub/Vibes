import { useState, useEffect } from 'react';
import {
  PiAppStoreLogo as AppStore,
  PiGooglePlayLogo as PlayStore
} from 'react-icons/pi';
import { isIOS } from 'react-device-detect';

function InstallButton({ onClick }: { onClick: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  async function handleInstallClick() {
    if (onClick) {
      onClick();
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  }

  if (!deferredPrompt) {
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
