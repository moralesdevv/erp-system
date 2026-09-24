'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Users, Phone, Mail, CreditCard, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCurrency, getInitials } from '@/lib/utils';

const DEMO_CUSTOMERS = [
  { id: '1', code: 'CLI-00001', name: 'Carlos Mendez', phone: '5512-3456', email: 'carlos@email.com', nit: '12345678', creditLimit: 5000, creditBalance: 1200, totalPurchases: 45200, status: 'active' },
  { id: '2', code: 'CLI-00002', name: 'Ana García', phone: '4423-7890', email: 'ana@email.com', nit: '87654321', creditLimit: 10000, creditBalance: 0, totalPurchases: 128000, status: 'active' },
  { id: '3', code: 'CLI-00003', name: 'Juan López', phone: '3312-4567', email: null, nit: null, creditLimit: 2000, creditBalance: 2000, totalPurchases: 18500, status: 'overdue' },
  { id: '4', code: 'CLI-00004', name: 'María Rodríguez', phone: '6634-5678', email: 'maria@email.com', nit: '11223344', creditLimit: 0, creditBalance: 0, totalPurchases: 8200, status: 'active' },
  { id: '5', code: 'CLI-00005', name: 'Pedro Hernández', phone: '7745-6789', email: 'pedro@email.com', nit: '55667788', creditLimit: 3000, creditBalance: 500, totalPurchases: 22100, status: 'active' },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const filtered = DEMO_CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search) ||
    c.phone?.includes(search),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{DEMO_CUSTOMERS.length} clientes registrados</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4" /> Nuevo Cliente</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Clientes', value: '248', icon: Users, color: 'text-primary' },
          { label: 'Con Crédito', value: '45', icon: CreditCard, color: 'text-success' },
          { label: 'Crédito Vencido', value: '8', icon: CreditCard, color: 'text-destructive' },
          { label: 'Ventas del Mes', value: formatCurrency(48200), icon: TrendingUp, color: 'text-primary' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Input
            className="max-w-sm"
            placeholder="Buscar cliente..."
            startIcon={<Search className="h-3.5 w-3.5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {['Cliente', 'Contacto', 'Crédito', 'Compras Totales', 'Estado', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.code} {c.nit && `· NIT: ${c.nit}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{c.phone}
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{c.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.creditLimit > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-foreground tabular-nums">
                          {formatCurrency(c.creditBalance)} <span className="text-muted-foreground font-normal">/ {formatCurrency(c.creditLimit)}</span>
                        </p>
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-24">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(c.creditBalance / c.creditLimit) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin crédito</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground tabular-nums">
                    {formatCurrency(c.totalPurchases)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.status === 'overdue' ? 'destructive' : 'success'}>
                      {c.status === 'overdue' ? 'Crédito Vencido' : 'Activo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="text-xs">Ver</Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
