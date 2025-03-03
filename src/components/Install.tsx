// @ts-nocheck

import logo from '@/logo.svg';
import { create } from 'zustand';
import { useRef } from 'react';
import {
  PiAppStoreLogo as AppStore,
  PiGooglePlayLogo as PlayStore
} from 'react-icons/pi';
import { isIOS } from 'react-device-detect';
import { PWAInstallElement } from '@khmyznikov/pwa-install';

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
  const pwaInstallRef = useRef<PWAInstallElement>(null);

  return (
    <>
      <button
        className="flex w-full items-center justify-between bg-green-600 px-4 py-4 text-xl text-white duration-300 active:bg-green-500"
        onClick={() => {
          onClick();
          pwaInstallRef.current?.showDialog(true);
        }}
      >
        Install Vibes
        {isIOS ? (
          <AppStore className="text-3xl text-green-200" />
        ) : (
          <PlayStore className="text-3xl text-green-200" />
        )}
      </button>

      <PWAInstallElement
        ref={pwaInstallRef}
        name={'Vibes'}
        icon={logo}
        disable-install-description={true}
      />
    </>
  );
}

export default InstallButton;
