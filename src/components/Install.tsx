import {
  PiAppStoreLogo as AppStore,
  PiGooglePlayLogo as PlayStore
} from 'react-icons/pi';
import { isIOS } from 'react-device-detect';
import { useIsPWA } from '@/hooks/useIsPWA';

function InstallButton({ onClick }: { onClick: () => void }) {
  const isPWA = useIsPWA();
  const isPWAInstalled = localStorage.getItem('vibes-pwa-installed') === 'true';

  if (isPWA || isPWAInstalled) return null;

  return (
    <>
      <button
        className="flex w-full items-center justify-between bg-green-600 px-4 py-4 text-xl text-white duration-300 active:bg-green-500"
        onClick={() => {
          onClick();
          // @ts-expect-error - PWA type error
          document.getElementById('pwa-install')?.showDialog(true);
        }}
      >
        Install Vibes
        {isIOS ? (
          <AppStore className="text-3xl text-green-200" />
        ) : (
          <PlayStore className="text-3xl text-green-200" />
        )}
      </button>
    </>
  );
}

export default InstallButton;
