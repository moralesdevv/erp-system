'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  CreditCard, BarChart3, Settings, ShoppingBag, Warehouse,
  Building2, Bell, ChevronDown, ChevronRight, X, Menu,
  Tag, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string | number;
  badgeVariant?: 'default' | 'destructive' | 'warning';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'POS',
    href: '/pos',
    icon: ShoppingCart,
    badge: 'Venta',
    badgeVariant: 'default',
  },
  {
    label: 'Inventario',
    icon: Package,
    children: [
      { label: 'Productos', href: '/inventory/products', icon: Layers },
      { label: 'Stock', href: '/inventory/stock', icon: Warehouse },
      { label: 'Categorías', href: '/inventory/categories', icon: Tag },
      { label: 'Marcas', href: '/inventory/brands', icon: Building2 },
      { label: 'Ajustes', href: '/inventory/adjustments', icon: Package },
      { label: 'Transferencias', href: '/inventory/transfers', icon: Package },
    ],
  },
  {
    label: 'Ventas',
    icon: ShoppingBag,
    children: [
      { label: 'Historial', href: '/sales', icon: ShoppingBag },
      { label: 'Créditos', href: '/credits', icon: CreditCard },
    ],
  },
  { label: 'Clientes', href: '/customers', icon: Users },
  {
    label: 'Compras',
    icon: Truck,
    children: [
      { label: 'Órdenes', href: '/purchases', icon: ShoppingCart },
      { label: 'Proveedores', href: '/suppliers', icon: Truck },
    ],
  },
  { label: 'Reportes', href: '/reports', icon: BarChart3 },
  { label: 'Notificaciones', href: '/notifications', icon: Bell },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(() => {
    return item.children?.some((child) => child.href && pathname.startsWith(child.href)) ?? false;
  });

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            'sidebar-item w-full',
            depth > 0 && 'pl-6 text-xs',
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden ml-2 mt-0.5 border-l border-border/50 pl-2"
            >
              {item.children!.map((child) => (
                <NavItemComponent key={child.href || child.label} item={child} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'sidebar-item',
        isActive && 'active',
        depth > 0 && 'text-xs py-1.5',
      )}
    >
      <item.icon className={cn('h-4 w-4 shrink-0', depth > 0 && 'h-3.5 w-3.5')} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
            item.badgeVariant === 'destructive' && 'bg-destructive/20 text-destructive',
            item.badgeVariant === 'warning' && 'bg-warning/20 text-warning-foreground',
            (!item.badgeVariant || item.badgeVariant === 'default') &&
              'bg-primary/20 text-primary',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 flex flex-col',
          'bg-sidebar border-r border-sidebar-border',
          'lg:translate-x-0 lg:static lg:z-auto',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground tracking-tight">ERP Sistema</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-accent text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <div className="px-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Principal
            </p>
          </div>
          {navItems.slice(0, 2).map((item) => (
            <NavItemComponent key={item.href || item.label} item={item} />
          ))}

          <div className="px-2 pt-3 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Operaciones
            </p>
          </div>
          {navItems.slice(2, 6).map((item) => (
            <NavItemComponent key={item.href || item.label} item={item} />
          ))}

          <div className="px-2 pt-3 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Sistema
            </p>
          </div>
          {navItems.slice(6).map((item) => (
            <NavItemComponent key={item.href || item.label} item={item} />
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">Super Admin</p>
              <p className="text-[10px] text-muted-foreground truncate">admin@erp.local</p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
