import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInteractionsNavigation } from './useInteractionsNavigation';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
const mockSearchParams = new URLSearchParams();
const mockParams: Record<string, string | undefined> = {};
const mockLocation = { pathname: '/interactions/text/open', hash: '', search: '' };

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

describe('useInteractionsNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('inbox');
    mockSearchParams.delete('q');
    mockSearchParams.delete('m');
    mockSearchParams.delete('tab');
    delete mockParams.conversationId;
    delete mockParams.filter;
    mockParams.filter = 'open';
    mockLocation.pathname = '/interactions/text/open';
    mockLocation.hash = '';
    mockLocation.search = '';
  });

  it('should read URL state correctly from path params', () => {
    mockSearchParams.set('inbox', 'test-inbox');
    mockParams.filter = 'open';
    mockParams.conversationId = 'conv-123';
    mockSearchParams.set('q', 'search-term');
    mockLocation.pathname = '/interactions/text/conversations/conv-123';

    const { result } = renderHook(() => useInteractionsNavigation());

    expect(result.current.currentState.conversationId).toBe('conv-123');
    expect(result.current.currentState.selectedInboxId).toBe('test-inbox');
    expect(result.current.currentState.search).toBe('search-term');
  });

  it('should open conversation via path navigation', () => {
    const { result } = renderHook(() => useInteractionsNavigation());

    act(() => {
      result.current.openConversation('conv-456');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/interactions/text/conversations/conv-456');
  });

  it('should set status and navigate to new path', () => {
    const { result } = renderHook(() => useInteractionsNavigation());

    act(() => {
      result.current.setStatus('pending');
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/interactions/text/pending'),
      { replace: false }
    );
  });

  it('should back to list using navigate(-1)', () => {
    mockParams.conversationId = 'conv-123';
    mockLocation.pathname = '/interactions/text/conversations/conv-123';

    const { result } = renderHook(() => useInteractionsNavigation());

    act(() => {
      result.current.backToList();
    });

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should handle search', () => {
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
