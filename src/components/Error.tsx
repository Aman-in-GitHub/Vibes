function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="bg-background motion-opacity-in motion-blur-in motion-duration-1000 flex min-h-screen w-full flex-col items-center justify-center gap-4 overflow-hidden px-4 lg:gap-12">
      <img
        src="/maskable-icon-512x512.png"
        alt="Error - Vibes"
        className="size-80 rounded-xs select-none lg:size-96"
      />

      <div className="text-center text-red-500">
        <p className="text-2xl font-bold">Something went wrong!</p>
        <p className="mt-1 text-neutral-400">{error.message}</p>
      </div>

      <button onClick={reset} className="rounded-xs bg-red-600 px-4 py-2">
        Try again
      </button>

      <p className="text-center">
        Notify me @
        <a
          href="mailto:amanchandinc@gmail.com?subject=Vibes ~ Error Report"
          className="text-red-500 underline decoration-red-500 underline-offset-2"
        >
          my email
        </a>{' '}
        about this error
      </p>
    </section>
  );
}

export default Error;
