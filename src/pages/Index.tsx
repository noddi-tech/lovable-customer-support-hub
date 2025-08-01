import React, { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight, Shield, Zap, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      // Don't redirect immediately, show landing page first
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Temporarily show dashboard for development (bypass auth)
  // Comment out the auth check to view inbox without logging in
  // if (user) {
    return <Dashboard />;
  // }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-surface border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-10 w-10 text-primary-foreground" />
            </div>
            
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Customer Support Hub
              <span className="block text-primary mt-2">Version 1</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Unified customer support platform for multi-tenant organizations. 
              Aggregate communications from email, Facebook, Instagram, and WhatsApp 
              with intelligent routing and collaboration tools.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-gradient-primary hover:bg-primary-hover text-primary-foreground px-8 py-3"
                size="lg"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-3"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Multi-Tenant Support Platform
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built for organizations like Noddi, Hurtigruta, and Shine with complete data isolation and intelligent routing.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-surface">
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Multi-Tenant Architecture</CardTitle>
              <CardDescription>
                Complete data isolation between organizations with role-based access control and department-level routing.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-surface">
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Unified Inbox</CardTitle>
              <CardDescription>
                Aggregate all customer communications from email, Facebook Messenger, Instagram DMs, and WhatsApp in one place.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-surface">
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Intelligent Routing</CardTitle>
              <CardDescription>
                Automatically route conversations to the correct organization and department based on customer data integration.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Organizations Section */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Supported Organizations
            </h2>
            <p className="text-muted-foreground">
              Currently configured for these service organizations with more coming soon.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-blue-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold">N</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Noddi</h3>
                <p className="text-sm text-muted-foreground">Customer & Technical Support</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-green-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold">H</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Hurtigruta</h3>
                <p className="text-sm text-muted-foreground">Booking & Travel Support</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Shine</h3>
                <p className="text-sm text-muted-foreground">Account & Product Support</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Ready to streamline your customer support?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Sign up now to access your organization's unified support dashboard with intelligent routing and real-time collaboration.
        </p>
        <Button 
          onClick={() => navigate('/auth')}
          className="bg-gradient-primary hover:bg-primary-hover text-primary-foreground px-8 py-3"
          size="lg"
        >
          Start Now
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
