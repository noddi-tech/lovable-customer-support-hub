import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Send, Phone, BarChart3, RefreshCw, Brain, TrendingUp } from 'lucide-react';
import { useOperationsAnalytics } from '@/hooks/useOperationsAnalytics';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const CHANNEL_COLORS: Record<string, string> = {
  email: 'hsl(var(--primary))',
  chat: 'hsl(var(--accent-foreground))',
  widget: '#10b981',
  whatsapp: '#25d366',
  facebook: '#1877f2',
  instagram: '#e4405f',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'hsl(var(--primary))',
  pending: '#f59e0b',
  closed: '#6b7280',
};

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#6b7280',
  negative: '#ef4444',
};

export default function OperationsAnalyticsDashboard() {
  const [periodDays, setPeriodDays] = useState(30);
  const { data, isLoading, isLoadingAI, refetch } = useOperationsAnalytics(periodDays);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance metrics and AI-powered insights</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={periodDays === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodDays(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Messages Received"
          value={data?.messagesReceived ?? 0}
        />
        <KPICard
          icon={<Send className="h-5 w-5" />}
          label="Messages Sent"
          value={data?.messagesSent ?? 0}
        />
        <KPICard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Conversations"
          value={data?.totalConversations ?? 0}
        />
        <KPICard
          icon={<Phone className="h-5 w-5" />}
          label="Total Calls"
          value={data?.totalCalls ?? 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Message Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.dailyVolume && data.dailyVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="received" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Received" />
                  <Line type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} dot={false} name="Sent" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Conversations by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.channelDistribution && data.channelDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.channelDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="channel" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.channelDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={CHANNEL_COLORS[entry.channel] || 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data for this period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status + Sentiment Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Conversations by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.statusDistribution && data.statusDistribution.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="status"
                    >
                      {data.statusDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.statusDistribution.map(entry => (
                    <div key={entry.status} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[entry.status] || '#6b7280' }}
                      />
                      <span className="text-sm capitalize text-foreground">{entry.status}</span>
                      <span className="text-sm font-semibold text-foreground">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* AI Sentiment Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Sentiment Analysis
              {isLoadingAI && <Loader2 className="h-3 w-3 animate-spin" />}
            </CardTitle>
            {data?.aiInsights?.summary && (
              <CardDescription className="text-xs italic">
                "{data.aiInsights.summary}"
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {data?.aiInsights?.sentimentBreakdown ? (
              <div className="space-y-5">
                {/* Percentage bars */}
                <div className="space-y-3">
                  {Object.entries(data.aiInsights.sentimentBreakdown).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-foreground">{key}</span>
                        <span className="font-medium text-foreground">{value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${value}%`,
                            backgroundColor: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS] || '#6b7280',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key Drivers */}
                {data.aiInsights.themes && data.aiInsights.themes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key Drivers</p>
                    <div className="space-y-1.5">
                      {data.aiInsights.themes
                        .filter(t => t.sentiment !== 'neutral')
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5)
                        .map((theme, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor: SENTIMENT_COLORS[theme.sentiment as keyof typeof SENTIMENT_COLORS] || '#6b7280',
                                }}
                              />
                              <span className="text-foreground">{theme.topic}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{theme.count} mentions</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Message count context */}
                {(data.messagesReceived > 0) && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                    Based on {data.messagesReceived.toLocaleString()} customer messages
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {isLoadingAI ? 'Generating AI insights...' : 'No sentiment data available'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      {(data?.aiInsights || isLoadingAI) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Themes */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Top Themes
                {isLoadingAI && <Loader2 className="h-3 w-3 animate-spin" />}
              </CardTitle>
              {data?.aiInsights?.summary && (
                <CardDescription>{data.aiInsights.summary}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {data?.aiInsights?.themes ? (
                <div className="space-y-3">
                  {data.aiInsights.themes.map((theme, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{theme.topic}</span>
                        <Badge
                          variant="outline"
                          className={
                            theme.sentiment === 'positive' ? 'border-green-500/30 text-green-600' :
                            theme.sentiment === 'negative' ? 'border-red-500/30 text-red-600' :
                            'border-border text-muted-foreground'
                          }
                        >
                          {theme.sentiment}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{theme.count} mentions</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isLoadingAI ? 'Analyzing themes...' : 'No theme data'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Common Questions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Common Customer Questions</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.aiInsights?.commonQuestions ? (
                <ul className="space-y-2">
                  {data.aiInsights.commonQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-medium mt-0.5">{idx + 1}.</span>
                      <span className="text-foreground">{q}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isLoadingAI ? 'Extracting questions...' : 'No question data'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
