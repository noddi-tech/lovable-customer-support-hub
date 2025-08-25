import React from 'react';
import { InboxLayout } from '@/components/layout/InboxLayout';
import { ResponsiveGrid, LayoutItem } from '@/components/admin/design/components/layouts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Send, Edit, Calendar, Users, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Mock data for newsletters
const mockNewsletters = [
  {
    id: 'newsletter1',
    title: 'Weekly Product Updates - March 2025',
    subtitle: 'New features, bug fixes, and upcoming releases • 2,340 subscribers',
    status: 'draft' as const,
    priority: 'normal' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 2 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'newsletter2',
    title: 'Black Friday Sale Campaign',
    subtitle: 'Limited time offers and exclusive discounts • 5,670 subscribers',
    status: 'scheduled' as const,
    priority: 'high' as const,
    timestamp: 'Scheduled for tomorrow 9:00 AM'
  },
  {
    id: 'newsletter3',
    title: 'Customer Success Stories',
    subtitle: 'Featuring testimonials and case studies • 3,890 subscribers',
    status: 'sent' as const,
    priority: 'normal' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'newsletter4',
    title: 'API Updates & Developer News',
    subtitle: 'Technical updates for developers • 1,250 subscribers',
    status: 'draft' as const,
    priority: 'low' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'newsletter5',
    title: 'Monthly Security Update',
    subtitle: 'Important security patches and best practices • 4,560 subscribers',
    status: 'sent' as const,
    priority: 'high' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), { addSuffix: true })
  }
];

// Mock newsletter details
const mockNewsletterDetails = {
  'newsletter1': {
    title: 'Weekly Product Updates - March 2025',
    subject: 'Exciting New Features This Week!',
    status: 'draft',
    subscribers: 2340,
    created: '2 hours ago',
    lastModified: '30 minutes ago',
    author: 'Marketing Team',
    content: `
      <h2>What's New This Week</h2>
      <p>Dear valued customers,</p>
      <p>We're excited to share the latest updates and improvements to our platform:</p>
      
      <h3>🚀 New Features</h3>
      <ul>
        <li>Enhanced dashboard with real-time analytics</li>
        <li>Advanced filtering options for data views</li>
        <li>Mobile app performance improvements</li>
      </ul>
      
      <h3>🐛 Bug Fixes</h3>
      <ul>
        <li>Resolved login issues on Safari browsers</li>
        <li>Fixed export functionality for large datasets</li>
        <li>Improved notification delivery reliability</li>
      </ul>
      
      <h3>📅 Coming Soon</h3>
      <p>Stay tuned for our upcoming dark mode feature and API v2.0 release!</p>
    `,
    analytics: {
      opens: 0,
      clicks: 0,
      unsubscribes: 0,
      bounces: 0
    }
  },
  'newsletter2': {
    title: 'Black Friday Sale Campaign',
    subject: '🔥 Black Friday Sale - Up to 50% Off!',
    status: 'scheduled',
    subscribers: 5670,
    created: '1 day ago',
    lastModified: '2 hours ago',
    author: 'Sales Team',
    content: `
      <h2>Black Friday Exclusive Deals</h2>
      <p>The biggest sale of the year is here!</p>
      
      <h3>🎯 Limited Time Offers</h3>
      <ul>
        <li>Premium Plan: 50% off first year</li>
        <li>Enterprise Solutions: Custom pricing</li>
        <li>Add-on Services: 30% off</li>
      </ul>
      
      <p><strong>Sale ends November 30th - Don't miss out!</strong></p>
    `,
    analytics: {
      opens: 0,
      clicks: 0,
      unsubscribes: 0,
      bounces: 0
    }
  },
  'newsletter3': {
    title: 'Customer Success Stories',
    subject: 'How Our Customers Are Winning',
    status: 'sent',
    subscribers: 3890,
    created: '4 days ago',
    lastModified: '3 days ago',
    author: 'Customer Success Team',
    content: `
      <h2>Success Stories</h2>
      <p>See how our customers are achieving amazing results:</p>
      
      <h3>🏆 Case Study: TechCorp Inc.</h3>
      <p>Increased productivity by 300% using our automation features.</p>
      
      <h3>🎉 Testimonial: StartupXYZ</h3>
      <p>"This platform transformed our workflow completely!" - CEO</p>
    `,
    analytics: {
      opens: 2847,
      clicks: 456,
      unsubscribes: 23,
      bounces: 89
    }
  }
};

