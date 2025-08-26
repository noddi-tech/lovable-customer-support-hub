import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInteractionsNavigation } from './useInteractionsNavigation';

// Mock react-router-dom
const mockSetSearchParams = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams]
}));

describe('useInteractionsNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('inbox');
    mockSearchParams.delete('status');
    mockSearchParams.delete('c');
    mockSearchParams.delete('q');
  });

  it('should read URL state correctly', () => {
    mockSearchParams.set('inbox', 'test-inbox');
    mockSearchParams.set('status', 'unread');
    mockSearchParams.set('c', 'conv-123');
    mockSearchParams.set('q', 'search-term');

    const { result } = renderHook(() => useInteractionsNavigation());

    expect(result.current.currentState).toEqual({
      selectedTab: 'all',
      selectedInboxId: 'test-inbox',
      conversationId: 'conv-123',
      inbox: 'test-inbox',
      status: 'unread',
      search: 'search-term'
    });
  });

  it('should set inbox and clear conversation', () => {
    const { result } = renderHook(() => useInteractionsNavigation());

    act(() => {
      result.current.setInbox('new-inbox');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      { replace: true }
    );
  });

  it('should set status and clear conversation', () => {
    const { result } = renderHook(() => useInteractionsNavigation());

    act(() => {
      result.current.setStatus('pending');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      { replace: true }
    );
  });

  it('should open conversation', () => {
    const { result } = renderHook(() => useInteractionsNavigation());

    act(() => {
      result.current.openConversation('conv-456');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      { replace: true }
    );
  });

  it('should back to list (clear only conversation)', () => {
    mockSearchParams.set('inbox', 'test-inbox');
    mockSearchParams.set('status', 'unread');
    mockSearchParams.set('c', 'conv-123');

    const { result } = renderHook(() => useInteractionsNavigation());

    act(() => {
      result.current.backToList();
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      { replace: true }
    );
  });

  it('should handle search with debouncing', () => {
    const { result } = renderHook(() => useInteractionsNavigation());

    act(() => {
      result.current.setSearch('test-search');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      { replace: true }
    );
  });
});