import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              By accessing and using our customer support platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our platform provides customer support management services, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email integration and synchronization</li>
              <li>Conversation management and organization</li>
              <li>Team collaboration tools</li>
              <li>Customer interaction tracking</li>
              <li>Support ticket management</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>As a user of our service, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete account information</li>
              <li>Maintain the security of your login credentials</li>
              <li>Use the service in compliance with applicable laws</li>
              <li>Respect the privacy and rights of your customers</li>
              <li>Not attempt to disrupt or compromise the service</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              By connecting your email accounts to our platform, you grant us permission to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and sync your email messages</li>
              <li>Send emails on your behalf when requested</li>
              <li>Store email data for conversation management</li>
              <li>Manage email labels and organization</li>
            </ul>
            <p>
              You may revoke these permissions at any time by disconnecting your email accounts from the platform.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Ownership and Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You retain ownership of all data you provide to the service. We will handle your data in accordance with our Privacy Policy and will not use your data for purposes other than providing the service to you.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              While we strive to maintain high service availability, we do not guarantee uninterrupted access to the platform. We may perform maintenance, updates, or experience technical difficulties that temporarily affect service availability.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Our liability for any claims arising from your use of the service is limited to the amount you have paid for the service in the 12 months preceding the claim. We are not liable for any indirect, incidental, or consequential damages.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the platform. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              If you have any questions about these Terms of Service, please contact us at legal@yourcompany.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;