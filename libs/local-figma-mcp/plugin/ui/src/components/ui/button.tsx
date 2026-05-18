import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded border text-[11px] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none px-2.5 py-1',
  {
    variants: {
      variant: {
        default: 'bg-[#333] text-foreground border-[#555] hover:bg-[#444]',
        primary: 'bg-[#2d5a3d] text-foreground border-[#4ade80]/40 hover:bg-[#3a6b4a]',
        destructive: 'bg-[#4a2020] text-destructive border-destructive/40 hover:bg-[#5a2828]',
        ghost: 'border-transparent hover:bg-[#333]',
      },
      size: {
        default: 'h-7',
        sm: 'h-6 text-[10px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';
