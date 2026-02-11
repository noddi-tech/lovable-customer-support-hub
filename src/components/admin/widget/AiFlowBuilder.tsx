import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  GitBranch, RotateCcw, Save, Plus, Trash2, X,
  MessageSquare, GitFork, ListChecks, FileInput, PhoneForwarded,
  Settings2, ChevronRight, CornerDownRight, ChevronUp, ChevronDown, MoveVertical
} from 'lucide-react';
import { getBlockForFieldType, getBlockForNodeType } from '@/widget/components/blocks';

// ── Types ──

type NodeType = 'message' | 'decision' | 'action_menu' | 'data_collection' | 'escalation' | 'goto';

interface FlowCondition {
  id: string;
  check: string;
  if_true?: string;
  if_false?: string;
}

interface FlowAction {
  id: string;
  label: string;
  enabled: boolean;
  children?: FlowNode[];
}

interface DataField {
  id: string;
  label: string;
  field_type: 'phone' | 'email' | 'text' | 'number' | 'date';
  required: boolean;
  validation_hint?: string;
}

interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  instruction: string;
  conditions?: FlowCondition[];
  actions?: FlowAction[];
  data_fields?: DataField[];
  children?: FlowNode[];
  yes_children?: FlowNode[];
  no_children?: FlowNode[];
  goto_target?: string;
}

interface GeneralRules {
  max_initial_lines: number;
  never_dump_history: boolean;
  tone: string;
  language_behavior?: string;
  escalation_threshold?: number;
}

interface FlowConfig {
  nodes: FlowNode[];
  general_rules: GeneralRules;
}

// ── Node type metadata ──

