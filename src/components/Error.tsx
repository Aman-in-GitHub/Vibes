function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="bg-background motion-blur-in motion-opacity-in motion-duration-[2s] flex min-h-screen w-full flex-col items-center justify-center gap-6 overflow-hidden lg:gap-20">
      <img
        src="/logo.svg"
        alt="Vibes"
        className="motion-preset-spin motion-duration-1000 size-52 select-none lg:size-96"
      />

      <div className="mt-10 text-center text-red-500">
        <p className="text-lg font-bold">Something went wrong!</p>
        <p className="mt-2 text-sm">{error.message}</p>
      </div>

      <button
        onClick={reset}
        className="bg-primary mt-10 rounded px-4 py-2 text-white"
      >
        Try again
      </button>
    </section>
  );
}

export default Error;
