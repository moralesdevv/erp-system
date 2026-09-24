'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  Users, CreditCard, AlertTriangle, DollarSign,
  ArrowUpRight, MoreHorizontal, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatDate, formatPercent } from '@/lib/utils';

// ─── Demo data (replace with API calls) ─────────────────────────────────────

const revenueTrend = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  revenue: 3000 + Math.random() * 5000 + (i > 20 ? 2000 : 0),
  count: Math.floor(10 + Math.random() * 30),
}));

const topProducts = [
  { product: { name: 'Coca-Cola 500ml' }, totalRevenue: 12450, totalSold: 890 },
  { product: { name: 'Agua Pura 1L' }, totalRevenue: 8200, totalSold: 1200 },
  { product: { name: 'Pan Bimbo' }, totalRevenue: 6100, totalSold: 520 },
  { product: { name: 'Pepsi 355ml' }, totalRevenue: 5300, totalSold: 680 },
  { product: { name: 'Doritos Original' }, totalRevenue: 4100, totalSold: 340 },
];

const paymentMethodData = [
  { name: 'Efectivo', value: 65, color: '#6366f1' },
  { name: 'Tarjeta', value: 25, color: '#8b5cf6' },
  { name: 'Crédito', value: 10, color: '#ec4899' },
];

const branchData = [
  { name: 'Sucursal Central', revenue: 45000, sales: 320 },
  { name: 'Sucursal Norte', revenue: 28000, sales: 210 },
  { name: 'Sucursal Sur', revenue: 19000, sales: 155 },
];

const recentSales = [
  { number: 'VTA-2024-001023', customer: 'Carlos Mendez', total: 485.50, status: 'COMPLETED', createdAt: new Date() },
  { number: 'VTA-2024-001022', customer: 'Ana García', total: 1200.00, status: 'COMPLETED', createdAt: new Date(Date.now() - 300000) },
  { number: 'VTA-2024-001021', customer: 'Juan López', total: 350.75, status: 'COMPLETED', createdAt: new Date(Date.now() - 600000) },
  { number: 'VTA-2024-001020', customer: null, total: 89.00, status: 'COMPLETED', createdAt: new Date(Date.now() - 900000) },
  { number: 'VTA-2024-001019', customer: 'María Rodríguez', total: 2100.00, status: 'VOIDED', createdAt: new Date(Date.now() - 1200000) },
];

// ─── KPI Card Component ───────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  loading?: boolean;
}

