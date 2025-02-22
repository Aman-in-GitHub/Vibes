import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { PiCheck as Check } from 'react-icons/pi';
import { cn } from '@/lib/cn';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer border-primary focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground size-5 shrink-0 rounded-xs border shadow focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
