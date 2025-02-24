function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="bg-background motion-opacity-in motion-duration-[2s] flex min-h-screen w-full flex-col items-center justify-center gap-6 overflow-hidden lg:gap-20">
      <img
        src="/logo.svg"
        alt="Vibes"
        className="motion-preset-spin motion-duration-1000 size-40 select-none lg:size-52"
      />

      <div className="mt-10 text-center text-red-500">
        <p className="text-xl font-bold">Something went wrong!</p>
        <p className="mt-1">{error.message}</p>
      </div>

      <button onClick={reset} className="mt-10 rounded-xs bg-red-600 px-4 py-2">
        Try again
      </button>
    </section>
  );
}

export default Error;
