import React from 'react';
import { Phone, PhoneCall, PhoneOff, PhoneMissed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CallStatsSummaryProps {
  callsByStatus: Record<string, number>;
  activeCalls: number;
}

export const CallStatsSummary: React.FC<CallStatsSummaryProps> = ({ 
  callsByStatus, 
  activeCalls 
}) => {
  const stats = [
    {
      title: 'Active Calls',
      value: activeCalls,
      icon: PhoneCall,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Missed Calls',
      value: callsByStatus.missed || 0,
      icon: PhoneMissed,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Completed',
      value: callsByStatus.completed || 0,
      icon: PhoneOff,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      title: 'Total Today',
      value: Object.values(callsByStatus).reduce((a, b) => a + b, 0),
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};