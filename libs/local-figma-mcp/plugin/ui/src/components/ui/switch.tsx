import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';
import { cn } from '../../lib/utils';

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      'peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-[#555] bg-[#333] transition-colors data-[state=checked]:bg-[#2d5a3d] data-[state=checked]:border-accent/50',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-3 w-3 rounded-full bg-foreground shadow transition-transform data-[state=checked]:translate-x-3 translate-x-0.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';
