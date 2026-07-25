import type { Tag } from '@/types';

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}
    >
      {tag.name}
    </span>
  );
}
