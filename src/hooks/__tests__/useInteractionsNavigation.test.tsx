import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useInteractionsNavigation } from '../useInteractionsNavigation';

const mockSetSearchParams = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

describe('useInteractionsNavigation', () => {
  beforeEach(() => {
    mockSetSearchParams.mockClear();
    // Clear all URLSearchParams entries manually
    for (const key of Array.from(mockSearchParams.keys())) {
      mockSearchParams.delete(key);
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  it('should return default state when no URL params', () => {
    const { result } = renderHook(() => useInteractionsNavigation(), { wrapper });
    
    expect(result.current.currentState).toEqual({
      selectedTab: 'all',
      selectedInboxId: undefined,
      conversationId: undefined,
      inbox: undefined,
    });
  });

  it('should navigate to conversation', () => {
    const { result } = renderHook(() => useInteractionsNavigation(), { wrapper });
    
    act(() => {
      result.current.navigateToConversation('conv-123');
    });
    
    expect(mockSetSearchParams).toHaveBeenCalled();
  });
});