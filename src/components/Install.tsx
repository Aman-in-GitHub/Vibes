import { useEffect, useRef } from 'react';
import {
  PiAppStoreLogo as AppStore,
  PiGooglePlayLogo as PlayStore
} from 'react-icons/pi';
import { isIOS } from 'react-device-detect';
import { create } from 'zustand';

import { persist } from 'zustand/middleware';

type IsPWAInstalledStore = {
  isPWAInstalled: boolean;
  setIsPWAInstalled: (installed: boolean) => void;
};

export const useIsPWAInstalledStore = create(
  persist<IsPWAInstalledStore>(
    (set) => ({
      isPWAInstalled: false,
      setIsPWAInstalled: (installed) => set({ isPWAInstalled: installed })
    }),
    {
      name: 'vibes-is-pwa-installed-store'
    }
  )
);

function InstallButton({ onClick }: { onClick: () => void }) {
  const deferredPrompt = useRef<any>(null);
  const isPWAInstalled = useIsPWAInstalledStore(
    (state) => state.isPWAInstalled
  );
  const setIsPWAInstalled = useIsPWAInstalledStore(
    (state) => state.setIsPWAInstalled
  );

  useEffect(() => {
    const handlePrompt = (e: any) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () =>
      window.removeEventListener('beforeinstallprompt', handlePrompt);
  });

  const handleInstallClick = () => {
    onClick();
    if (!deferredPrompt.current) return;

    deferredPrompt.current.prompt();
    deferredPrompt.current.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setIsPWAInstalled(true);
      }
    });
  };

  if (isPWAInstalled) return null;

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
