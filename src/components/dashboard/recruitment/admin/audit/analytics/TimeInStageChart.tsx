import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  data: Array<{ stage: string; avgDays: number }>;
}

export function TimeInStageChart({ data }: Props) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Ingen data.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="stage" className="text-xs" />
          <YAxis className="text-xs" unit="d" />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            formatter={(value: any) => [`${value} dager`, 'Snitt']}
          />
          <Bar dataKey="avgDays" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
