import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MarkdownView } from '@/components/docs/MarkdownView';
import {
  DOC_SECTIONS,
  DEFAULT_DOC_SLUG,
  findDoc,
  searchDocs,
  type DocEntry,
} from '@/lib/docs-registry';
import { BookOpen, Search, PanelLeft, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

function DocsNav({
  activeSlug,
  onNavigate,
}: {
  activeSlug: string;
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    if (query.trim().length < 2) return DOC_SECTIONS;
    const matches = new Set(searchDocs(query).map((d) => d.slug));
    return DOC_SECTIONS.map((s) => ({
      section: s.section,
      docs: s.docs.filter((d) => matches.has(d.slug)),
    })).filter((s) => s.docs.length > 0);
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation"
            className="h-9 pl-9 text-base sm:text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <nav className="space-y-4 p-3">
          {sections.length === 0 && (
            <p className="px-1 text-sm text-muted-foreground">No documents match that search.</p>
          )}
          {sections.map(({ section, docs }) => (
            <div key={section}>
              <div className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {section}
              </div>
              <ul className="space-y-0.5">
                {docs.map((doc: DocEntry) => (
                  <li key={doc.slug}>
                    <Link
                      to={`/docs/${doc.slug}`}
                      onClick={onNavigate}
                      className={cn(
                        'block truncate rounded-md px-2 py-1.5 text-sm transition-colors',
                        doc.slug === activeSlug
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                      )}
                      title={doc.title}
                    >
                      {doc.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

export default function DocsPage() {
  const params = useParams();
  const slug = (params['*'] || '').replace(/^\/+|\/+$/g, '');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!slug) {
    return <Navigate to={`/docs/${DEFAULT_DOC_SLUG}`} replace />;
  }

  const doc = findDoc(slug);

  return (
    <UnifiedAppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-3 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                Documentation
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Architecture decisions and operating guides, rendered straight from the repository.
              </p>
            </div>
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <PanelLeft className="mr-1.5 h-4 w-4" />
                  Contents
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <DocsNav activeSlug={slug} onNavigate={() => setMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-72 shrink-0 border-r lg:block">
            <DocsNav activeSlug={slug} />
          </aside>

          <ScrollArea className="min-w-0 flex-1">
            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
              {doc ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <FileText className="h-3 w-3" />
                      {doc.path}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.section}
                    </Badge>
                  </div>
                  <MarkdownView content={doc.content} slug={doc.slug} />
                </>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-sm font-medium">Document not found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    There is no file at <code className="rounded bg-muted px-1">docs/{slug}.md</code>.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link to={`/docs/${DEFAULT_DOC_SLUG}`}>Back to the index</Link>
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </UnifiedAppLayout>
  );
}
