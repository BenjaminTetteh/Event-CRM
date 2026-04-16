import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, FileText, Settings, LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auth, signOut, onAuthStateChanged } from '../firebase';
import * as api from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
    { icon: Users, label: 'Leads', path: '/admin/leads' },
    { icon: Package, label: 'Inventory', path: '/admin/inventory' },
    { icon: FileText, label: 'Quotes', path: '/admin/quotes' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-stone-200 z-50 transition-transform lg:translate-x-0 lg:static",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg shadow-stone-200">
                <span className="text-white font-serif font-bold text-xl">E</span>
              </div>
              <span className="text-2xl font-serif font-bold text-stone-900 tracking-tighter">Event CRM</span>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300",
                      isActive
                        ? "bg-stone-900 text-white shadow-xl shadow-stone-200 scale-[1.02]"
                        : "text-stone-400 hover:bg-stone-50 hover:text-stone-900"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-stone-100">
            <div className="flex items-center gap-3 mb-6 p-2">
              <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 overflow-hidden">
                <img 
                  src={user?.photoURL || "https://picsum.photos/seed/admin/100/100"} 
                  alt="User"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-900 truncate">{user?.displayName || 'Administrator'}</p>
                <p className="text-[10px] text-stone-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3.5 w-full rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all active:scale-95"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 lg:hidden hover:bg-stone-100 rounded-xl transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-stone-600" />
            </button>
            <h2 className="text-lg font-serif font-bold text-stone-900 hidden sm:block">
              {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 shadow-sm overflow-hidden lg:hidden">
              <img 
                src={user?.photoURL || "https://picsum.photos/seed/admin/100/100"} 
                alt="Admin"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-12 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-stone-200 px-6 py-3 flex justify-between items-center z-40 pb-safe">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all duration-300",
                  isActive ? "text-stone-900 scale-110" : "text-stone-400"
                )}
              >
                <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
