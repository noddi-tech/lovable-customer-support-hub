import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VolumeDataPoint {
  date: string;
  inbound: number;
  outbound: number;
  missed: number;
}

interface CallVolumeChartProps {
  data: VolumeDataPoint[];
  showTrends?: boolean;
}

export const CallVolumeChart = ({ data, showTrends = false }: CallVolumeChartProps) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call Volume</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {showTrends ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line 
                dataKey="inbound" 
                stroke="hsl(var(--success))"
                name="Inbound"
                strokeWidth={2}
              />
              <Line 
                dataKey="outbound" 
                stroke="hsl(var(--primary))"
                name="Outbound"
                strokeWidth={2}
              />
              <Line 
                dataKey="missed" 
                stroke="hsl(var(--destructive))"
                name="Missed"
                strokeWidth={2}
              />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="inbound" 
                fill="hsl(var(--success))"
                name="Inbound"
              />
              <Bar 
                dataKey="outbound" 
                fill="hsl(var(--primary))"
                name="Outbound"
              />
              <Bar 
                dataKey="missed" 
                fill="hsl(var(--destructive))"
                name="Missed"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
