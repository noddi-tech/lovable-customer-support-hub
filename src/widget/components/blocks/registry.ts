import React from 'react';

// ========== Shared Types ==========

export interface BlockComponentProps {
  primaryColor: string;
  messageId: string;
  blockIndex: number;
  usedBlocks: Set<string>;
  onAction: (value: string, blockKey: string) => void;
  // API-calling block props (only passed when requiresApi = true)
  widgetKey?: string;
  conversationId?: string | null;
  language?: string;
  onLogEvent?: (event: string, details?: string, type?: 'info' | 'tool' | 'error' | 'success') => void;
  // Block-specific parsed data
  data: Record<string, any>;
}

export interface FlowPreviewProps {
  primaryColor?: string;
}

export interface ApiEndpointConfig {
  name: string;
  edgeFunction: string;
  externalApi?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requestBody?: Record<string, string>;
  responseShape?: Record<string, string>;
  description: string;
}

export interface BlockDefinition {
  type: string;
  marker: string;
  closingMarker?: string;
  parseContent: (inner: string) => Record<string, any>;

  component: React.FC<BlockComponentProps>;
  requiresApi?: boolean;

  apiConfig?: {
    endpoints: ApiEndpointConfig[];
  };

  flowMeta: {
    label: string;
    icon: string;
    description: string;
    applicableFieldTypes?: string[];
    applicableNodeTypes?: string[];
    previewComponent?: React.FC<FlowPreviewProps>;
  };
}

// ========== Registry ==========

const BLOCK_REGISTRY = new Map<string, BlockDefinition>();

export function registerBlock(def: BlockDefinition): void {
  BLOCK_REGISTRY.set(def.type, def);
}

export function getBlock(type: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY.get(type);
}

export function getAllBlocks(): BlockDefinition[] {
  return Array.from(BLOCK_REGISTRY.values());
}

export function getBlockForFieldType(fieldType: string): BlockDefinition | undefined {
  for (const def of BLOCK_REGISTRY.values()) {
    if (def.flowMeta.applicableFieldTypes?.includes(fieldType)) {
      return def;
    }
  }
  return undefined;
}

export function getBlockForNodeType(nodeType: string): BlockDefinition | undefined {
  for (const def of BLOCK_REGISTRY.values()) {
    if (def.flowMeta.applicableNodeTypes?.includes(nodeType)) {
      return def;
    }
  }
  return undefined;
}
