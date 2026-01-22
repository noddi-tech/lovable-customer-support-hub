/**
 * Branded types for database IDs to prevent misuse
 * 
 * ProfileId: The primary key of the profiles table (uuid)
 * AuthUserId: The user ID from Supabase Auth service (uuid)
 * 
 * These are structurally identical but semantically different.
 * Using branded types prevents accidentally passing one where the other is expected.
 * 
 * USAGE GUIDE:
 * - Use ProfileId for foreign key references (assigned_to_id, created_by_id, etc.)
 * - Use AuthUserId for auth.uid() comparisons and RLS policies
 * - The profiles table has both: id (ProfileId) and user_id (AuthUserId)
 */

// Brand symbol for compile-time type safety
declare const __brand: unique symbol;

type Brand<T, B> = T & { readonly [__brand]: B };

/** 
 * Primary key of profiles table - USE THIS for foreign key references
 * Examples: conversations.assigned_to_id, internal_events.assigned_to_id
 */
export type ProfileId = Brand<string, 'ProfileId'>;

/** 
 * Auth service user ID - use for auth.uid() comparisons
 * This is what Supabase Auth returns from auth.getUser()
 */
export type AuthUserId = Brand<string, 'AuthUserId'>;

/** Organization ID - primary key of organizations table */
export type OrganizationId = Brand<string, 'OrganizationId'>;

/** Customer ID - primary key of customers table */
export type CustomerId = Brand<string, 'CustomerId'>;

/** Conversation ID - primary key of conversations table */
export type ConversationId = Brand<string, 'ConversationId'>;

// Type guard helpers for runtime validation and casting
// Use these when you have a raw string from an API or database

export function asProfileId(id: string): ProfileId {
  return id as ProfileId;
}

export function asAuthUserId(id: string): AuthUserId {
  return id as AuthUserId;
}

export function asOrganizationId(id: string): OrganizationId {
  return id as OrganizationId;
}

export function asCustomerId(id: string): CustomerId {
  return id as CustomerId;
}

export function asConversationId(id: string): ConversationId {
  return id as ConversationId;
}

// Optional type for assignment fields that can be null/empty
export type OptionalProfileId = ProfileId | null | undefined | '';
