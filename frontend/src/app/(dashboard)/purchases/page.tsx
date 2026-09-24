'use client';

import { motion } from 'framer-motion';
import { Plus, Truck, CheckCircle, Clock, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

const DEMO_PURCHASES = [
  { id: '1', number: 'OC-2024-00045', supplier: 'Distribuidora XYZ', items: 8, total: 12400, status: 'RECEIVED', createdAt: new Date(Date.now() - 86400000 * 2), receivedAt: new Date(Date.now() - 86400000) },
  { id: '2', number: 'OC-2024-00044', supplier: 'Importaciones ABC', items: 3, total: 5800, status: 'ORDERED', createdAt: new Date(Date.now() - 86400000 * 1), receivedAt: null },
  { id: '3', number: 'OC-2024-00043', supplier: 'Proveedor Nacional', items: 12, total: 28900, status: 'RECEIVED', createdAt: new Date(Date.now() - 86400000 * 5), receivedAt: new Date(Date.now() - 86400000 * 3) },
  { id: '4', number: 'OC-2024-00042', supplier: 'Distribuidora XYZ', items: 4, total: 8200, status: 'DRAFT', createdAt: new Date(), receivedAt: null },
];

const STATUS_CONFIG = {
  DRAFT: { label: 'Borrador', variant: 'muted' as const, icon: FileText },
  ORDERED: { label: 'Ordenado', variant: 'default' as const, icon: Clock },
  RECEIVED: { label: 'Recibido', variant: 'success' as const, icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' as const, icon: Clock },
};

export default function PurchasesPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Compras</h1>
          <p className="text-sm text-muted-foreground">Órdenes de compra y proveedores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Exportar</Button>
          <Button size="sm"><Plus className="h-4 w-4" /> Nueva Orden</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Órdenes Este Mes', value: '23', icon: FileText },
          { label: 'Pendientes', value: '5', icon: Clock },
          { label: 'Total Comprado', value: formatCurrency(184200), icon: Truck },
          { label: 'Proveedores', value: '18', icon: Truck },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Órdenes de Compra</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {['Número', 'Proveedor', 'Items', 'Total', 'Estado', 'Fecha', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_PURCHASES.map((p, i) => {
                const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG];
                return (
                  <motion.tr key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.number}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.supplier}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{p.items}</td>
                    <td className="px-4 py-3 font-bold text-foreground tabular-nums">{formatCurrency(p.total)}</td>
                    <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      {p.status === 'ORDERED' && (
                        <Button size="sm" className="text-xs h-7">
                          <CheckCircle className="h-3 w-3" /> Recibir
                        </Button>
                      )}
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
