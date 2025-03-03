import { useState, useEffect } from 'react';
import { isIOS } from 'react-device-detect';

export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia(
      '(display-mode: standalone)'
    ).matches;

    // @ts-expect-error - PWA type error
    const isInStandaloneModeIOS = isIOS && window.navigator.standalone === true;

    setIsPWA(isStandalone || isInStandaloneModeIOS);
  }, []);

  return isPWA;
}
