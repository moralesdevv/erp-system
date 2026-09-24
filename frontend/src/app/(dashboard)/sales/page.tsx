'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Filter, Download, Eye, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';

const DEMO_SALES = [
  { id: '1', number: 'VTA-2024-001023', customer: 'Carlos Mendez', user: 'Ana R.', total: 485.50, items: 3, method: 'CASH', status: 'COMPLETED', createdAt: new Date() },
  { id: '2', number: 'VTA-2024-001022', customer: null, user: 'Luis G.', total: 1200.00, items: 8, method: 'CARD', status: 'COMPLETED', createdAt: new Date(Date.now() - 300000) },
  { id: '3', number: 'VTA-2024-001021', customer: 'Ana García', user: 'Ana R.', total: 350.75, items: 2, method: 'CREDIT', status: 'COMPLETED', createdAt: new Date(Date.now() - 600000) },
  { id: '4', number: 'VTA-2024-001020', customer: null, user: 'Luis G.', total: 89.00, items: 1, method: 'CASH', status: 'VOIDED', createdAt: new Date(Date.now() - 900000) },
  { id: '5', number: 'VTA-2024-001019', customer: 'Juan López', user: 'Ana R.', total: 2100.00, items: 12, method: 'CASH', status: 'COMPLETED', createdAt: new Date(Date.now() - 1200000) },
];

const METHOD_LABELS: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', CREDIT: 'Crédito' };
const STATUS_CONFIG = {
  COMPLETED: { label: 'Completada', variant: 'success' as const },
  VOIDED: { label: 'Anulada', variant: 'destructive' as const },
};

export default function SalesPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ventas</h1>
          <p className="text-sm text-muted-foreground">Historial de transacciones</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Exportar</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Ventas Hoy', value: '87', sub: formatCurrency(14520) },
          { label: 'Este Mes', value: '1,248', sub: formatCurrency(248400) },
          { label: 'Anuladas Hoy', value: '2', sub: '' },
          { label: 'Promedio', value: formatCurrency(166.90), sub: 'por transacción' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold text-foreground tabular-nums mt-1">{s.value}</p>
              {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3">
            <Input className="max-w-xs" placeholder="Buscar por número o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button variant="outline" size="sm"><Filter className="h-4 w-4" /> Filtros</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {['#', 'Cliente', 'Cajero', 'Items', 'Método', 'Total', 'Estado', 'Fecha', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_SALES.map((s, i) => {
                const cfg = STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG];
                return (
                  <motion.tr key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.number}</td>
                    <td className="px-4 py-3 text-foreground">{s.customer || 'Cliente general'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.user}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{s.items}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{METHOD_LABELS[s.method]}</td>
                    <td className="px-4 py-3 font-bold text-foreground tabular-nums">{formatCurrency(s.total)}</td>
                    <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(s.createdAt, 'medium')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm"><Eye className="h-3.5 w-3.5" /></Button>
                        {s.status === 'COMPLETED' && <Button variant="ghost" size="icon-sm"><Ban className="h-3.5 w-3.5 text-destructive" /></Button>}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
