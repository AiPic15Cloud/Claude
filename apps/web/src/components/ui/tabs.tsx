import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Filet or plutôt que pastille pleine (voir DealDetail du canvas de
      // refonte) : la liste porte juste un filet de base, chaque onglet
      // actif trace son propre soulignement dessus. Le dégradé aux deux
      // bords signale qu'il y a plus d'onglets à faire défiler
      // horizontalement — sans lui, une liste trop longue pour l'écran
      // (10 onglets sur la fiche dossier, par ex.) se coupe net à droite
      // sans aucun indice qu'elle est scrollable.
      'flex h-9 max-w-full items-center gap-5 overflow-x-auto border-b border-border text-muted-foreground no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex shrink-0 items-center justify-center whitespace-nowrap border-b-2 border-transparent px-0.5 pb-2 -mb-px text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('mt-3 focus-visible:outline-none', className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
