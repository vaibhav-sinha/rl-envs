import * as React from 'react';
import { cn } from '../../lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded border border-[#555] bg-[#1e1e1e] px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
