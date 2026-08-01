import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Agent responses are markdown (headers, bold, tables — see agent-registry.ts
// prompts) but were rendered as raw text (literal "##"/"**") until this
// component existed. Minimal styling via the app's own tokens rather than
// pulling in a typography plugin for a single use site.
export function ChatMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-3 text-base font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-3 text-sm font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-2 text-sm font-semibold">{children}</h3>,
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>,
          hr: () => <hr className="border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
          th: ({ children }) => <th className="px-2 py-1 text-left font-medium text-muted-foreground">{children}</th>,
          td: ({ children }) => <td className="border-t border-border/60 px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
