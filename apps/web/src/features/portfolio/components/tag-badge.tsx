import type { Tag } from '@/types';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function TagBadge({ tag }: { tag: Tag }) {
  const isHex = HEX_COLOR_RE.test(tag.color);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: isHex ? `${tag.color}1a` : tag.color, color: tag.color }}
    >
      {tag.name}
    </span>
  );
}