function KPICard({ title, value, change, subtext, icon: Icon, color = 'text-primary', loading }: KPICardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="relative overflow-hidden hover:border-primary/30 transition-colors">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-radial from-primary/5 to-transparent rounded-full -translate-y-8 translate-x-8" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
              )}
              {change !== undefined && (
                <div className="flex items-center gap-1.5">
                  {change >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className={cn('text-xs font-medium', change >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatPercent(change)}
                  </span>
                  {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
                </div>
              )}
            </div>
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10', color)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs space-y-1">
      <p className="text-muted-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="font-semibold text-foreground">
          {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Dashboard Ejecutivo
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(new Date(), 'long')} — Sucursal Central
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">● En vivo</Badge>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Ventas Hoy"
          value={formatCurrency(14520)}
          change={12.5}
          subtext="vs ayer"
          icon={DollarSign}
          loading={loading}
        />
        <KPICard
          title="Transacciones"
          value="87"
          change={8.2}
          subtext="vs ayer"
          icon={ShoppingCart}
          loading={loading}
        />
        <KPICard
          title="Ticket Promedio"
          value={formatCurrency(166.9)}
          change={3.8}
          subtext="vs ayer"
          icon={TrendingUp}
          loading={loading}
        />
        <KPICard
          title="Créditos Pendientes"
          value={formatCurrency(45200)}
          change={-2.1}
          subtext="vs mes anterior"
          icon={CreditCard}
          loading={loading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Ventas del Mes', value: formatCurrency(248400), color: 'text-primary' },
          { label: 'Clientes Nuevos', value: '34', color: 'text-success' },
          { label: 'Productos Activos', value: '1,248', color: 'text-muted-foreground' },
          { label: 'Stock Crítico', value: '12 productos', color: 'text-destructive' },
          { label: 'Lotes por Vencer', value: '7 lotes', color: 'text-warning' },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
            <p className={cn('text-lg font-bold mt-1 tabular-nums', item.color)}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue trend — spans 2 cols */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ingresos — Últimos 30 días</CardTitle>
                  <CardDescription>Tendencia de ventas diarias</CardDescription>
                </div>
                <Badge variant="default">{formatCurrency(248400)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => v.slice(5)}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#revGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#6366f1' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment methods */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>Distribución del mes</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <div className="glass-card p-2 text-xs">
                              <p className="text-foreground">{payload[0].name}: {payload[0].value}%</p>
                            </div>
                          ) : null
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 w-full mt-1">
                    {paymentMethodData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium text-foreground">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Productos Más Vendidos</CardTitle>
              <CardDescription>Top 5 por ingresos — últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="product.name"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      width={100}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]}>
                      {topProducts.map((_, i) => (
                        <Cell
                          key={i}
                          fill={`hsl(${239 + i * 15}, 84%, ${67 - i * 5}%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Branch Comparison */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle>Comparativa Sucursales</CardTitle>
              <CardDescription>Ventas del mes actual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                branchData.map((branch, i) => {
                  const max = Math.max(...branchData.map((b) => b.revenue));
                  const pct = (branch.revenue / max) * 100;
                  return (
                    <div key={branch.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium">{branch.name}</span>
                        <span className="text-muted-foreground tabular-nums">{formatCurrency(branch.revenue)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ background: `hsl(${239 + i * 20}, 84%, ${67 - i * 8}%)` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{branch.sales} transacciones</p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Ventas Recientes</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todas <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))
                ) : (
                  recentSales.map((sale) => (
                    <div
                      key={sale.number}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'h-7 w-7 rounded-lg flex items-center justify-center',
                          sale.status === 'COMPLETED' ? 'bg-success/10' : 'bg-destructive/10',
                        )}>
                          <ShoppingCart className={cn(
                            'h-3.5 w-3.5',
                            sale.status === 'COMPLETED' ? 'text-success' : 'text-destructive',
                          )} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{sale.number}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {sale.customer || 'Cliente general'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-foreground tabular-nums">
                          {formatCurrency(sale.total)}
                        </p>
                        <Badge variant={sale.status === 'COMPLETED' ? 'success' : 'destructive'} className="text-[10px]">
                          {sale.status === 'COMPLETED' ? 'Completada' : 'Anulada'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Alertas del Sistema
                </CardTitle>
                <Badge variant="warning">12 activas</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { type: 'stock', message: 'Coca-Cola 500ml — Stock crítico (8 unidades)', severity: 'destructive' },
                  { type: 'stock', message: 'Agua Pura 1L — Stock bajo (15 unidades)', severity: 'warning' },
                  { type: 'credit', message: 'Carlos Mendez — Crédito vencido Q1,200', severity: 'destructive' },
                  { type: 'expiry', message: '3 lotes vencen en menos de 7 días', severity: 'warning' },
                  { type: 'credit', message: 'Ana García — Crédito por vencer mañana', severity: 'warning' },
                ].map((alert, i) => (
                  <div key={i} className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-lg text-xs',
                    alert.severity === 'destructive' ? 'bg-destructive/10 border border-destructive/20' : 'bg-warning/10 border border-warning/20',
                  )}>
                    <AlertTriangle className={cn(
                      'h-3.5 w-3.5 shrink-0 mt-0.5',
                      alert.severity === 'destructive' ? 'text-destructive' : 'text-warning',
                    )} />
                    <p className={alert.severity === 'destructive' ? 'text-destructive' : 'text-warning-foreground'}>
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
