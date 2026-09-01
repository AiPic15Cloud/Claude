import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

// Même surface "Liquid Glass" que DropdownMenuContent, pour rester cohérent
// avec les autres panneaux flottants de l'app.
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'relative z-[1100] rounded-2xl border border-white/30 bg-popover/80 p-3 text-popover-foreground shadow-xl backdrop-blur-xl before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/25 before:to-transparent before:opacity-70 before:content-[""] animate-in fade-in-0 zoom-in-95 dark:border-white/10 dark:before:from-white/5',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
