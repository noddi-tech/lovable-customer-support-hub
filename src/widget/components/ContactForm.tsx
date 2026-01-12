import React, { useState } from 'react';
import { submitContactForm } from '../api';

interface ContactFormProps {
  widgetKey: string;
  primaryColor: string;
  onSuccess: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  widgetKey,
  primaryColor,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    const result = await submitContactForm({
      widgetKey,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      pageUrl: window.location.href,
    });
    
    setIsSubmitting(false);
    
    if (result.success) {
      setName('');
      setEmail('');
      setMessage('');
      onSuccess();
    } else {
      setError(result.error || 'Failed to send message');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="noddi-widget-form">
      <div className="noddi-widget-field">
        <label htmlFor="noddi-name">Name</label>
        <input
          id="noddi-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          disabled={isSubmitting}
        />
      </div>
      
      <div className="noddi-widget-field">
        <label htmlFor="noddi-email">Email</label>
        <input
          id="noddi-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          maxLength={255}
          disabled={isSubmitting}
        />
      </div>
      
      <div className="noddi-widget-field">
        <label htmlFor="noddi-message">Message</label>
        <textarea
          id="noddi-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          rows={4}
          maxLength={2000}
          disabled={isSubmitting}
        />
      </div>
      
      {error && (
        <div className="noddi-widget-error">{error}</div>
      )}
      
      <button
        type="submit"
        className="noddi-widget-submit"
        style={{ backgroundColor: primaryColor }}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
};