const NODE_TYPES: { value: NodeType; label: string; icon: React.ElementType; color: string; bgColor: string; description: string }[] = [
  { value: 'message', label: 'Message', icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', description: 'Bot sends a message or instruction' },
  { value: 'decision', label: 'Decision', icon: GitFork, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', description: 'IF/YES/NO branching logic' },
  { value: 'action_menu', label: 'Action Menu', icon: ListChecks, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800', description: 'Present choices to the customer' },
  { value: 'data_collection', label: 'Data Collection', icon: FileInput, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800', description: 'Ask customer for input (phone, email, etc.)' },
  { value: 'escalation', label: 'Escalation', icon: PhoneForwarded, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800', description: 'Hand off to a human agent' },
  { value: 'goto', label: 'Go To', icon: CornerDownRight, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800', description: 'Jump to another node (loop/redirect)' },
];

const getNodeMeta = (type: NodeType) => NODE_TYPES.find(n => n.value === type) || NODE_TYPES[0];

// ── Defaults ──

const DEFAULT_FLOW: FlowConfig = {
  nodes: [
    {
      id: 'node_1', type: 'message', label: 'Initial Greeting', instruction: 'Greet the customer and ask how you can help them today.',
      children: [
        {
          id: 'node_2', type: 'data_collection', label: 'Ask for Phone Number', instruction: 'Ask the customer for their phone number to look up their account.',
          data_fields: [{ id: 'phone', label: 'Phone number', field_type: 'phone', required: true }],
          children: [
            {
              id: 'node_3', type: 'decision', label: 'Existing Customer?', instruction: 'Check if the customer exists in the system.',
              conditions: [{ id: 'cond_1', check: 'Customer found in system' }],
              yes_children: [
                { id: 'node_3a', type: 'message', label: 'Verify Identity', instruction: 'Verify identity with SMS PIN code, then greet by name and show upcoming bookings.', children: [] },
              ],
              no_children: [
                { id: 'node_3b', type: 'message', label: 'New Customer Welcome', instruction: 'Welcome them as a new customer and ask what service they are interested in.', children: [] },
              ],
              children: [
                {
                  id: 'node_4', type: 'action_menu', label: 'Present Action Choices', instruction: 'After greeting, present these options:',
                  actions: [
                    { id: 'a1', label: 'Book new service', enabled: true, children: [] },
                    { id: 'a2', label: 'View my bookings', enabled: true, children: [] },
                    { id: 'a3', label: 'Modify/cancel booking', enabled: true, children: [] },
                    { id: 'a4', label: 'Wheel storage', enabled: true, children: [] },
                  ],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  general_rules: { max_initial_lines: 4, never_dump_history: true, tone: 'Friendly, concise, action-oriented', language_behavior: 'Match customer language', escalation_threshold: 3 },
};

// ── Tree helpers ──

function findNodeInTree(nodes: FlowNode[], nodeId: string): FlowNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    for (const branch of ['children', 'yes_children', 'no_children'] as const) {
      const found = findNodeInTree(node[branch] || [], nodeId);
      if (found) return found;
    }
    // Also search inside action menu children
    if (node.actions) {
      for (const action of node.actions) {
        if (action.children) {
          const found = findNodeInTree(action.children, nodeId);
          if (found) return found;
        }
      }
    }
  }
  return null;
}

function updateNodeInTree(nodes: FlowNode[], nodeId: string, updates: Partial<FlowNode>): FlowNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) return { ...node, ...updates };
    return {
      ...node,
      children: updateNodeInTree(node.children || [], nodeId, updates),
      yes_children: updateNodeInTree(node.yes_children || [], nodeId, updates),
      no_children: updateNodeInTree(node.no_children || [], nodeId, updates),
      actions: node.actions?.map(a => ({
        ...a,
        children: a.children ? updateNodeInTree(a.children, nodeId, updates) : undefined,
      })),
    };
  });
}

function removeNodeFromTree(nodes: FlowNode[], nodeId: string): FlowNode[] {
  return nodes
    .filter(n => n.id !== nodeId)
    .map(node => ({
      ...node,
      children: removeNodeFromTree(node.children || [], nodeId),
      yes_children: removeNodeFromTree(node.yes_children || [], nodeId),
      no_children: removeNodeFromTree(node.no_children || [], nodeId),
      actions: node.actions?.map(a => ({
        ...a,
        children: a.children ? removeNodeFromTree(a.children, nodeId) : undefined,
      })),
    }));
}

function addChildToTree(nodes: FlowNode[], parentId: string, branch: 'children' | 'yes_children' | 'no_children', newNode: FlowNode): FlowNode[] {
  return nodes.map(node => {
    if (node.id === parentId) {
      return { ...node, [branch]: [...(node[branch] || []), newNode] };
    }
    return {
      ...node,
      children: addChildToTree(node.children || [], parentId, branch, newNode),
      yes_children: addChildToTree(node.yes_children || [], parentId, branch, newNode),
      no_children: addChildToTree(node.no_children || [], parentId, branch, newNode),
      actions: node.actions?.map(a => ({
        ...a,
        children: a.children ? addChildToTree(a.children, parentId, branch, newNode) : undefined,
      })),
    };
  });
}

function addChildToAction(nodes: FlowNode[], actionMenuNodeId: string, actionId: string, newNode: FlowNode): FlowNode[] {
  return nodes.map(node => {
    if (node.id === actionMenuNodeId && node.actions) {
      return {
        ...node,
        actions: node.actions.map(a =>
          a.id === actionId ? { ...a, children: [...(a.children || []), newNode] } : a
        ),
      };
    }
    return {
      ...node,
      children: addChildToAction(node.children || [], actionMenuNodeId, actionId, newNode),
      yes_children: addChildToAction(node.yes_children || [], actionMenuNodeId, actionId, newNode),
      no_children: addChildToAction(node.no_children || [], actionMenuNodeId, actionId, newNode),
      actions: node.actions?.map(a => ({
        ...a,
        children: a.children ? addChildToAction(a.children, actionMenuNodeId, actionId, newNode) : undefined,
      })),
    };
  });
}

function countAllNodes(nodes: FlowNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    count += countAllNodes(node.children || []);
    count += countAllNodes(node.yes_children || []);
    count += countAllNodes(node.no_children || []);
    if (node.actions) {
      for (const a of node.actions) {
        count += countAllNodes(a.children || []);
      }
    }
  }
  return count;
}

function collectAllNodes(nodes: FlowNode[]): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const node of nodes) {
    if (node.type !== 'goto') {
      result.push({ id: node.id, label: node.label });
    }
    result.push(...collectAllNodes(node.children || []));
    result.push(...collectAllNodes(node.yes_children || []));
    result.push(...collectAllNodes(node.no_children || []));
    if (node.actions) {
      for (const a of node.actions) {
        result.push(...collectAllNodes(a.children || []));
      }
    }
  }
  return result;
}

// ── Move / Reorder helpers ──

function moveNodeInSiblings(nodes: FlowNode[], nodeId: string, direction: -1 | 1): FlowNode[] {
  // Check if node is in this array
  const idx = nodes.findIndex(n => n.id === nodeId);
  if (idx !== -1) {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= nodes.length) return nodes;
    const copy = [...nodes];
    [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
    return copy;
  }
  // Recurse into children
  return nodes.map(node => ({
    ...node,
    children: moveNodeInSiblings(node.children || [], nodeId, direction),
    yes_children: moveNodeInSiblings(node.yes_children || [], nodeId, direction),
    no_children: moveNodeInSiblings(node.no_children || [], nodeId, direction),
    actions: node.actions?.map(a => ({
      ...a,
      children: a.children ? moveNodeInSiblings(a.children, nodeId, direction) : undefined,
    })),
  }));
}

/** Swap a node with its parent in a chain (move up through parent-child nesting) */
function swapWithParent(nodes: FlowNode[], nodeId: string): FlowNode[] {
  // Search each branch array for a node whose children/yes_children/no_children contain nodeId
  function swapInArray(arr: FlowNode[]): { result: FlowNode[]; swapped: boolean } {
    for (let i = 0; i < arr.length; i++) {
      const parent = arr[i];
      // Check children
      const childIdx = (parent.children || []).findIndex(c => c.id === nodeId);
      if (childIdx !== -1) {
        const child = parent.children![childIdx];
        // Swap: child takes parent's place, parent becomes child's child
        const newParent = { ...parent, children: [...parent.children!.slice(0, childIdx), ...parent.children!.slice(childIdx + 1)] };
        const newChild = { ...child, children: [...(child.children || []), newParent] };
        const newArr = [...arr];
        newArr[i] = newChild;
        return { result: newArr, swapped: true };
      }
      // Recurse into children
      for (const branch of ['children', 'yes_children', 'no_children'] as const) {
        const branchArr = parent[branch] || [];
        const sub = swapInArray(branchArr);
        if (sub.swapped) {
          return { result: arr.map((n, j) => j === i ? { ...n, [branch]: sub.result } : n), swapped: true };
        }
      }
      // Recurse into action children
      if (parent.actions) {
        for (let ai = 0; ai < parent.actions.length; ai++) {
          const action = parent.actions[ai];
          if (action.children) {
            const sub = swapInArray(action.children);
            if (sub.swapped) {
              const newActions = parent.actions.map((a, j) => j === ai ? { ...a, children: sub.result } : a);
              return { result: arr.map((n, j) => j === i ? { ...n, actions: newActions } : n), swapped: true };
            }
          }
        }
      }
    }
    return { result: arr, swapped: false };
  }

  return swapInArray(nodes).result;
}

/** Swap a node with its first child (move down through parent-child nesting) */
function swapWithChild(nodes: FlowNode[], nodeId: string): FlowNode[] {
  function swapInArray(arr: FlowNode[]): { result: FlowNode[]; swapped: boolean } {
    for (let i = 0; i < arr.length; i++) {
      const node = arr[i];
      if (node.id === nodeId && node.children && node.children.length > 0) {
        const firstChild = node.children[0];
        const remainingChildren = node.children.slice(1);
        // Swap: firstChild takes node's place, node becomes firstChild's child
        const newNode = { ...node, children: remainingChildren };
        const newChild = { ...firstChild, children: [...(firstChild.children || []), newNode] };
        const newArr = [...arr];
        newArr[i] = newChild;
        return { result: newArr, swapped: true };
      }
      // Recurse
      for (const branch of ['children', 'yes_children', 'no_children'] as const) {
        const branchArr = node[branch] || [];
        const sub = swapInArray(branchArr);
        if (sub.swapped) {
          return { result: arr.map((n, j) => j === i ? { ...n, [branch]: sub.result } : n), swapped: true };
        }
      }
      if (node.actions) {
        for (let ai = 0; ai < node.actions.length; ai++) {
          const action = node.actions[ai];
          if (action.children) {
            const sub = swapInArray(action.children);
            if (sub.swapped) {
              const newActions = node.actions.map((a, j) => j === ai ? { ...a, children: sub.result } : a);
              return { result: arr.map((n, j) => j === i ? { ...n, actions: newActions } : n), swapped: true };
            }
          }
        }
      }
    }
    return { result: arr, swapped: false };
  }

  return swapInArray(nodes).result;
}

/** Chain-aware move: tries sibling swap first, falls back to parent/child swap */
function moveNode(nodes: FlowNode[], nodeId: string, direction: -1 | 1): FlowNode[] {
  const siblingInfo = getSiblingInfo(nodes, nodeId);
  if (siblingInfo && siblingInfo.total > 1) {
    // Can do sibling swap
    const targetIdx = siblingInfo.index + direction;
    if (targetIdx >= 0 && targetIdx < siblingInfo.total) {
      return moveNodeInSiblings(nodes, nodeId, direction);
    }
  }
  // Fall back to chain swap
  if (direction === -1) {
    return swapWithParent(nodes, nodeId);
  } else {
    return swapWithChild(nodes, nodeId);
  }
}

/** Check if a node can move up (has sibling above OR has a parent to swap with) */
function canNodeMoveUp(nodes: FlowNode[], nodeId: string): boolean {
  const info = getSiblingInfo(nodes, nodeId);
  if (!info) return false;
  if (info.index > 0) return true;
  // Check if it has a parent (i.e., it's not at the root level, or even at root there's a parent concept)
  // If it's the sole child, it can swap with parent — unless it's at root level index 0
  return !isRootNode(nodes, nodeId);
}

/** Check if a node can move down (has sibling below OR has children to swap with) */
function canNodeMoveDown(nodes: FlowNode[], nodeId: string): boolean {
  const info = getSiblingInfo(nodes, nodeId);
  if (!info) return false;
  if (info.index < info.total - 1) return true;
  // Check if node has children to swap with
  const node = findNodeInTree(nodes, nodeId);
  return !!(node && node.children && node.children.length > 0);
}

function isRootNode(nodes: FlowNode[], nodeId: string): boolean {
  return nodes.some(n => n.id === nodeId);
}

function detachNodeFromTree(nodes: FlowNode[], nodeId: string): { updatedTree: FlowNode[]; detachedNode: FlowNode | null } {
  let detached: FlowNode | null = null;

  function detachFromArray(arr: FlowNode[]): FlowNode[] {
    const idx = arr.findIndex(n => n.id === nodeId);
    if (idx !== -1) {
      detached = arr[idx];
      return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
    }
    return arr.map(node => ({
      ...node,
      children: detachFromArray(node.children || []),
      yes_children: detachFromArray(node.yes_children || []),
      no_children: detachFromArray(node.no_children || []),
      actions: node.actions?.map(a => ({
        ...a,
        children: a.children ? detachFromArray(a.children) : undefined,
      })),
    }));
  }

  const updatedTree = detachFromArray(nodes);
  return { updatedTree, detachedNode: detached };
}

interface BranchTarget {
  parentId: string | null;
  branch: string;
  actionId?: string;
  label: string;
}

function collectBranchTargets(nodes: FlowNode[], excludeNodeId?: string): BranchTarget[] {
  const targets: BranchTarget[] = [{ parentId: null, branch: 'children', label: 'Root (top level)' }];

  function walk(nodeList: FlowNode[]) {
    for (const node of nodeList) {
      if (node.id === excludeNodeId) continue;
      if (node.type !== 'goto') {
        targets.push({ parentId: node.id, branch: 'children', label: `${node.label} > children` });
      }
      if (node.type === 'decision') {
        targets.push({ parentId: node.id, branch: 'yes_children', label: `${node.label} > YES branch` });
        targets.push({ parentId: node.id, branch: 'no_children', label: `${node.label} > NO branch` });
      }
      if (node.type === 'action_menu' && node.actions) {
        for (const action of node.actions) {
          if (action.enabled) {
            targets.push({ parentId: node.id, branch: 'action', actionId: action.id, label: `${node.label} > ${action.label}` });
          }
          if (action.children) walk(action.children);
        }
      }
      walk(node.children || []);
      walk(node.yes_children || []);
      walk(node.no_children || []);
    }
  }

  walk(nodes);
  return targets;
}

function getSiblingInfo(nodes: FlowNode[], nodeId: string): { index: number; total: number } | null {
  // Check this array
  const idx = nodes.findIndex(n => n.id === nodeId);
  if (idx !== -1) return { index: idx, total: nodes.length };
  // Recurse
  for (const node of nodes) {
    for (const branch of ['children', 'yes_children', 'no_children'] as const) {
      const result = getSiblingInfo(node[branch] || [], nodeId);
      if (result) return result;
    }
    if (node.actions) {
      for (const action of node.actions) {
        if (action.children) {
          const result = getSiblingInfo(action.children, nodeId);
          if (result) return result;
        }
      }
    }
  }
  return null;
}

/** Migrate flat node arrays (old format) into a tree (new format) */
function migrateToTree(nodes: FlowNode[]): FlowNode[] {
  const isTree = nodes.some(n => (n.children && n.children.length > 0) || (n.yes_children && n.yes_children.length > 0) || (n.no_children && n.no_children.length > 0));
  if (isTree) return nodes;
  if (nodes.length === 0) return [];

  const chain = [...nodes].reverse().reduce<FlowNode[]>((acc, node) => {
    const migrated: FlowNode = {
      ...node,
      children: acc.length > 0 ? acc : [],
      yes_children: node.type === 'decision' ? [] : undefined,
      no_children: node.type === 'decision' ? [] : undefined,
    };
    return [migrated];
  }, []);

  return chain;
}

// ── SVG Connectors ──

const VerticalConnector: React.FC = () => (
  <div className="flex flex-col items-center">
    <svg width="2" height="28" viewBox="0 0 2 28" className="overflow-visible">
      <line x1="1" y1="0" x2="1" y2="22" stroke="currentColor" className="text-border" strokeWidth="1.5" />
      <polygon points="-2,20 1,26 4,20" className="fill-muted-foreground" />
    </svg>
  </div>
);

// ── Add Step Button (inline) ──

const AddStepButton: React.FC<{ onAdd: (type: NodeType) => void; compact?: boolean }> = ({ onAdd, compact }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center">
      {!compact && <VerticalConnector />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-2" align="center">
          <div className="space-y-0.5">
            {NODE_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => { onAdd(t.value); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent text-left"
              >
                <t.icon className={`h-3.5 w-3.5 shrink-0 ${t.color}`} />
                <div>
                  <div className="font-medium text-xs">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ── Compact Node Card ──

interface NodeCardProps {
  node: FlowNode;
  isSelected: boolean;
  onClick: () => void;
  depth: number;
  allNodes: FlowNode[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, isSelected, onClick, depth, allNodes, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) => {
  // Goto node renders as a small pill
  if (node.type === 'goto') {
    const targetNode = node.goto_target ? findNodeInTree(allNodes, node.goto_target) : null;
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`
          cursor-pointer group transition-all duration-150 w-[160px]
          ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:ring-1 hover:ring-primary/40'}
          rounded-full border bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 shadow-sm
        `}
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          <CornerDownRight className="h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 truncate">
            → {targetNode?.label || 'Select target…'}
          </span>
        </div>
      </div>
    );
  }

  const meta = getNodeMeta(node.type);
  const Icon = meta.icon;
  const isDecision = node.type === 'decision';

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`
        relative cursor-pointer group transition-all duration-150
        ${isDecision ? 'w-[180px]' : 'w-[200px]'}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:ring-1 hover:ring-primary/40'}
        rounded-lg border ${meta.bgColor} shadow-sm
      `}
    >
      {/* Move up/down buttons */}
      {(onMoveUp || onMoveDown) && (
        <div className="absolute -right-1 top-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            disabled={!canMoveUp}
            onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            className="h-4 w-4 rounded flex items-center justify-center bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            disabled={!canMoveDown}
            onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            className="h-4 w-4 rounded flex items-center justify-center bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 p-2.5">
        <div className={`shrink-0 ${meta.color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold truncate leading-tight">{node.label}</div>
          <div className={`text-[9px] ${meta.color} font-medium`}>{meta.label}</div>
        </div>
      </div>

      {/* Preview snippets */}
      {node.type === 'action_menu' && node.actions && node.actions.filter(a => a.enabled).length > 0 && (
        <div className="px-2.5 pb-2 flex flex-wrap gap-0.5">
          {node.actions.filter(a => a.enabled).slice(0, 3).map(a => (
            <span key={a.id} className="text-[8px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 truncate max-w-[70px]">{a.label}</span>
          ))}
          {node.actions.filter(a => a.enabled).length > 3 && (
            <span className="text-[8px] text-muted-foreground">+{node.actions.filter(a => a.enabled).length - 3}</span>
          )}
        </div>
      )}
      {node.type === 'data_collection' && node.data_fields && node.data_fields.length > 0 && (
        <div className="px-2.5 pb-2 space-y-1">
          {node.data_fields.map(f => {
            const blockDef = getBlockForFieldType(f.field_type);
            return (
              <div key={f.id} className="flex items-center gap-1">
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 flex items-center gap-0.5 font-semibold">
                  {blockDef ? `${blockDef.flowMeta.icon} ${blockDef.flowMeta.label}` : (f.label || f.field_type)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {node.type === 'decision' && node.conditions && node.conditions.length > 0 && (
        <div className="px-2.5 pb-2 space-y-1">
          <div className="text-[8px] text-amber-700 dark:text-amber-300 truncate">IF: {node.conditions[0].check}</div>
          <div className="flex gap-1">
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 flex items-center gap-0.5 font-semibold">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M4 22H2V11h2"/></svg>
              YES
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 flex items-center gap-0.5 font-semibold">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M20 2h2v11h-2"/></svg>
              NO
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Multi-way fork SVG for action menus ──

const ActionMenuFork: React.FC<{ columns: number }> = ({ columns }) => {
  const colWidth = 200;
  const gap = 16;
  const totalWidth = columns * colWidth + (columns - 1) * gap;
  const center = totalWidth / 2;
  const height = 50;

  return (
    <div className="flex flex-col items-center py-1">
      <svg width={totalWidth} height={height} viewBox={`0 0 ${totalWidth} ${height}`} className="overflow-visible">
        {Array.from({ length: columns }).map((_, i) => {
          const colCenter = i * (colWidth + gap) + colWidth / 2;
          return (
            <g key={i}>
              <path
                d={`M ${center} 0 L ${center} 12 Q ${center} 22 ${colCenter > center ? center + 10 : colCenter < center ? center - 10 : center} 22 L ${colCenter > center ? colCenter - 10 : colCenter < center ? colCenter + 10 : colCenter} 22 Q ${colCenter} 22 ${colCenter} 32 L ${colCenter} 44`}
                stroke="currentColor" className="text-green-500" strokeWidth="1.5" fill="none"
              />
              <polygon points={`${colCenter - 4},40 ${colCenter},48 ${colCenter + 4},40`} className="fill-green-500" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const ActionMenuMerge: React.FC<{ columns: number }> = ({ columns }) => {
  const colWidth = 200;
  const gap = 16;
  const totalWidth = columns * colWidth + (columns - 1) * gap;
  const center = totalWidth / 2;
  const height = 36;

  return (
    <div className="flex flex-col items-center py-1">
      <svg width={totalWidth} height={height} viewBox={`0 0 ${totalWidth} ${height}`} className="overflow-visible">
        {Array.from({ length: columns }).map((_, i) => {
          const colCenter = i * (colWidth + gap) + colWidth / 2;
          return (
            <path
              key={i}
              d={`M ${colCenter} 0 L ${colCenter} 8 Q ${colCenter} 16 ${colCenter > center ? colCenter - 10 : colCenter < center ? colCenter + 10 : colCenter} 16 L ${colCenter > center ? center + 10 : colCenter < center ? center - 10 : center} 16 Q ${center} 16 ${center} 24 L ${center} 36`}
              stroke="currentColor" className="text-border" strokeWidth="1.5" fill="none"
            />
          );
        })}
        <polygon points={`${center - 4},32 ${center},40 ${center + 4},32`} className="fill-muted-foreground" />
      </svg>
    </div>
  );
};

// ── Recursive Flow Node Renderer ──

interface FlowNodeRendererProps {
  nodes: FlowNode[];
  parentId: string | null;
  branch: 'children' | 'yes_children' | 'no_children';
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onAddChild: (parentId: string | null, branch: 'children' | 'yes_children' | 'no_children', type: NodeType) => void;
  onAddActionChild: (actionMenuNodeId: string, actionId: string, type: NodeType) => void;
  onMoveNode: (nodeId: string, direction: -1 | 1) => void;
  depth: number;
  allNodes: FlowNode[];
}

const FlowNodeRenderer: React.FC<FlowNodeRendererProps> = ({
  nodes, parentId, branch, selectedNodeId, onSelectNode, onAddChild, onAddActionChild, onMoveNode, depth, allNodes,
}) => {
  return (
    <div className="flex flex-col items-center">
      {nodes.map((node, idx) => (
        <div key={node.id} className="flex flex-col items-center">
          {idx > 0 && <VerticalConnector />}

          <NodeCard
            node={node}
            isSelected={selectedNodeId === node.id}
            onClick={() => onSelectNode(selectedNodeId === node.id ? null : node.id)}
            depth={depth}
            allNodes={allNodes}
            onMoveUp={() => onMoveNode(node.id, -1)}
            onMoveDown={() => onMoveNode(node.id, 1)}
            canMoveUp={canNodeMoveUp(allNodes, node.id)}
            canMoveDown={canNodeMoveDown(allNodes, node.id)}
          />

          {/* Decision branching */}
          {node.type === 'decision' && (
            <div className="flex flex-col items-center">
              {/* Fork SVG */}
              <div className="flex flex-col items-center py-1">
                <svg width="300" height="50" viewBox="0 0 300 50" className="overflow-visible">
                  <path d="M 150 0 L 150 12 Q 150 22 140 22 L 80 22 Q 70 22 70 32 L 70 44" stroke="currentColor" className="text-green-500" strokeWidth="1.5" fill="none" />
                  <polygon points="66,40 70,48 74,40" className="fill-green-500" />
                  <text x="95" y="18" className="fill-green-600 dark:fill-green-400" fontSize="10" fontWeight="600">YES</text>
                  <path d="M 150 0 L 150 12 Q 150 22 160 22 L 220 22 Q 230 22 230 32 L 230 44" stroke="currentColor" className="text-red-500" strokeWidth="1.5" fill="none" />
                  <polygon points="226,40 230,48 234,40" className="fill-red-500" />
                  <text x="185" y="18" className="fill-red-600 dark:fill-red-400" fontSize="10" fontWeight="600">NO</text>
                </svg>
              </div>

              {/* Branch columns */}
              <div className="flex gap-8 items-start">
                <div className="flex flex-col items-center min-w-[180px]">
                  <div className="w-full rounded-t border-t-2 border-green-500" />
                  <FlowNodeRenderer nodes={node.yes_children || []} parentId={node.id} branch="yes_children" selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} onAddChild={onAddChild} onAddActionChild={onAddActionChild} onMoveNode={onMoveNode} depth={depth + 1} allNodes={allNodes} />
                  <AddStepButton onAdd={(type) => onAddChild(node.id, 'yes_children', type)} compact={(node.yes_children || []).length === 0} />
                </div>
                <div className="flex flex-col items-center min-w-[180px]">
                  <div className="w-full rounded-t border-t-2 border-red-500" />
                  <FlowNodeRenderer nodes={node.no_children || []} parentId={node.id} branch="no_children" selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} onAddChild={onAddChild} onAddActionChild={onAddActionChild} onMoveNode={onMoveNode} depth={depth + 1} allNodes={allNodes} />
                  <AddStepButton onAdd={(type) => onAddChild(node.id, 'no_children', type)} compact={(node.no_children || []).length === 0} />
                </div>
              </div>

              {/* Merge connector */}
              <div className="flex flex-col items-center py-1">
                <svg width="300" height="36" viewBox="0 0 300 36" className="overflow-visible">
                  <path d="M 70 0 L 70 8 Q 70 16 80 16 L 140 16 Q 150 16 150 24 L 150 36" stroke="currentColor" className="text-border" strokeWidth="1.5" fill="none" />
                  <path d="M 230 0 L 230 8 Q 230 16 220 16 L 160 16 Q 150 16 150 24 L 150 36" stroke="currentColor" className="text-border" strokeWidth="1.5" fill="none" />
                  <polygon points="146,32 150,40 154,32" className="fill-muted-foreground" />
                </svg>
              </div>
            </div>
          )}

          {/* Action Menu branching */}
          {node.type === 'action_menu' && node.actions && (() => {
            const enabledActions = node.actions.filter(a => a.enabled);
            const hasAnyBranch = enabledActions.some(a => (a.children || []).length > 0);
            // Always show fork if there are enabled actions (to allow adding branches)
            if (enabledActions.length > 0) {
              return (
                <div className="flex flex-col items-center">
                  <ActionMenuFork columns={enabledActions.length} />
                  <div className="flex gap-4 items-start">
                    {enabledActions.map(action => (
                      <div key={action.id} className="flex flex-col items-center min-w-[200px]">
                        <div className="w-full rounded-t border-t-2 border-green-500" />
                        <div className="text-[9px] font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-b mb-1 truncate max-w-[180px]">
                          {action.label}
                        </div>
                        <FlowNodeRenderer
                          nodes={action.children || []}
                          parentId={node.id}
                          branch="children"
                          selectedNodeId={selectedNodeId}
                          onSelectNode={onSelectNode}
                          onAddChild={onAddChild}
                          onAddActionChild={onAddActionChild}
                          onMoveNode={onMoveNode}
                          depth={depth + 1}
                          allNodes={allNodes}
                        />
                        <AddStepButton
                          onAdd={(type) => onAddActionChild(node.id, action.id, type)}
                          compact={(action.children || []).length === 0}
                        />
                      </div>
                    ))}
                  </div>
                  <ActionMenuMerge columns={enabledActions.length} />
                </div>
              );
            }
            return null;
          })()}

          {/* Sequential children */}
          {(node.children && node.children.length > 0) && (
            <div className="flex flex-col items-center">
              <VerticalConnector />
              <FlowNodeRenderer
                nodes={node.children}
                parentId={node.id}
                branch="children"
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onAddChild={onAddChild}
                onAddActionChild={onAddActionChild}
                onMoveNode={onMoveNode}
                depth={depth}
                allNodes={allNodes}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Node Editor Panel ──

interface NodeEditorProps {
  node: FlowNode;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<FlowNode>) => void;
  onRemove: (id: string) => void;
  onMoveToTarget: (nodeId: string, target: BranchTarget) => void;
  allNodes: FlowNode[];
}

const NodeEditor: React.FC<NodeEditorProps> = ({ node, onClose, onUpdate, onRemove, onMoveToTarget, allNodes }) => {
  const [moveTarget, setMoveTarget] = useState<string>('');
  const branchTargets = useMemo(() => collectBranchTargets(allNodes, node.id), [allNodes, node.id]);
  const meta = getNodeMeta(node.type);
  const Icon = meta.icon;

  const updateCondition = (condId: string, updates: Partial<FlowCondition>) => {
    onUpdate(node.id, { conditions: node.conditions?.map(c => c.id === condId ? { ...c, ...updates } : c) });
  };
  const addCondition = () => {
    onUpdate(node.id, { conditions: [...(node.conditions || []), { id: `cond_${Date.now()}`, check: '' }] });
  };
  const removeCondition = (condId: string) => {
    onUpdate(node.id, { conditions: node.conditions?.filter(c => c.id !== condId) });
  };

  const updateAction = (actionId: string, updates: Partial<FlowAction>) => {
    onUpdate(node.id, { actions: node.actions?.map(a => a.id === actionId ? { ...a, ...updates } : a) });
  };
  const addAction = () => {
    onUpdate(node.id, { actions: [...(node.actions || []), { id: `action_${Date.now()}`, label: 'New option', enabled: true, children: [] }] });
  };
  const removeAction = (actionId: string) => {
    onUpdate(node.id, { actions: node.actions?.filter(a => a.id !== actionId) });
  };

  const updateDataField = (fieldId: string, updates: Partial<DataField>) => {
    onUpdate(node.id, { data_fields: node.data_fields?.map(f => f.id === fieldId ? { ...f, ...updates } : f) });
  };
  const addDataField = () => {
    onUpdate(node.id, { data_fields: [...(node.data_fields || []), { id: `field_${Date.now()}`, label: '', field_type: 'text' as const, required: true }] });
  };
  const removeDataField = (fieldId: string) => {
    onUpdate(node.id, { data_fields: node.data_fields?.filter(f => f.id !== fieldId) });
  };

  const gotoTargets = useMemo(() => collectAllNodes(allNodes).filter(n => n.id !== node.id), [allNodes, node.id]);

  return (
    <div className="h-full flex flex-col">
      <div className={`flex items-center justify-between p-4 border-b ${meta.bgColor}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${meta.color}`} />
          <span className="font-semibold text-sm">{meta.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onRemove(node.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Node Label</Label>
          <Input value={node.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Node Type</Label>
          <Select value={node.type} onValueChange={(val: NodeType) => onUpdate(node.id, { type: val })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NODE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-1.5"><t.icon className={`h-3.5 w-3.5 ${t.color}`} /> {t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Goto target selector */}
        {node.type === 'goto' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Jump to Node</Label>
            <Select value={node.goto_target || ''} onValueChange={(val) => onUpdate(node.id, { goto_target: val })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select target node…" /></SelectTrigger>
              <SelectContent>
                {gotoTargets.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">The conversation will loop back to this node.</p>
          </div>
        )}

        {node.type !== 'goto' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Instruction</Label>
            <Textarea emojiAutocomplete={false} value={node.instruction} onChange={(e) => onUpdate(node.id, { instruction: e.target.value })} className="min-h-[80px] text-sm" />
          </div>
        )}

        {/* Decision: Conditions */}
        {node.type === 'decision' && (
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground font-medium">Conditions</Label>
            {(node.conditions || []).map((cond) => (
              <div key={cond.id} className="rounded-lg bg-muted/50 border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary shrink-0">IF</span>
                      <Input value={cond.check} onChange={(e) => updateCondition(cond.id, { check: e.target.value })} className="text-sm h-8" placeholder="Condition to check..." />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeCondition(cond.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-xs" onClick={addCondition}>
              <Plus className="h-3 w-3 mr-1" /> Add condition
            </Button>

            <div className="rounded-lg bg-muted/30 border p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                  <ChevronRight className="h-3 w-3" /> YES branch
                </span>
                {' '}— {(node.yes_children || []).length} step(s). Click nodes on the canvas to edit.
              </p>
              <p className="text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                  <ChevronRight className="h-3 w-3" /> NO branch
                </span>
                {' '}— {(node.no_children || []).length} step(s). Click nodes on the canvas to edit.
              </p>
            </div>
          </div>
        )}

        {/* Action Menu */}
        {node.type === 'action_menu' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Menu Items</Label>
            {(node.actions || []).map((action) => (
              <div key={action.id} className="rounded-lg bg-muted/50 border p-2.5 space-y-1.5">
                <div className="flex items-center gap-3">
                  <Switch checked={action.enabled} onCheckedChange={(checked) => updateAction(action.id, { enabled: checked })} />
                  <Input value={action.label} onChange={(e) => updateAction(action.id, { label: e.target.value })} className="text-sm h-8 flex-1" />
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeAction(action.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground pl-12">
                  {(action.children || []).length} step(s) in branch — edit on canvas
                </p>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-xs" onClick={addAction}>
              <Plus className="h-3 w-3 mr-1" /> Add action
            </Button>
          </div>
        )}

        {/* Data Collection */}
        {node.type === 'data_collection' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Fields to Collect</Label>
            {(node.data_fields || []).map((field) => {
              const blockDef = getBlockForFieldType(field.field_type);
              return (
              <div key={field.id} className="rounded-lg bg-muted/50 border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={field.label} onChange={(e) => updateDataField(field.id, { label: e.target.value })} className="text-sm h-8 flex-1" placeholder="Field label..." />
                  <Select value={field.field_type} onValueChange={(val: DataField['field_type']) => updateDataField(field.id, { field_type: val })}>
                    <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Switch checked={field.required} onCheckedChange={(checked) => updateDataField(field.id, { required: checked })} />
                    <span className="text-[10px] text-muted-foreground">Req</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeDataField(field.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input value={field.validation_hint || ''} onChange={(e) => updateDataField(field.id, { validation_hint: e.target.value })} className="text-xs h-7" placeholder="Validation hint..." />

                {/* Registry-driven component info banner */}
                {blockDef && (
                  <div className="rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-2.5 space-y-2">
                    <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">{blockDef.flowMeta.icon} {blockDef.flowMeta.label}</p>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400">{blockDef.flowMeta.description}</p>
                    {blockDef.flowMeta.previewComponent && <blockDef.flowMeta.previewComponent />}
                  </div>
                )}
              </div>
              );
            })}
            <Button variant="ghost" size="sm" className="text-xs" onClick={addDataField}>
              <Plus className="h-3 w-3 mr-1" /> Add field
            </Button>
          </div>
        )}

        {/* Decision — Customer Preview (registry-driven) */}
        {node.type === 'decision' && (() => {
          const decisionDef = getBlockForNodeType('decision');
          if (!decisionDef) return null;
          return (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5 space-y-2">
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">{decisionDef.flowMeta.icon} {decisionDef.flowMeta.label}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">{decisionDef.flowMeta.description}</p>
              {decisionDef.flowMeta.previewComponent && <decisionDef.flowMeta.previewComponent />}
            </div>
          );
        })()}

        {/* Escalation hint */}
        {node.type === 'escalation' && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 space-y-2">
            <p className="text-xs text-red-700 dark:text-red-400">
              When this step is reached, the conversation will be escalated to a human agent.
              Use the instruction above to describe the conditions and message shown to the customer.
            </p>
            <div className="rounded-md bg-white dark:bg-background border p-2">
              <p className="text-[9px] text-muted-foreground font-medium mb-1">Customer sees:</p>
              <div className="flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400 font-medium">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/></svg>
                Connecting to agent...
              </div>
            </div>
          </div>
        )}

        {/* Move Node section */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MoveVertical className="h-3.5 w-3.5" />
            Move Node
          </div>
          <Select value={moveTarget} onValueChange={setMoveTarget}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select destination branch…" />
            </SelectTrigger>
            <SelectContent>
              {branchTargets.map((t, i) => (
                <SelectItem key={`${t.parentId}-${t.branch}-${t.actionId || ''}-${i}`} value={String(i)}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            disabled={moveTarget === ''}
            onClick={() => {
              const target = branchTargets[parseInt(moveTarget)];
              if (target) {
                onMoveToTarget(node.id, target);
                setMoveTarget('');
              }
            }}
          >
            <MoveVertical className="h-3 w-3 mr-1" /> Move
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Relocate this node (and its sub-tree) to another branch.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Props ──

interface AiFlowBuilderProps {
  widgetId: string;
}

// ── Main Component ──

export const AiFlowBuilder: React.FC<AiFlowBuilderProps> = ({ widgetId }) => {
  const [flow, setFlow] = useState<FlowConfig>(DEFAULT_FLOW);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => findNodeInTree(flow.nodes, selectedNodeId || ''), [flow.nodes, selectedNodeId]);

  const totalNodes = useMemo(() => countAllNodes(flow.nodes), [flow.nodes]);

  // Load
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('widget_configs')
        .select('ai_flow_config')
        .eq('id', widgetId)
        .single();
      if (data?.ai_flow_config) {
        const loaded = data.ai_flow_config as unknown as FlowConfig;
        if (loaded.nodes) {
          const ensureType = (nodes: FlowNode[]): FlowNode[] => nodes.map(n => ({
            ...n,
            type: n.type || (n.actions && n.actions.length > 0 ? 'action_menu' : n.conditions && n.conditions.length > 0 ? 'decision' : 'message'),
            children: ensureType(n.children || []),
            yes_children: n.yes_children ? ensureType(n.yes_children) : undefined,
            no_children: n.no_children ? ensureType(n.no_children) : undefined,
            actions: n.actions?.map(a => ({ ...a, children: a.children ? ensureType(a.children) : [] })),
          }));
          loaded.nodes = ensureType(migrateToTree(loaded.nodes));
        }
        setFlow(loaded);
      }
      setLoaded(true);
    }
    load();
  }, [widgetId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase.from('widget_configs').update({ ai_flow_config: flow as any }).eq('id', widgetId);
    setSaving(false);
    if (error) toast.error('Failed to save flow config');
    else toast.success('Flow config saved');
  }, [flow, widgetId]);

  const handleReset = () => { setFlow(DEFAULT_FLOW); setSelectedNodeId(null); toast.info('Flow reset to defaults (save to apply)'); };

  // ── Tree CRUD ──
  const updateNode = (nodeId: string, updates: Partial<FlowNode>) => {
    setFlow(prev => ({ ...prev, nodes: updateNodeInTree(prev.nodes, nodeId, updates) }));
  };

  const removeNode = (nodeId: string) => {
    setFlow(prev => ({ ...prev, nodes: removeNodeFromTree(prev.nodes, nodeId) }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const createNode = (type: NodeType): FlowNode => {
    const meta = getNodeMeta(type);
    return {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      label: type === 'goto' ? 'Go To' : `New ${meta.label}`,
      instruction: '',
      conditions: type === 'decision' ? [{ id: `cond_${Date.now()}`, check: '' }] : undefined,
      actions: type === 'action_menu' ? [{ id: `action_${Date.now()}`, label: 'New option', enabled: true, children: [] }] : undefined,
      data_fields: type === 'data_collection' ? [{ id: `field_${Date.now()}`, label: '', field_type: 'text' as const, required: true }] : undefined,
      children: type === 'goto' ? undefined : [],
      yes_children: type === 'decision' ? [] : undefined,
      no_children: type === 'decision' ? [] : undefined,
      goto_target: type === 'goto' ? undefined : undefined,
    };
  };

  const handleAddChild = (parentId: string | null, branch: 'children' | 'yes_children' | 'no_children', type: NodeType) => {
    const newNode = createNode(type);
    if (parentId) {
      setFlow(prev => ({ ...prev, nodes: addChildToTree(prev.nodes, parentId, branch, newNode) }));
    } else {
      setFlow(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    }
    setSelectedNodeId(newNode.id);
  };

  const handleAddActionChild = (actionMenuNodeId: string, actionId: string, type: NodeType) => {
    const newNode = createNode(type);
    setFlow(prev => ({ ...prev, nodes: addChildToAction(prev.nodes, actionMenuNodeId, actionId, newNode) }));
    setSelectedNodeId(newNode.id);
  };

  const handleMoveNode = (nodeId: string, direction: -1 | 1) => {
    setFlow(prev => ({ ...prev, nodes: moveNode(prev.nodes, nodeId, direction) }));
  };

  const handleMoveToTarget = (nodeId: string, target: BranchTarget) => {
    setFlow(prev => {
      const { updatedTree, detachedNode } = detachNodeFromTree(prev.nodes, nodeId);
      if (!detachedNode) return prev;
      
      if (target.parentId === null) {
        // Move to root
        return { ...prev, nodes: [...updatedTree, detachedNode] };
      }
      
      if (target.branch === 'action' && target.actionId) {
        return { ...prev, nodes: addChildToAction(updatedTree, target.parentId, target.actionId, detachedNode) };
      }
      
      return { ...prev, nodes: addChildToTree(updatedTree, target.parentId, target.branch as 'children' | 'yes_children' | 'no_children', detachedNode) };
    });
  };

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">Loading flow config…</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Conversation Flow</h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{totalNodes} nodes</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {NODE_TYPES.map(t => (
          <div key={t.value} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${t.bgColor}`}>
            <t.icon className={`h-3 w-3 ${t.color}`} />
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-0 border rounded-lg bg-background overflow-hidden" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
        {/* Left: Flow Canvas */}
        <div className="flex-1 overflow-auto bg-muted/30 relative">
          <div className="flex flex-col items-center py-8 px-8 min-h-full">
            {/* Start marker */}
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-green-500 border-2 border-green-600" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Start</span>
            </div>
            <VerticalConnector />

            <FlowNodeRenderer
              nodes={flow.nodes}
              parentId={null}
              branch="children"
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onAddChild={handleAddChild}
              onAddActionChild={handleAddActionChild}
              onMoveNode={handleMoveNode}
              depth={0}
              allNodes={flow.nodes}
            />

            {/* Root add button */}
            {flow.nodes.length > 0 && flow.nodes[flow.nodes.length - 1].children?.length === 0 && (
              <AddStepButton onAdd={(type) => {
                const lastRoot = flow.nodes[flow.nodes.length - 1];
                handleAddChild(lastRoot.id, 'children', type);
              }} />
            )}

            {flow.nodes.length === 0 && (
              <AddStepButton onAdd={(type) => handleAddChild(null, 'children', type)} compact />
            )}

            {/* End marker */}
            <div className="flex items-center gap-2 mt-4">
              <div className="h-3 w-3 rounded-full bg-red-500 border-2 border-red-600" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">End</span>
            </div>
          </div>
        </div>

        {/* Right: Node Editor or General Rules */}
        <div className={`border-l bg-background transition-all duration-200 ${selectedNode ? 'w-[380px]' : 'w-[280px]'} shrink-0 flex flex-col`}>
          {selectedNode ? (
            <NodeEditor
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onUpdate={updateNode}
              onRemove={removeNode}
              onMoveToTarget={handleMoveToTarget}
              allNodes={flow.nodes}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Settings2 className="h-4 w-4" />
                  General Rules
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tone</Label>
                    <Input value={flow.general_rules.tone} onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, tone: e.target.value } }))} placeholder="e.g. Friendly, concise" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max initial lines</Label>
                    <Input type="number" min={1} max={20} value={flow.general_rules.max_initial_lines} onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, max_initial_lines: parseInt(e.target.value) || 4 } }))} className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Language behavior</Label>
                    <Input value={flow.general_rules.language_behavior || ''} onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, language_behavior: e.target.value } }))} placeholder="e.g. Match customer language" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Escalation threshold</Label>
                    <Input type="number" min={1} max={20} value={flow.general_rules.escalation_threshold || 3} onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, escalation_threshold: parseInt(e.target.value) || 3 } }))} className="text-sm" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={flow.general_rules.never_dump_history} onCheckedChange={(checked) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, never_dump_history: checked } }))} />
                    <Label className="text-xs">Never dump full history unprompted</Label>
                  </div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs text-muted-foreground">
                    Click any node in the flowchart to edit its details. Use the <Plus className="h-3 w-3 inline" /> buttons to add steps to any branch.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
