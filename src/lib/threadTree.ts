import { NormalizedMessage } from "@/lib/normalizeMessage";
import { ThreadNode } from "@/types/threading";

/**
 * Build a thread tree from a list of messages using email threading headers
 */
export function buildThreadTree(messages: NormalizedMessage[]): ThreadNode[] {
  const messageMap = new Map<string, ThreadNode>();
  const rootNodes: ThreadNode[] = [];
  
  // First pass: create nodes for all messages
  messages.forEach(message => {
    const node: ThreadNode = {
      message,
      children: [],
      depth: 0,
      isLastInBranch: false,
      hasChildren: false,
    };
    messageMap.set(message.id, node);
  });
  
  // Second pass: build parent-child relationships
  messages.forEach(message => {
    const node = messageMap.get(message.id);
    if (!node) return;
    
    // Try to find parent using email headers (In-Reply-To or References)
    const headers = message.originalMessage?.email_headers || {};
    const inReplyTo = headers['In-Reply-To'] || headers['in-reply-to'];
    const references = headers['References'] || headers['references'];
    
    // Parse references if it's a string
    let referencesArray: string[] = [];
    if (typeof references === 'string') {
      referencesArray = references.split(/\s+/).filter(Boolean);
    } else if (Array.isArray(references)) {
      referencesArray = references;
    }
    
    const parentId = inReplyTo || referencesArray[referencesArray.length - 1];
    
    if (parentId && messageMap.has(parentId)) {
      const parentNode = messageMap.get(parentId)!;
      parentNode.children.push(node);
      parentNode.hasChildren = true;
      node.parentId = parentId;
    } else {
      // No parent found, this is a root message
      rootNodes.push(node);
    }
  });
  
  // Third pass: calculate depths and mark last in branch
  const calculateDepth = (node: ThreadNode, depth: number = 0) => {
    node.depth = depth;
    
    if (node.children.length > 0) {
      node.children.forEach((child, index) => {
        child.isLastInBranch = index === node.children.length - 1;
        calculateDepth(child, depth + 1);
      });
      
      // Sort children by creation time
      node.children.sort((a, b) => 
        new Date(a.message.createdAt).getTime() - new Date(b.message.createdAt).getTime()
      );
    }
  };
  
  rootNodes.forEach(node => calculateDepth(node));
  
  // Sort root nodes by creation time
  rootNodes.sort((a, b) => 
    new Date(a.message.createdAt).getTime() - new Date(b.message.createdAt).getTime()
  );
  
  return rootNodes;
}

/**
 * Flatten thread tree back to a list for chronological view
 */
export function flattenThreadTree(nodes: ThreadNode[]): NormalizedMessage[] {
  const result: NormalizedMessage[] = [];
  
  const traverse = (node: ThreadNode) => {
    result.push(node.message);
    node.children.forEach(traverse);
  };
  
  nodes.forEach(traverse);
  return result;
}

/**
 * Find a node in the tree by message ID
 */
export function findNodeById(nodes: ThreadNode[], messageId: string): ThreadNode | null {
  for (const node of nodes) {
    if (node.message.id === messageId) return node;
    
    const found = findNodeById(node.children, messageId);
    if (found) return found;
  }
  
  return null;
}
