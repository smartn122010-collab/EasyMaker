import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, where, orderBy, addDoc, limit } from 'firebase/firestore';
import { 
  Truck, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  MapPin, 
  Phone, 
  Navigation,
  LogOut,
  User,
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  ArrowRight,
  Info,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { signOut } from 'firebase/auth';

export default function DriverDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null);
  const [showSuccessTick, setShowSuccessTick] = useState(false);
  const prevAvailableCount = useRef<number | null>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    // Available orders (accepted by admin but no driver yet)
    const qAvailable = query(
      collection(db, 'orders'), 
      where('status', '==', 'out_for_delivery')
    );
    const unsubAvailable = onSnapshot(qAvailable, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = orders.filter((o: any) => !o.driverId);
      
      // Play sound and show notification for new available orders
      if (prevAvailableCount.current !== null && filtered.length > prevAvailableCount.current) {
        notificationSound.current?.play().catch(e => console.log('Sound play blocked:', e));
        toast.info('New Delivery Order Available!', {
          description: 'A new order is ready for pickup.',
          duration: 5000,
        });
      }
      prevAvailableCount.current = filtered.length;
      setAvailableOrders(filtered);
    }, (error) => {
      console.error("Available orders listener error:", error);
    });

    // My active orders
    if (auth.currentUser) {
      const qMy = query(
        collection(db, 'orders'),
        where('driverId', '==', auth.currentUser.uid)
      );
      const unsubMy = onSnapshot(qMy, (snapshot) => {
        setMyOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("My orders listener error:", error);
      });

      // Find admin to message
      const qAdmin = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
      const unsubAdmin = onSnapshot(qAdmin, (snapshot) => {
        if (!snapshot.empty) {
          setAdminUser({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      }, (error) => {
        console.error("Admin user listener error:", error);
      });

      return () => { unsubAvailable(); unsubMy(); unsubAdmin(); };
    }

    return () => unsubAvailable();
  }, []);

  useEffect(() => {
    if (activeTab === 'messages' && auth.currentUser && adminUser) {
      const participants = [auth.currentUser.uid, adminUser.id].sort();
      const qMessages = query(
        collection(db, 'messages'),
        where('participants', '==', participants)
      );
      const unsubMessages = onSnapshot(qMessages, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs.sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
      }, (error) => {
        console.error("Messages listener error:", error);
      });
      return () => unsubMessages();
    }
  }, [activeTab, adminUser]);

  const hasActiveOrder = myOrders.some(o => o.status !== 'delivered' && o.status !== 'cancelled');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !adminUser || !auth.currentUser) return;

    if (!hasActiveOrder) {
      toast.error("You can only message admin when you have an active delivery.");
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: auth.currentUser.uid,
        receiverId: adminUser.id,
        participants: [auth.currentUser.uid, adminUser.id].sort(),
        text: newMessage,
        timestamp: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        driverId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      });
      toast.success('Order sent to your dashboard!');
      setActiveTab('my-orders');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: new Date().toISOString()
      });
      
      if (status === 'delivered') {
        setShowSuccessTick(true);
        setTimeout(() => setShowSuccessTick(false), 3000);
      } else {
        toast.success(`Order status updated to ${status.replace(/_/g, ' ')}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const stats = [
    { label: 'Deliveries', value: myOrders.filter(o => o.status === 'delivered').length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Cancelled', value: myOrders.filter(o => o.status === 'cancelled').length, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Revenue', value: `₹${(myOrders.filter(o => o.status === 'delivered').length * 5).toFixed(2)}`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={cn("p-4 rounded-2xl", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold">Available Orders</h3>
        {availableOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-gray-100">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400">No orders available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {availableOrders.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-orange-500 font-bold">#{order.id.slice(-6)}</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase">{order.status}</span>
                  </div>
                  <div className="flex items-start gap-2 group cursor-pointer" onClick={() => openInMaps(order.deliveryAddress)}>
                    <MapPin className="w-4 h-4 text-gray-400 mt-1 group-hover:text-orange-500 transition-colors" />
                    <p className="text-sm font-medium group-hover:text-orange-600 transition-colors underline decoration-dotted underline-offset-4">{order.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  {confirmAcceptId === order.id ? (
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => {
                          acceptOrder(order.id);
                          openInMaps(order.deliveryAddress);
                          setConfirmAcceptId(null);
                        }}
                        className="flex-1 bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 transition-all text-sm"
                      >
                        Confirm Accept
                      </button>
                      <button 
                        onClick={() => setConfirmAcceptId(null)}
                        className="flex-1 border border-gray-200 text-gray-400 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => setConfirmAcceptId(order.id)}
                        className="flex-1 md:flex-none bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => toast.info('Order hidden from your view')}
                        className="flex-1 md:flex-none border border-gray-200 text-gray-400 px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderMyOrders = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">My Active Deliveries</h3>
      <div className="grid grid-cols-1 gap-6">
        {myOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map((order) => (
          <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="font-bold text-lg">Order #{order.id.slice(-6)}</h4>
                <p className="text-sm text-gray-400">{order.items.length} items • ₹{order.totalAmount.toFixed(2)}</p>
              </div>
              <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full uppercase">{order.status}</span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Delivery Address</p>
                  <p className="font-medium">{order.deliveryAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Customer Phone</p>
                  <p className="font-medium">{order.customerPhone}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => openInMaps(order.deliveryAddress)}
                className="flex items-center justify-center gap-2 py-4 bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-100"
              >
                <Navigation className="w-5 h-5" />
                Open Maps
              </button>
              
              <button 
                onClick={() => updateOrderStatus(order.id, 'delivered')}
                className="flex items-center justify-center gap-2 py-4 bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-100"
              >
                <CheckCircle2 className="w-5 h-5" />
                Delivered
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Driver Profile</h1>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
        <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <User className="w-12 h-12 text-orange-500" />
        </div>
        <h3 className="text-xl font-bold">{auth.currentUser?.displayName || 'Driver'}</h3>
        <p className="text-gray-400 mb-8">{auth.currentUser?.email}</p>
        
        <div className="space-y-4">
          <div className="p-6 bg-orange-50 rounded-3xl text-left space-y-4 border border-orange-100">
            <div className="flex items-center gap-3 text-orange-900">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="font-bold">About Easy Driver</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Part of the <strong>Home Made Food Delivery</strong> network. We empower local drivers to deliver fresh, home-cooked meals.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>Home Made Food Delivery, 123 Gourmet Lane, Foodie City</span>
              </div>
              <a 
                href="https://whatsapp.com/channel/0029Vb7UGl90AgWJQzLO1M34" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white rounded-xl hover:bg-orange-100 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-orange-900">Driver Community</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-orange-500" />
              </a>
            </div>
          </div>

          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  const renderMessages = () => (
    <div className="h-[calc(100vh-160px)] flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <User className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h4 className="font-bold">Admin Support</h4>
          <p className="text-xs text-green-500 font-medium">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            "flex flex-col max-w-[80%]",
            msg.senderId === auth.currentUser?.uid ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "px-4 py-2 rounded-2xl text-sm",
              msg.senderId === auth.currentUser?.uid 
                ? "bg-orange-500 text-white rounded-tr-none" 
                : "bg-white text-gray-700 border border-gray-100 rounded-tl-none"
            )}>
              {msg.text}
            </div>
            <span className="text-[10px] text-gray-400 mt-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No messages with admin yet.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!hasActiveOrder}
          placeholder={hasActiveOrder ? "Type a message to admin..." : "Messaging disabled (no active delivery)"}
          className={cn(
            "flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all",
            !hasActiveOrder && "opacity-50 cursor-not-allowed"
          )}
        />
        <button 
          type="submit"
          disabled={!hasActiveOrder}
          className={cn(
            "bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all",
            !hasActiveOrder && "opacity-50 cursor-not-allowed bg-gray-400 shadow-none"
          )}
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </form>
    </div>
  );

  return (
    <div className={cn("min-h-screen transition-colors duration-300", isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900")}>
      {/* Success Tick Overlay */}
      <AnimatePresence>
        {showSuccessTick && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="flex flex-col items-center"
            >
              <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-200 mb-6">
                <CheckCircle2 className="w-20 h-20 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Order Delivered!</h2>
              <p className="text-gray-500 mt-2">Great job on your delivery.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-orange-500 p-2 rounded-xl">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Easy Driver</span>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'orders', label: 'My Deliveries', icon: ClipboardList },
              { id: 'messages', label: 'Messages', icon: MessageSquare },
              { id: 'profile', label: 'Profile', icon: User },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all",
                  activeTab === item.id ? "bg-orange-500 text-white shadow-lg shadow-orange-100" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <button onClick={() => signOut(auth)} className="mt-auto flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'orders' && renderMyOrders()}
              {activeTab === 'messages' && renderMessages()}
              {activeTab === 'profile' && renderProfile()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-100 flex items-center justify-around px-6 z-40">
          {[
            { id: 'dashboard', icon: LayoutDashboard },
            { id: 'orders', icon: ClipboardList },
            { id: 'messages', icon: MessageSquare },
            { id: 'profile', icon: User },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "p-3 rounded-2xl transition-all",
                activeTab === item.id ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-gray-400"
              )}
            >
              <item.icon className="w-6 h-6" />
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
