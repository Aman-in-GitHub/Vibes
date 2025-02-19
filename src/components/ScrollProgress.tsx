import { cn } from '@/lib/cn';
import { motion, MotionProps, useScroll } from 'motion/react';
import React from 'react';
interface ScrollProgressProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps> {}

export const ScrollProgress = React.forwardRef<
  HTMLDivElement,
  ScrollProgressProps
>(({ className, ...props }, ref) => {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      ref={ref}
      className={cn(
        'fixed inset-x-0 top-0 z-50 h-[0.25rem] origin-left bg-gradient-to-r',
        className
      )}
      style={{
        scaleX: scrollYProgress
      }}
      {...props}
    />
  );
});

ScrollProgress.displayName = 'ScrollProgress';
