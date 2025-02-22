function Loading() {
  return (
    <section className="bg-background motion-blur-in motion-opacity-in motion-duration-[2s] flex min-h-screen w-full flex-col items-center justify-center gap-6 overflow-hidden lg:gap-20">
      <img
        src="/logo.svg"
        alt="Vibes"
        className="motion-preset-spin motion-duration-1000 size-52 select-none lg:size-96"
      />
    </section>
  );
}

export default Loading;
