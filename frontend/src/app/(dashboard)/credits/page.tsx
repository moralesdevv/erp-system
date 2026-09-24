'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, AlertTriangle, CheckCircle, Clock, DollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

const DEMO_CREDITS = [
  { id: '1', customer: 'Carlos Mendez', amount: 1200, balance: 1200, dueDate: new Date(Date.now() - 5 * 86400000), status: 'OVERDUE', sale: 'VTA-2024-000890' },
  { id: '2', customer: 'Juan López', amount: 2000, balance: 2000, dueDate: new Date(Date.now() - 15 * 86400000), status: 'OVERDUE', sale: 'VTA-2024-000754' },
  { id: '3', customer: 'Pedro Hernández', amount: 1500, balance: 500, dueDate: new Date(Date.now() + 10 * 86400000), status: 'ACTIVE', sale: 'VTA-2024-001000' },
  { id: '4', customer: 'Laura Torres', amount: 800, balance: 800, dueDate: new Date(Date.now() + 2 * 86400000), status: 'ACTIVE', sale: 'VTA-2024-001010' },
  { id: '5', customer: 'Diego Ramos', amount: 3000, balance: 0, dueDate: new Date(Date.now() - 30 * 86400000), status: 'PAID', sale: 'VTA-2024-000620' },
];

const STATUS_CONFIG = {
  OVERDUE: { label: 'Vencido', variant: 'destructive' as const, icon: AlertTriangle },
  ACTIVE: { label: 'Activo', variant: 'default' as const, icon: Clock },
  PAID: { label: 'Pagado', variant: 'success' as const, icon: CheckCircle },
};

export default function CreditsPage() {
  const totalBalance = DEMO_CREDITS.filter((c) => c.status !== 'PAID').reduce((s, c) => s + c.balance, 0);
  const overdueBalance = DEMO_CREDITS.filter((c) => c.status === 'OVERDUE').reduce((s, c) => s + c.balance, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Créditos</h1>
          <p className="text-sm text-muted-foreground">Control de cuentas por cobrar</p>
        </div>
      </div>

      {/* Aging summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Saldo Total', value: formatCurrency(totalBalance), color: 'text-primary', icon: DollarSign },
          { label: 'Vencido', value: formatCurrency(overdueBalance), color: 'text-destructive', icon: AlertTriangle },
          { label: 'Créditos Activos', value: '14', color: 'text-foreground', icon: CreditCard },
          { label: 'Cobrado Este Mes', value: formatCurrency(12400), color: 'text-success', icon: CheckCircle },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aging buckets */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Al Corriente', range: 'Sin vencer', amount: 3300, count: 3 },
          { label: '1 - 30 días', range: 'Vencido', amount: 1200, count: 1 },
          { label: '31 - 60 días', range: 'Vencido', amount: 800, count: 1 },
          { label: '+90 días', range: 'Vencido', amount: 2000, count: 2 },
        ].map((b, i) => (
          <Card key={b.label} className={i > 0 ? 'border-destructive/20' : ''}>
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{b.range}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{b.label}</p>
              <p className={`text-xl font-bold tabular-nums mt-1 ${i > 0 ? 'text-destructive' : 'text-success'}`}>
                {formatCurrency(b.amount)}
              </p>
              <p className="text-[10px] text-muted-foreground">{b.count} créditos</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Créditos Pendientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {['Cliente', 'Venta', 'Monto', 'Saldo', 'Vencimiento', 'Estado', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_CREDITS.map((c, i) => {
                const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/30 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{c.customer}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{c.sale}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(c.amount)}</td>
                    <td className="px-4 py-3 font-bold tabular-nums text-foreground">{formatCurrency(c.balance)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.dueDate)}</td>
                    <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3">
                      {c.status !== 'PAID' && (
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          <Plus className="h-3 w-3" /> Cobrar
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
