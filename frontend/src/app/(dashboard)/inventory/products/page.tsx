'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Package, TrendingDown, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';

const DEMO_PRODUCTS = [
  { id: '1', sku: 'COCA-500', name: 'Coca-Cola 500ml', category: 'Bebidas', brand: 'Coca-Cola', price: 6.50, cost: 4.20, stock: 120, minStock: 20, status: 'active' },
  { id: '2', sku: 'AGUA-1L', name: 'Agua Pura 1L', category: 'Bebidas', brand: 'Natural', price: 4.00, cost: 2.10, stock: 200, minStock: 50, status: 'active' },
  { id: '3', sku: 'PAN-BIM', name: 'Pan Bimbo Blanco', category: 'Panadería', brand: 'Bimbo', price: 18.50, cost: 14.00, stock: 8, minStock: 20, status: 'low' },
  { id: '4', sku: 'LECH-1L', name: 'Leche Clover 1L', category: 'Lácteos', brand: 'Clover', price: 13.50, cost: 10.20, stock: 0, minStock: 15, status: 'out' },
  { id: '5', sku: 'ARR-1LB', name: 'Arroz Tio Sam 1lb', category: 'Granos', brand: 'Tio Sam', price: 8.50, cost: 6.00, stock: 150, minStock: 30, status: 'active' },
];

const STATUS_CONFIG = {
  active: { label: 'Normal', variant: 'success' as const },
  low: { label: 'Stock Bajo', variant: 'warning' as const },
  out: { label: 'Sin Stock', variant: 'destructive' as const },
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const filtered = DEMO_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de {DEMO_PRODUCTS.length} productos</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Nuevo Producto
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Productos', value: '1,248', color: 'text-foreground' },
          { label: 'Stock Normal', value: '1,188', color: 'text-success' },
          { label: 'Stock Bajo', value: '48', color: 'text-warning' },
          { label: 'Sin Stock', value: '12', color: 'text-destructive' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn('text-xl font-bold mt-1 tabular-nums', s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Buscar por nombre o SKU..."
                startIcon={<Search className="h-3.5 w-3.5" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" /> Filtrar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {['SKU', 'Producto', 'Categoría', 'Precio', 'Costo', 'Stock', 'Estado', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-4 w-4 text-primary/50" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.category}</td>
                    <td className="px-4 py-3 font-semibold text-foreground tabular-nums">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatCurrency(p.cost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.status !== 'active' && <TrendingDown className="h-3.5 w-3.5 text-warning" />}
                        <span className={cn('font-medium tabular-nums', p.stock === 0 ? 'text-destructive' : p.stock < p.minStock ? 'text-warning' : 'text-foreground')}>
                          {p.stock}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/ {p.minStock} mín</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG].variant}>
                        {STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
