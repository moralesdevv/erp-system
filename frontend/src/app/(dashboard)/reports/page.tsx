'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, Calendar, ShoppingBag, Package, Users, CreditCard, DollarSign, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const monthlyData = [
  { month: 'Jul', sales: 185000, purchases: 120000, profit: 65000 },
  { month: 'Ago', sales: 210000, purchases: 145000, profit: 65000 },
  { month: 'Sep', sales: 195000, purchases: 130000, profit: 65000 },
  { month: 'Oct', sales: 228000, purchases: 155000, profit: 73000 },
  { month: 'Nov', sales: 242000, purchases: 162000, profit: 80000 },
  { month: 'Dic', sales: 285000, purchases: 185000, profit: 100000 },
  { month: 'Ene', sales: 248400, purchases: 168000, profit: 80400 },
];

const REPORT_TYPES = [
  { icon: ShoppingBag, label: 'Ventas', desc: 'Por período, producto, vendedor', color: 'text-primary' },
  { icon: Package, label: 'Inventario', desc: 'Kardex, valorización, movimientos', color: 'text-success' },
  { icon: DollarSign, label: 'Ganancias', desc: 'Margen, utilidad, costo', color: 'text-warning' },
  { icon: Users, label: 'Clientes', desc: 'Frecuencia, ticket promedio', color: 'text-violet-400' },
  { icon: CreditCard, label: 'Créditos', desc: 'Cartera, vencimientos, cobros', color: 'text-pink-400' },
  { icon: BarChart3, label: 'Caja', desc: 'Cortes, apertura, cierre', color: 'text-cyan-400' },
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reportes</h1>
          <p className="text-sm text-muted-foreground">Análisis y exportación de datos</p>
        </div>
        <div className="flex items-center gap-2">
          {['week', 'month', 'quarter', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPeriod === p ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {{ week: 'Semana', month: 'Mes', quarter: 'Trimestre', year: 'Año' }[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Report types grid */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {REPORT_TYPES.map((r) => (
          <motion.button
            key={r.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="glass-card p-4 text-left hover:border-primary/30 transition-all group"
          >
            <r.icon className={`h-5 w-5 ${r.color} mb-2`} />
            <p className="text-sm font-medium text-foreground">{r.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{r.desc}</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Generar <ArrowRight className="h-3 w-3" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Monthly P&L */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ventas vs Compras vs Ganancia</CardTitle>
              <CardDescription>Últimos 7 meses</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: number, n: string) => [formatCurrency(v), { sales: 'Ventas', purchases: 'Compras', profit: 'Ganancia' }[n]]}
              />
              <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" fill="rgba(99,102,241,0.3)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary" />Ventas</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary/30" />Compras</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-success" />Ganancia</div>
          </div>
        </CardContent>
      </Card>

      {/* Export options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Exportar Reportes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Reporte de Ventas', format: 'Excel + PDF' },
              { label: 'Inventario Actual', format: 'Excel' },
              { label: 'Estado de Cuenta Clientes', format: 'PDF' },
              { label: 'Movimientos de Caja', format: 'Excel + PDF' },
            ].map((r) => (
              <button key={r.label} className="glass-card p-4 text-left hover:border-primary/30 transition-all">
                <BarChart3 className="h-4 w-4 text-primary mb-2" />
                <p className="text-xs font-medium text-foreground">{r.label}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">{r.format}</span>
                  <Download className="h-3.5 w-3.5 text-primary" />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
