import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-7 w-full rounded border border-[#555] bg-[#1e1e1e] px-2 text-[11px] text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
