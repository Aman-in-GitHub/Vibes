import { useCallback, useRef } from 'react';

type EmptyCallback<T = void> = (param: T) => void;

interface DoubleTapOptions<T> {
  onSingleTap?: EmptyCallback<T>;
}

export function useDoubleTap<T>(
  callback: EmptyCallback<T>,
  threshold = 300,
  options: DoubleTapOptions<T> = {}
) {
  const timer = useRef<NodeJS.Timeout | null>(null);
  const param = useRef<T | null>(null);

  const handler = useCallback(
    (value: T) => {
      param.current = value;

      if (!timer.current) {
        timer.current = setTimeout(() => {
          if (options.onSingleTap && param.current) {
            options.onSingleTap(param.current);
          }
          timer.current = null;
        }, threshold);
      } else {
        clearTimeout(timer.current);
        timer.current = null;
        if (param.current) {
          callback(param.current);
        }
      }
    },
    [callback, threshold, options.onSingleTap]
  );

  return handler;
}
