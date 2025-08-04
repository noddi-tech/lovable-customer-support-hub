// Test script to verify webhook works
// Run this with: node test-webhook.js

const webhookUrl = 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/email-webhook';

const testEmail = {
  from: 'test@example.com',
  to: 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/email-webhook',
  subject: 'Test Email from Webhook',
  text: 'This is a test email to verify the webhook is working correctly.',
  messageId: 'test-message-' + Date.now()
};

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testEmail)
})
.then(response => response.json())
.then(data => {
  console.log('Webhook response:', data);
})
.catch(error => {
  console.error('Error:', error);
});