import { useEffect } from 'react';
import { Link } from 'react-router';

function NotFound() {
  useEffect(() => {
    document.title = '404 ~ Vibes';
  }, []);

  return (
    <main className="bg-background motion-opacity-in motion-blur-in motion-duration-1000 flex min-h-screen w-full flex-col items-center justify-center gap-4 overflow-hidden px-4 lg:gap-12">
      <img
        src="/404.svg"
        alt="404 - Vibes"
        className="size-80 select-none lg:size-96"
      />

      <Link to="/" className="rounded-xs bg-rose-600 px-4 py-2" replace={true}>
        Go To Home
      </Link>
    </main>
  );
}

export default NotFound;
