'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Menu, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isDark, setIsDark] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  const toggleTheme = () => {
    setIsDark((d) => !d);
    document.documentElement.classList.toggle('light');
  };

  return (
    <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20 flex items-center gap-3 px-4">
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon-sm" onClick={onMenuClick} className="lg:hidden">
        <Menu className="h-4 w-4" />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-xs">
        <Input
          placeholder="Buscar productos, clientes..."
          startIcon={<Search className="h-3.5 w-3.5" />}
          className="h-8 text-xs bg-muted/50"
        />
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon-sm" className="relative" onClick={() => router.push('/notifications')}>
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </Button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
              SA
            </div>
            <span className="text-xs font-medium text-foreground hidden sm:block">Super Admin</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-card shadow-glass py-1 z-50"
              >
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <User className="h-4 w-4" />
                  Mi perfil
                </button>
                <div className="h-px bg-border mx-2 my-1" />
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => router.push('/login')}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
