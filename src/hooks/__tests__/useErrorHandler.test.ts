import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useErrorHandler } from '../useErrorHandler'

// Mock the toast hook
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock the logger
const mockLogger = {
  error: vi.fn(),
}
vi.mock('@/utils/logger', () => ({
  logger: mockLogger,
}))

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleError', () => {
    it('should handle Error objects correctly', () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new Error('Test error message')
      
      result.current.handleError(error)
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application error occurred',
        {
          message: 'Test error message',
          stack: error.stack,
          name: 'Error'
        },
        undefined
      )
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Test error message',
        variant: 'destructive',
      })
    })

    it('should handle string errors', () => {
      const { result } = renderHook(() => useErrorHandler())
      
      result.current.handleError('String error message')
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application error occurred',
        'String error message',
        undefined
      )
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'String error message',
        variant: 'destructive',
      })
    })

    it('should handle objects with message property', () => {
      const { result } = renderHook(() => useErrorHandler())
      const errorObj = { message: 'Object error message' }
      
      result.current.handleError(errorObj)
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Object error message',
        variant: 'destructive',
      })
    })

    it('should use fallback message for unknown error types', () => {
      const { result } = renderHook(() => useErrorHandler())
      
      result.current.handleError(null)
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    })

    it('should respect showToast option', () => {
      const { result } = renderHook(() => useErrorHandler())
      
      result.current.handleError('Test error', { showToast: false })
      
      expect(mockLogger.error).toHaveBeenCalled()
      expect(mockToast).not.toHaveBeenCalled()
    })

    it('should use custom title and fallback message', () => {
      const { result } = renderHook(() => useErrorHandler())
      
      result.current.handleError('Test error', {
        title: 'Custom Title',
        fallbackMessage: 'Custom fallback',
      })
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Custom Title',
        description: 'Test error',
        variant: 'destructive',
      })
    })

    it('should include component in logging', () => {
      const { result } = renderHook(() => useErrorHandler())
      
      result.current.handleError('Test error', { component: 'TestComponent' })
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application error occurred',
        'Test error',
        'TestComponent'
      )
    })
  })

  describe('handleAsyncError', () => {
    it('should return result on success', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const asyncFn = vi.fn().mockResolvedValue('success result')
      
      const response = await result.current.handleAsyncError(asyncFn)
      
      expect(response).toBe('success result')
      expect(asyncFn).toHaveBeenCalled()
      expect(mockToast).not.toHaveBeenCalled()
    })

    it('should handle async errors and return null', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new Error('Async error')
      const asyncFn = vi.fn().mockRejectedValue(error)
      
      const response = await result.current.handleAsyncError(asyncFn)
      
      expect(response).toBe(null)
      expect(asyncFn).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Async error',
        variant: 'destructive',
      })
    })

    it('should pass options to handleError for async functions', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new Error('Async error')
      const asyncFn = vi.fn().mockRejectedValue(error)
      
      await result.current.handleAsyncError(asyncFn, {
        title: 'Async Error Title',
        component: 'AsyncComponent'
      })
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application error occurred',
        expect.objectContaining({
          message: 'Async error',
        }),
        'AsyncComponent'
      )
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Async Error Title',
        description: 'Async error',
        variant: 'destructive',
      })
    })
  })
})