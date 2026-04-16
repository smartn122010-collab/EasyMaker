import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  Truck, 
  Users, 
  LogOut, 
  Menu as MenuIcon, 
  X,
  Bell,
  Moon,
  Sun,
  User,
  Send,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  path?: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'menu', label: 'Menu Add', icon: PlusCircle },
  { id: 'orders', label: 'Order Receive', icon: ClipboardList },
  { id: 'dispatch', label: 'Send Order', icon: Send },
  { id: 'drivers', label: 'Delivery Driver', icon: Truck },
  { id: 'users', label: 'User Section', icon: Users },
  { id: 'about', label: 'About Us', icon: Info },
];

export default function AdminLayout({ children, activeTab, setActiveTab }: { children: React.ReactNode, activeTab: string, setActiveTab: (tab: string) => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className={cn("min-h-screen flex transition-colors duration-300", isDarkMode ? "bg-gray-900 text-white" : "bg-brand-100 text-gray-900")}>
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-500 transform bg-white luxury-shadow",
        isDarkMode && "bg-gray-800 border-r border-gray-700",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-8">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="charcoal-gradient p-3 rounded-2xl luxury-shadow">
                <MenuIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-serif font-bold tracking-tight text-brand-900">Easy Maker</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">Admin Suite</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-300 hover:text-brand-900 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-3">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all group",
                  activeTab === item.id 
                    ? "charcoal-gradient text-white luxury-shadow" 
                    : "text-gray-400 hover:bg-brand-50 hover:text-brand-900",
                  isDarkMode && activeTab !== item.id && "text-gray-400 hover:bg-gray-700"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-colors", activeTab === item.id ? "text-brand-500" : "text-gray-300 group-hover:text-brand-500")} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t border-brand-50">
            <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-brand-50/50 border border-brand-50">
               <div className="w-12 h-12 rounded-2xl charcoal-gradient flex items-center justify-center luxury-shadow">
                  <User className="w-6 h-6 text-brand-500" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-brand-900 truncate">{auth.currentUser?.displayName || 'Admin'}</p>
                 <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest truncate">Administrator</p>
               </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-500",
        isSidebarOpen ? "ml-72" : "ml-0"
      )}>
        <header className={cn(
          "h-24 flex items-center justify-between px-10 sticky top-0 z-40 backdrop-blur-md border-b",
          isDarkMode ? "bg-gray-900/80 border-gray-800" : "bg-brand-100/80 border-brand-50"
        )}>
          <div className="flex items-center gap-6">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white luxury-shadow rounded-2xl text-brand-900 hover:bg-brand-50 transition-all">
                <MenuIcon className="w-6 h-6" />
              </button>
            )}
            <div className="flex flex-col">
              <h2 className="text-2xl font-serif font-light text-brand-900 tracking-tight capitalize leading-tight">
                {activeTab.replace('-', ' ')}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Management Overview</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-12 h-12 bg-white luxury-shadow rounded-2xl flex items-center justify-center text-gray-400 hover:text-brand-900 transition-all border border-brand-50"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="w-12 h-12 bg-white luxury-shadow rounded-2xl flex items-center justify-center text-gray-400 hover:text-brand-900 transition-all border border-brand-50 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-brand-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
