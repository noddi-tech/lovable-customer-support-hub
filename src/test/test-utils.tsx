import { ReactElement } from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from testing library
export * from '@testing-library/react'
export { customRender as render }

// Test utilities
export const createMockConversation = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  subject: 'Test Conversation',
  status: 'open' as const,
  priority: 'normal' as const,
  is_read: false,
  is_archived: false,
  channel: 'email' as const,
  updated_at: new Date().toISOString(),
  customer: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    full_name: 'John Doe',
    email: 'john@example.com',
  },
  ...overrides,
})

export const createMockMessage = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174002',
  conversation_id: '123e4567-e89b-12d3-a456-426614174000',
  content: 'Test message content',
  sender_type: 'customer',
  is_internal: false,
  content_type: 'text/plain',
  created_at: new Date().toISOString(),
  attachments: '[]',
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174003',
  email: 'agent@example.com',
  full_name: 'Agent Smith',
  role: 'agent',
  ...overrides,
})