const NewsletterManagementPage: React.FC = () => {
  const renderDetail = (newsletterId: string) => {
    const newsletter = mockNewsletterDetails[newsletterId as keyof typeof mockNewsletterDetails];
    
    if (!newsletter) {
      return <div className="text-center py-8 text-muted-foreground">Newsletter details not found.</div>;
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
        case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      }
    };

    return (
      <div className="max-w-4xl mx-auto">
        <ResponsiveGrid cols={{ sm: '1' }} gap="6">
          {/* Newsletter Overview */}
          <LayoutItem>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{newsletter.title}</h3>
                    <p className="text-muted-foreground">{newsletter.subject}</p>
                  </div>
                  <Badge className={getStatusColor(newsletter.status)}>
                    {newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subscribers</p>
                    <p className="text-foreground font-semibold">{newsletter.subscribers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-foreground">{newsletter.created}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Modified</p>
                    <p className="text-foreground">{newsletter.lastModified}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Author</p>
                    <p className="text-foreground">{newsletter.author}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </LayoutItem>

          {/* Actions */}
          <LayoutItem>
            <Card>
              <CardHeader>
                <h4 className="font-semibold text-foreground">Actions</h4>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Newsletter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  {newsletter.status === 'draft' && (
                    <>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>
                      <Button variant="default" size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Send Now
                      </Button>
                    </>
                  )}
                  {newsletter.status === 'sent' && (
                    <Button variant="outline" size="sm">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </LayoutItem>

          {/* Analytics (for sent newsletters) */}
          {newsletter.status === 'sent' && (
            <LayoutItem>
              <Card>
                <CardHeader>
                  <h4 className="font-semibold text-foreground">Performance Analytics</h4>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{newsletter.analytics.opens.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Opens</div>
                      <div className="text-xs text-muted-foreground">
                        {((newsletter.analytics.opens / newsletter.subscribers) * 100).toFixed(1)}% rate
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{newsletter.analytics.clicks.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Clicks</div>
                      <div className="text-xs text-muted-foreground">
                        {((newsletter.analytics.clicks / newsletter.analytics.opens) * 100).toFixed(1)}% CTR
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">{newsletter.analytics.unsubscribes}</div>
                      <div className="text-sm text-muted-foreground">Unsubscribes</div>
                      <div className="text-xs text-muted-foreground">
                        {((newsletter.analytics.unsubscribes / newsletter.subscribers) * 100).toFixed(2)}% rate
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{newsletter.analytics.bounces}</div>
                      <div className="text-sm text-muted-foreground">Bounces</div>
                      <div className="text-xs text-muted-foreground">
                        {((newsletter.analytics.bounces / newsletter.subscribers) * 100).toFixed(2)}% rate
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </LayoutItem>
          )}

          {/* Content Preview */}
          <LayoutItem>
            <Card>
              <CardHeader>
                <h4 className="font-semibold text-foreground">Content Preview</h4>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: newsletter.content }}
                  />
                </div>
              </CardContent>
            </Card>
          </LayoutItem>
        </ResponsiveGrid>
      </div>
    );
  };

  const handleReply = (newsletterId: string, message: string) => {
    console.log('Adding note to newsletter:', newsletterId, 'Message:', message);
    // Here you would typically save the note to your backend
  };

  return (
    <InboxLayout
      conversations={mockNewsletters}
      renderDetail={renderDetail}
      title="Newsletter Management"
      onReply={handleReply}
      showReplyBox={true}
    />
  );
};

export default NewsletterManagementPage;