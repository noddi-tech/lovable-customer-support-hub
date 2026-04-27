import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  data: Array<{ source: string; total: number; hired: number; rate: number }>;
}

export function SourceROIChart({ data }: Props) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Ingen data.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="source" className="text-xs" />
          <YAxis className="text-xs" unit="%" />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            formatter={(value: any, _name: any, p: any) => [`${value}% (${p.payload.hired}/${p.payload.total})`, 'Ansatt-rate']}
          />
          <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
