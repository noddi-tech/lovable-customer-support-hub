import ReactMarkdown from "react-markdown"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { Link } from "@/router/compat"

interface MarkdownViewProps {
  content: string
  /** Slug of the document being rendered, used to resolve relative links. */
  slug: string
  className?: string
}

/** Resolve a relative markdown link against the current doc into a /docs route. */
function resolveDocHref(href: string, slug: string): string | null {
  if (/^[a-z]+:/i.test(href) || href.startsWith("#")) return null
  if (href.startsWith("/docs")) return href

  const base = slug.includes("/") ? slug.slice(0, slug.lastIndexOf("/")) : ""
  const raw = href.startsWith("/") ? href.replace(/^\/?docs\//, "") : `${base}/${href}`

  const parts: string[] = []
  for (const part of raw.split("/")) {
    if (!part || part === ".") continue
    if (part === "..") parts.pop()
    else parts.push(part)
  }
  const target = parts.join("/").replace(/\.md$/i, "")
  return target ? `/docs/${target}` : "/docs"
}

export function MarkdownView({ content, slug, className }: MarkdownViewProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:scroll-mt-24 prose-headings:font-semibold",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:border prose-pre:bg-muted prose-pre:text-foreground",
        "prose-table:text-sm prose-th:text-left",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a: ({ href, children, ...props }) => {
            const internal = href ? resolveDocHref(href, slug) : null
            if (internal) {
              return (
                <Link to={internal} {...(props as Record<string, unknown>)}>
                  {children}
                </Link>
              )
            }
            return (
              <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
                {children}
              </a>
            )
          },
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownView
