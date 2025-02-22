import { Link } from 'react-router';

function NotFound() {
  return (
    <main className="bg-background motion-blur-in motion-opacity-in motion-duration-[2s] flex min-h-screen w-full flex-col items-center justify-center gap-6 overflow-hidden lg:gap-20">
      <img
        src="/logo.svg"
        alt="Vibes"
        className="motion-preset-spin motion-duration-1000 size-40 select-none lg:size-52"
      />

      <Link
        to="/"
        className="mt-10 rounded-xs bg-rose-600 px-4 py-2"
        replace={true}
      >
        Go To Home
      </Link>
    </main>
  );
}

export default NotFound;
