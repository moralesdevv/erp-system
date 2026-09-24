'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Barcode, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, X, CheckCircle, Tag, User,
  Package, ChevronLeft, Keyboard, Zap, Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  category?: string;
  imageUrl?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

// ─── Demo products ──────────────────────────────────────────────────────────

const DEMO_PRODUCTS: Product[] = [
  { id: '1', name: 'Coca-Cola 500ml', sku: 'COCA-500', barcode: '7501055303472', price: 6.50, cost: 4.20, stock: 120, category: 'Bebidas' },
  { id: '2', name: 'Agua Pura 1L', sku: 'AGUA-1L', barcode: '7501234567890', price: 4.00, cost: 2.10, stock: 200, category: 'Bebidas' },
  { id: '3', name: 'Pan Bimbo Blanco', sku: 'PAN-BIM-BL', barcode: '7503011315030', price: 18.50, cost: 14.00, stock: 45, category: 'Panadería' },
  { id: '4', name: 'Pepsi 355ml', sku: 'PEPSI-355', barcode: '7501055303489', price: 5.50, cost: 3.50, stock: 95, category: 'Bebidas' },
  { id: '5', name: 'Doritos Original 55g', sku: 'DOR-OR-55', barcode: '7501234000000', price: 12.00, cost: 8.50, stock: 60, category: 'Snacks' },
  { id: '6', name: 'Leche Clover 1L', sku: 'LECH-CLO-1L', barcode: '7502224000001', price: 13.50, cost: 10.20, stock: 30, category: 'Lácteos' },
  { id: '7', name: 'Arroz Tio Sam 1lb', sku: 'ARR-TS-1LB', barcode: '7502224000002', price: 8.50, cost: 6.00, stock: 150, category: 'Granos' },
  { id: '8', name: 'Azúcar 1lb', sku: 'AZU-1LB', barcode: '7502224000003', price: 7.00, cost: 5.20, stock: 80, category: 'Abarrotes' },
  { id: '9', name: 'Aceite Ideal 900ml', sku: 'ACE-ID-900', barcode: '7502224000004', price: 22.00, cost: 17.50, stock: 40, category: 'Abarrotes' },
  { id: '10', name: 'Frijol Negro 1lb', sku: 'FRJ-NG-1LB', barcode: '7502224000005', price: 9.00, cost: 6.50, stock: 100, category: 'Granos' },
  { id: '11', name: 'Papel Higiénico 4x', sku: 'PAP-HIG-4X', price: 28.00, cost: 20.00, stock: 25, category: 'Limpieza' },
  { id: '12', name: 'Jabón Dove 90g', sku: 'JAB-DOV-90', price: 15.00, cost: 11.50, stock: 55, category: 'Higiene' },
];

const CATEGORIES = ['Todo', ...Array.from(new Set(DEMO_PRODUCTS.map((p) => p.category!)))];

// ─── Payment Modal ─────────────────────────────────────────────────────────

