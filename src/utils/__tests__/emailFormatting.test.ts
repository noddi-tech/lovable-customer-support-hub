import { describe, it, expect } from 'vitest'
import {
  sanitizeEmailHTML,
  shouldRenderAsHTML,
  stripQuotedEmailHTML,
  stripQuotedEmailText,
  extractTextFromHTML,
  formatEmailText
} from '../emailFormatting'

describe('emailFormatting', () => {
  describe('sanitizeEmailHTML', () => {
    it('should remove dangerous script tags', () => {
      const maliciousHTML = '<p>Hello</p><script>alert("xss")</script>'
      const result = sanitizeEmailHTML(maliciousHTML)
      expect(result).toBe('<p>Hello</p>')
      expect(result).not.toContain('script')
    })

    it('should preserve safe HTML elements', () => {
      const safeHTML = '<p>Hello <strong>world</strong></p><br><em>emphasis</em>'
      const result = sanitizeEmailHTML(safeHTML)
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
      expect(result).toContain('<em>')
    })

    it('should remove onclick and other dangerous attributes', () => {
      const maliciousHTML = '<div onclick="alert()">Click me</div>'
      const result = sanitizeEmailHTML(maliciousHTML)
      expect(result).not.toContain('onclick')
    })

    it('should preserve href in links', () => {
      const htmlWithLink = '<a href="https://example.com">Link</a>'
      const result = sanitizeEmailHTML(htmlWithLink)
      expect(result).toContain('href="https://example.com"')
    })
  })

  describe('shouldRenderAsHTML', () => {
    it('should return true for HTML content type with HTML elements', () => {
      const htmlContent = '<p>Hello world</p>'
      const result = shouldRenderAsHTML(htmlContent, 'text/html')
      expect(result).toBe(true)
    })

    it('should return false for plain text content', () => {
      const plainContent = 'Hello world'
      const result = shouldRenderAsHTML(plainContent, 'text/plain')
      expect(result).toBe(false)
    })

    it('should detect HTML in mixed content type', () => {
      const htmlContent = '<div><p>Hello</p></div>'
      const result = shouldRenderAsHTML(htmlContent, 'text/plain')
      expect(result).toBe(true)
    })

    it('should handle multipart content type', () => {
      const htmlContent = '<p>Hello</p>'
      const result = shouldRenderAsHTML(htmlContent, 'multipart/alternative; boundary=something')
      expect(result).toBe(true)
    })
  })

  describe('stripQuotedEmailHTML', () => {
    it('should remove quoted content after Gmail-style divider', () => {
      const emailHTML = `
        <div>New message</div>
        <div class="gmail_quote">
          <div>On Mon, Jan 1, 2024 at 10:00 AM Person wrote:</div>
          <blockquote>Original message</blockquote>
        </div>
      `
      const result = stripQuotedEmailHTML(emailHTML)
      expect(result).toContain('New message')
      expect(result).not.toContain('Original message')
    })

    it('should remove Outlook-style quoted content', () => {
      const emailHTML = `
        <div>New message</div>
        <hr>
        <div>From: someone@example.com</div>
        <div>Original message content</div>
      `
      const result = stripQuotedEmailHTML(emailHTML)
      expect(result).toContain('New message')
      expect(result).not.toContain('Original message content')
    })

    it('should preserve content when no quoted content is detected', () => {
      const emailHTML = '<div>Just a regular message</div>'
      const result = stripQuotedEmailHTML(emailHTML)
      expect(result).toBe(emailHTML)
    })
  })

  describe('stripQuotedEmailText', () => {
    it('should remove quoted content starting with ">"', () => {
      const emailText = `New message here

> Original message
> Second line of original`
      const result = stripQuotedEmailText(emailText)
      expect(result).toContain('New message here')
      expect(result).not.toContain('Original message')
    })

    it('should remove "On ... wrote:" style quotes', () => {
      const emailText = `New message

On Mon, Jan 1, 2024 at 10:00 AM Person <person@example.com> wrote:
Original message content`
      const result = stripQuotedEmailText(emailText)
      expect(result).toContain('New message')
      expect(result).not.toContain('Original message content')
    })

    it('should preserve text when no quoted content', () => {
      const emailText = 'Just a regular message'
      const result = stripQuotedEmailText(emailText)
      expect(result).toBe(emailText)
    })
  })

  describe('extractTextFromHTML', () => {
    it('should extract plain text from HTML', () => {
      const html = '<p>Hello <strong>world</strong></p><br><em>test</em>'
      const result = extractTextFromHTML(html)
      expect(result).toBe('Hello world\ntest')
    })

    it('should handle empty or invalid HTML', () => {
      expect(extractTextFromHTML('')).toBe('')
      expect(extractTextFromHTML('<>')).toBe('')
    })

    it('should preserve line breaks', () => {
      const html = '<div>Line 1</div><div>Line 2</div>'
      const result = extractTextFromHTML(html)
      expect(result).toContain('Line 1')
      expect(result).toContain('Line 2')
    })
  })

  describe('formatEmailText', () => {
    it('should preserve formatting for plain text', () => {
      const text = 'Hello\nworld\n\nNew paragraph'
      const result = formatEmailText(text)
      expect(result).toBe(text)
    })

    it('should handle empty text', () => {
      const result = formatEmailText('')
      expect(result).toBe('')
    })

    it('should trim whitespace', () => {
      const text = '  Hello world  \n  '
      const result = formatEmailText(text)
      expect(result).toBe('Hello world')
    })
  })
})