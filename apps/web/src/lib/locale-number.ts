// A native <input type="number"> parses "." as the decimal separator only
// under an English locale — under a French browser/OS locale it expects ","
// and silently rejects "." keystrokes (typing "240096.61" stops dead at
// "240096"). Pairing a plain text input with this parser sidesteps that
// entirely: both "," and "." (plus thousands spacing) are accepted.
export function parseLocaleNumber(raw: string): number {
  return Number(raw.trim().replace(/\s/g, '').replace(',', '.'));
}
