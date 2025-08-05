import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-primary">Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              When you use our customer support platform, we collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (name, email address, organization details)</li>
              <li>Email account connections and authentication tokens</li>
              <li>Communication data from connected email accounts</li>
              <li>Customer interaction history and support tickets</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-primary">How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our customer support services</li>
              <li>Sync and manage your email communications</li>
              <li>Enable team collaboration and assignment features</li>
              <li>Improve our service and develop new features</li>
              <li>Communicate with you about your account and our services</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-primary">Information Sharing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With your organization members who have appropriate access permissions</li>
              <li>With service providers who assist in operating our platform</li>
              <li>When required by law or to protect our rights and safety</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-primary">Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encrypted data transmission and storage</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure handling of email authentication tokens</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-primary">Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Disconnect email accounts at any time</li>
              <li>Export your data in a portable format</li>
              <li>Object to certain uses of your information</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="text-primary">Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@yourcompany.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;