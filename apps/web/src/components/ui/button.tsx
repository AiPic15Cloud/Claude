import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Fully rounded, pill-shaped, glass — the Apple "Liquid Glass" CTA
  // treatment: a translucent, blurred surface with a soft top-to-bottom
  // sheen (the ::before layer) standing in for a specular highlight, and
  // a hairline light border tracing the pill's edge like a glass rim.
  // The sheen sits at a negative z-index so it layers between the button's
  // own background (always painted first) and its text/icon content,
  // never washing out the label.
  'relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-sm font-medium backdrop-blur-md transition-all duration-300 before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/35 before:to-transparent before:opacity-80 before:content-[""] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0 dark:before:from-white/10',
  {
    variants: {
      variant: {
        default:
          'border border-white/30 bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary dark:border-white/10',
        destructive:
          'border border-white/30 bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/25 hover:bg-destructive dark:border-white/10',
        outline:
          'border border-border/70 bg-background/40 shadow-sm hover:bg-accent/60 hover:text-accent-foreground dark:bg-white/5 dark:border-white/10',
        secondary:
          'border border-white/20 bg-secondary/70 text-secondary-foreground shadow-sm hover:bg-secondary/90 dark:border-white/5',
        ghost: 'before:content-none hover:bg-accent/60 hover:text-accent-foreground hover:backdrop-blur-md',
        link: 'before:content-none text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
