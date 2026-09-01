import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'relative z-[1100] overflow-hidden rounded-full border border-white/30 bg-popover/85 px-3 py-1.5 text-xs text-popover-foreground shadow-lg backdrop-blur-xl before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/25 before:to-transparent before:opacity-70 before:content-[""] animate-in fade-in-0 zoom-in-95 dark:border-white/10 dark:before:from-white/5',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
