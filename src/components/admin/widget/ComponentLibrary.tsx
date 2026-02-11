import React, { useState } from 'react';
import { getAllBlocks, type BlockDefinition } from '@/widget/components/blocks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { BookOpen, Settings2, Play, ChevronDown, ChevronUp, Zap, Check, X } from 'lucide-react';

// ── Sample data for interactive sandbox ──

function getSampleData(type: string): Record<string, any> {
  switch (type) {
    case 'action_menu':
      return { options: ['Check order status', 'Talk to an agent', 'Cancel my order'] };
    case 'yes_no':
      return { question: 'Was this helpful?' };
    case 'confirm':
      return { summary: 'Cancel your booking for March 15?' };
    case 'text_input':
      return { placeholder: 'Enter your name…' };
    case 'email_input':
      return { placeholder: 'you@example.com' };
    case 'phone_verify':
      return {};
    case 'rating':
      return { maxStars: 5 };
    default:
      return {};
  }
}

// ── Library card ──

const BlockCard: React.FC<{ block: BlockDefinition }> = ({ block }) => {
  const [expanded, setExpanded] = useState(false);
  const PreviewComp = block.flowMeta.previewComponent;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={block.flowMeta.label}>
              {block.flowMeta.icon}
            </span>
            <CardTitle className="text-base">{block.flowMeta.label}</CardTitle>
          </div>
          <div className="flex gap-1.5">
            {block.requiresApi && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Zap className="h-3 w-3" /> API
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs mt-1">
          {block.flowMeta.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {block.flowMeta.applicableFieldTypes?.map((ft) => (
            <Badge key={ft} variant="secondary" className="text-[10px]">
              field: {ft}
            </Badge>
          ))}
          {block.flowMeta.applicableNodeTypes?.map((nt) => (
            <Badge key={nt} variant="secondary" className="text-[10px]">
              node: {nt}
            </Badge>
          ))}
        </div>

        {/* Static preview */}
        {PreviewComp && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Preview
            </p>
            <PreviewComp primaryColor="hsl(var(--primary))" />
          </div>
        )}

        {/* Try-it toggle */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {expanded ? 'Close sandbox' : 'Try it'}
        </Button>

        {/* Interactive sandbox */}
        {expanded && (
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-background p-4">
            <p className="text-[10px] font-medium text-primary mb-3 uppercase tracking-wider">
              Interactive Sandbox
            </p>
            <block.component
              primaryColor="hsl(var(--primary))"
              messageId="sandbox-preview"
              blockIndex={0}
              usedBlocks={new Set()}
              onAction={(val, key) => {
                toast({
                  title: 'Action triggered',
                  description: `Value: "${val}" — Block key: ${key}`,
                });
              }}
              data={getSampleData(block.type)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Manage table ──

const ManageView: React.FC<{ blocks: BlockDefinition[] }> = ({ blocks }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Component</TableHead>
        <TableHead>Marker Syntax</TableHead>
        <TableHead className="text-center">API</TableHead>
        <TableHead>Field Types</TableHead>
        <TableHead>Node Types</TableHead>
        <TableHead className="text-center">Preview</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {blocks.map((block) => (
        <TableRow key={block.type}>
          <TableCell>
            <div className="flex items-center gap-2">
              <span className="text-base">{block.flowMeta.icon}</span>
              <span className="font-medium text-sm">{block.flowMeta.label}</span>
            </div>
          </TableCell>
          <TableCell>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {block.marker}
              {block.closingMarker ? `…${block.closingMarker}` : ''}
            </code>
          </TableCell>
          <TableCell className="text-center">
            {block.requiresApi ? (
            <Check className="h-4 w-4 text-primary mx-auto" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
            )}
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {block.flowMeta.applicableFieldTypes?.map((ft) => (
                <Badge key={ft} variant="secondary" className="text-[10px]">
                  {ft}
                </Badge>
              )) || <span className="text-xs text-muted-foreground">—</span>}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {block.flowMeta.applicableNodeTypes?.map((nt) => (
                <Badge key={nt} variant="secondary" className="text-[10px]">
                  {nt}
                </Badge>
              )) || <span className="text-xs text-muted-foreground">—</span>}
            </div>
          </TableCell>
          <TableCell className="text-center">
            {block.flowMeta.previewComponent ? (
              <Check className="h-4 w-4 text-primary mx-auto" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── Main export ──

export const ComponentLibrary: React.FC = () => {
  const blocks = getAllBlocks();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Interactive Block Components</h3>
        <p className="text-sm text-muted-foreground">
          {blocks.length} components registered — these are the interactive UI blocks the AI can render in conversations.
        </p>
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
            {blocks.map((block) => (
              <BlockCard key={block.type} block={block} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <Card className="mt-2">
            <CardContent className="p-0">
              <ManageView blocks={blocks} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