function PaymentModal({
  total,
  onClose,
  onComplete,
}: {
  total: number;
  onClose: () => void;
  onComplete: (method: string, amountPaid: number) => void;
}) {
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'CREDIT'>('CASH');
  const [cashAmount, setCashAmount] = useState(total.toFixed(2));

  const change = Math.max(0, parseFloat(cashAmount || '0') - total);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-glass"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Cobrar</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Total */}
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">Total a pagar</p>
          <p className="text-4xl font-bold text-primary tabular-nums mt-1">{formatCurrency(total)}</p>
        </div>

        {/* Payment method */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'CASH', label: 'Efectivo', icon: Banknote },
            { key: 'CARD', label: 'Tarjeta', icon: CreditCard },
            { key: 'CREDIT', label: 'Crédito', icon: Tag },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMethod(key as any)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                method === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        {/* Cash input */}
        {method === 'CASH' && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Efectivo recibido</label>
            <Input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              className="text-xl h-12 text-center font-bold"
              autoFocus
            />
            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-1.5">
              {[20, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCashAmount(String(amt))}
                  className="p-2 text-xs font-medium rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  Q{amt}
                </button>
              ))}
            </div>
            {change > 0 && (
              <div className="bg-success/10 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-success">Cambio</span>
                <span className="text-lg font-bold text-success tabular-nums">{formatCurrency(change)}</span>
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => onComplete(method, parseFloat(cashAmount || '0'))}
          disabled={method === 'CASH' && parseFloat(cashAmount || '0') < total}
        >
          <CheckCircle className="h-5 w-5" />
          Confirmar Pago
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Sale Complete Modal ──────────────────────────────────────────────────────

function SaleCompleteModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm text-center space-y-5 shadow-glass"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="mx-auto h-16 w-16 rounded-full bg-success/20 flex items-center justify-center"
        >
          <CheckCircle className="h-8 w-8 text-success" />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-foreground">¡Venta Completada!</h2>
          <p className="text-sm text-muted-foreground mt-1">{sale.number}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-foreground">{formatCurrency(sale.total)}</span>
          </div>
          {sale.change > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cambio</span>
              <span className="font-bold text-success">{formatCurrency(sale.change)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <Receipt className="h-4 w-4" />
            Ticket
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Nueva Venta
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── POS Main ─────────────────────────────────────────────────────────────────

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todo');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredProducts = DEMO_PRODUCTS.filter((p) => {
    const matchCat = selectedCategory === 'Todo' || p.category === selectedCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.includes(search) ||
      p.barcode?.includes(search);
    return matchCat && matchSearch;
  });

  const cartTotal = cart.reduce((sum, item) => {
    const discounted = item.unitPrice * item.quantity * (1 - item.discount / 100);
    return sum + discounted;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.price, discount: 0 }];
    });
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const handlePaymentComplete = (method: string, amountPaid: number) => {
    const change = Math.max(0, amountPaid - cartTotal);
    setCompletedSale({
      number: `VTA-${Date.now()}`,
      total: cartTotal,
      change,
      method,
    });
    setShowPayment(false);
    setCart([]);
  };

  // Focus search on keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex gap-3 overflow-hidden">
      {/* ─── Left: Product catalog ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <Input
              ref={searchRef}
              placeholder="Buscar por nombre, SKU o escanear código de barras... [F2]"
              startIcon={<Search className="h-3.5 w-3.5" />}
              endIcon={<Barcode className="h-3.5 w-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10"
            />
          </div>
          <Badge variant="muted" className="hidden sm:flex gap-1 h-10 px-3 text-xs">
            <Keyboard className="h-3.5 w-3.5" />F2
          </Badge>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                selectedCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-2">
            {filteredProducts.map((product) => (
              <motion.button
                key={product.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => addToCart(product)}
                className={cn(
                  'relative flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                  'bg-card border-border/50 hover:border-primary/40 hover:bg-card/80',
                  product.stock === 0 && 'opacity-50 pointer-events-none',
                )}
              >
                {/* Category badge */}
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  {product.category}
                </span>

                {/* Product image placeholder */}
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Package className="h-5 w-5 text-primary/50" />
                </div>

                <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                  {product.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{product.sku}</p>

                <div className="flex items-center justify-between w-full mt-2">
                  <p className="text-sm font-bold text-primary tabular-nums">
                    {formatCurrency(product.price)}
                  </p>
                  <span className={cn(
                    'text-[10px] font-medium',
                    product.stock <= 5 ? 'text-destructive' : 'text-muted-foreground',
                  )}>
                    {product.stock} {product.stock <= 5 && '⚠'}
                  </span>
                </div>

                {/* In-cart indicator */}
                {cart.some((i) => i.product.id === product.id) && (
                  <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">
                      {cart.find((i) => i.product.id === product.id)?.quantity}
                    </span>
                  </div>
                )}
              </motion.button>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Right: Cart ─────────────────────────────────────────────────────── */}
      <div className="w-72 xl:w-80 flex flex-col glass-card p-0 overflow-hidden">
        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Carrito</span>
            {cartCount > 0 && (
              <Badge variant="default" className="text-[10px] h-5 min-w-5 flex items-center justify-center">
                {cartCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm">
              <User className="h-3.5 w-3.5" />
            </Button>
            {cart.length > 0 && (
              <Button variant="ghost" size="icon-sm" onClick={clearCart}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
              <ShoppingCart className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-xs">El carrito está vacío</p>
              <p className="text-[10px] mt-1 opacity-60">Selecciona productos del catálogo</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="py-2 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground leading-tight truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-muted-foreground/50 hover:text-destructive transition-colors mt-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Totals + checkout */}
        <div className="border-t border-border/50 px-4 py-3 space-y-3">
          {cart.length > 0 && (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({cartCount} items)</span>
                <span className="tabular-nums">{formatCurrency(cartTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-base border-t border-border/50 pt-1.5">
                <span>Total</span>
                <span className="tabular-nums text-primary">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
          )}

          <Button
            className="w-full h-11 text-sm font-semibold"
            disabled={cart.length === 0}
            onClick={() => setShowPayment(true)}
          >
            <Zap className="h-4 w-4" />
            Cobrar {cart.length > 0 && formatCurrency(cartTotal)}
          </Button>

          <Button variant="outline" className="w-full h-8 text-xs" disabled={cart.length === 0}>
            <Tag className="h-3.5 w-3.5" />
            Aplicar descuento
          </Button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPayment && (
          <PaymentModal
            total={cartTotal}
            onClose={() => setShowPayment(false)}
            onComplete={handlePaymentComplete}
          />
        )}
        {completedSale && (
          <SaleCompleteModal
            sale={completedSale}
            onClose={() => setCompletedSale(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
