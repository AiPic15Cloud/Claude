import * as React from 'react';
import { Input } from './input';

// Drop-in replacement for <Input type="number"> on money/percentage fields —
// see lib/locale-number.ts for why type="number" silently breaks under a
// French locale. Pair with parseLocaleNumber() to read the value back out.
export const DecimalInput = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>>(
  ({ inputMode = 'decimal', placeholder = '0,00', ...props }, ref) => (
    <Input ref={ref} type="text" inputMode={inputMode} placeholder={placeholder} {...props} />
  ),
);
DecimalInput.displayName = 'DecimalInput';
