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
    <div className={cn("min-h-screen flex transition-colors duration-300", isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900")}>
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 transform bg-white shadow-2xl",
        isDarkMode && "bg-gray-800 border-r border-gray-700",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-xl">
                <MenuIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">Easy Maker</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all group",
                  activeTab === item.id 
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                    : "text-gray-500 hover:bg-gray-100",
                  isDarkMode && activeTab !== item.id && "text-gray-400 hover:bg-gray-700"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-gray-400 group-hover:text-orange-500")} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-6 p-2 rounded-xl bg-gray-50">
               <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-orange-500" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold truncate">{auth.currentUser?.displayName || 'Admin'}</p>
                 <p className="text-xs text-gray-400 truncate">Administrator</p>
               </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        isSidebarOpen ? "ml-64" : "ml-0"
      )}>
        <header className={cn(
          "h-20 flex items-center justify-between px-8 sticky top-0 z-40 backdrop-blur-md",
          isDarkMode ? "bg-gray-900/80 border-b border-gray-800" : "bg-white/80 border-b border-gray-100"
        )}>
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MenuIcon className="w-6 h-6" />
              </button>
            )}
            <h2 className="text-xl font-bold capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-all"
            >
              {isDarkMode ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-600" />}
            </button>
            <button className="p-2 rounded-xl hover:bg-gray-100 transition-all relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
