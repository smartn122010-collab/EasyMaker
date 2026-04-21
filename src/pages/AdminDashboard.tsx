import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import { db, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  orderBy,
  where
} from 'firebase/firestore';
import { 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Star, 
  Edit2, 
  Trash2,
  ClipboardList,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Truck,
  Users,
  Send,
  Info,
  ExternalLink,
  Tag,
  Power,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const EasyMakerLogo = () => (
  <div className="w-full h-full bg-gradient-to-br from-brand-900 to-charcoal-900 flex flex-col items-center justify-center relative overflow-hidden p-6 group-hover:from-brand-950 group-hover:to-black transition-all duration-700">
    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
    <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -ml-16 -mb-16 animate-pulse" style={{ animationDelay: '1s' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/5 rounded-full" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-brand-500/5 rounded-full" />
    
    <div className="relative z-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 mb-3 border-2 border-brand-500/30 flex items-center justify-center rounded-2xl rotate-45 group-hover:rotate-[225deg] transition-transform duration-1000 bg-brand-900/50 backdrop-blur-md shadow-2xl shadow-brand-500/10">
        <ShoppingBag className="w-7 h-7 text-brand-500 -rotate-45 group-hover:-rotate-[225deg] transition-transform duration-1000" />
      </div>
      <h2 className="text-2xl font-serif text-white tracking-[0.2em] leading-none font-light italic uppercase">
        Easy<span className="font-bold text-brand-500 NOT-italic">Maker</span>
      </h2>
      <div className="h-px w-8 bg-brand-500/30 mt-3" />
    </div>
  </div>
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [shopStatus, setShopStatus] = useState<'open' | 'closed'>('open');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [confirmSendOrderId, setConfirmSendOrderId] = useState<string | null>(null);
  const prevOrdersCount = useRef<number | null>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);
  
  // Coupon Form State
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount: '',
    description: ''
  });

  const toggleShopStatus = async () => {
    const newStatus = shopStatus === 'open' ? 'closed' : 'open';
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success(`Shop is now ${newStatus.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...couponForm,
        discount: parseFloat(couponForm.discount),
        imageUrl: 'https://picsum.photos/seed/easymaker-logo/400/300', // Branded EasyMaker Logo
        createdAt: editingCoupon ? editingCoupon.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingCoupon) {
        await updateDoc(doc(db, 'coupons', editingCoupon.id), data);
        toast.success('Coupon updated');
      } else {
        await addDoc(collection(db, 'coupons'), data);
        toast.success('Coupon added');
      }
      setShowCouponModal(false);
      setEditingCoupon(null);
      setCouponForm({ code: '', discount: '', description: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm('Delete this coupon?')) {
      await deleteDoc(doc(db, 'coupons', id));
      toast.success('Coupon deleted');
    }
  };

  // Menu Form State
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    price: '',
    description: '',
    rating: '5',
    category: 'Burgers',
    imageUrl: 'https://picsum.photos/seed/food/400/300'
  });

  const renderCoupons = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-brand-900">Manage Coupons</h3>
          <p className="text-sm text-gray-400">Add discount codes for customers</p>
        </div>
        <button 
          onClick={() => { setEditingCoupon(null); setCouponForm({ code: '', discount: '', description: '' }); setShowCouponModal(true); }}
          className="bg-brand-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <motion.div layout key={coupon.id} className="bg-white rounded-[2.5rem] luxury-shadow border border-brand-50 overflow-hidden group hover:-translate-y-1 transition-all duration-500">
            <div className="relative h-44 overflow-hidden">
              <EasyMakerLogo />
              <div className="absolute inset-0 bg-brand-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-[2px]">
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setEditingCoupon(coupon); setCouponForm({ code: coupon.code, discount: coupon.discount.toString(), description: coupon.description }); setShowCouponModal(true); }}
                    className="p-4 bg-white rounded-2xl text-brand-900 hover:scale-110 active:scale-95 transition-all shadow-xl"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="p-4 bg-white rounded-2xl text-red-500 hover:scale-110 active:scale-95 transition-all shadow-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="absolute top-6 right-6 charcoal-gradient text-white px-4 py-2 rounded-2xl flex flex-col items-center gap-0.5 luxury-shadow border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">OFF</span>
                <span className="text-xl font-black">{coupon.discount}%</span>
              </div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-2xl font-serif font-light text-brand-900 tracking-tight leading-none italic group-hover:text-brand-500 transition-colors">
                  {coupon.code}
                </h4>
              </div>
              <p className="text-sm text-gray-400 font-medium line-clamp-2 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                {coupon.description || "Enjoy premium homemade deliciousness with this exclusive offer."}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coupon Modal */}
      <AnimatePresence>
        {showCouponModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCouponModal(false)}
              className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-10 relative z-10 shadow-2xl space-y-6"
            >
              <div>
                <h3 className="text-2xl font-serif font-light text-brand-900 tracking-tight leading-tight">
                  {editingCoupon ? 'Edit' : 'Create New'} <br />
                  <span className="font-bold italic text-brand-500">Discount Coupon</span>
                </h3>
              </div>
              <form onSubmit={handleAddCoupon} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1">Coupon Code</label>
                    <input 
                      required value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})}
                      placeholder="e.g. SAVE50"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-brand-500/30 outline-none text-sm font-bold placeholder:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1">Discount (%)</label>
                    <input 
                      required type="number" step="1" value={couponForm.discount} onChange={e => setCouponForm({...couponForm, discount: e.target.value})}
                      placeholder="e.g. 20"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-brand-500/30 outline-none text-sm font-bold placeholder:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1">Description</label>
                    <textarea 
                      required rows={2} value={couponForm.description} onChange={e => setCouponForm({...couponForm, description: e.target.value})}
                      placeholder="Coupon details..."
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-brand-500/30 outline-none text-sm font-medium placeholder:text-gray-200 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowCouponModal(false)} className="flex-1 px-4 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 bg-gray-50 hover:bg-gray-100 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white charcoal-gradient shadow-lg transition-all">Save Coupon</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Play sound and show notification for new orders
      if (prevOrdersCount.current !== null && newOrders.length > prevOrdersCount.current) {
        const latestOrder = newOrders[0] as any;
        if (latestOrder.status === 'pending') {
          notificationSound.current?.play().catch(e => console.log('Sound play blocked:', e));
          toast.success('New Order Received!', {
            description: `Order #${latestOrder.id.slice(-6)} for ₹${latestOrder.totalAmount}`,
            duration: 5000,
          });
        }
      }
      prevOrdersCount.current = newOrders.length;
      setOrders(newOrders);
    }, (error) => {
      console.error("Admin orders listener error:", error);
    });

    const qMenu = query(collection(db, 'menu'));
    const unsubMenu = onSnapshot(qMenu, (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Admin menu listener error:", error);
    });

    const qDrivers = query(collection(db, 'users'), where('role', '==', 'driver'));
    const unsubDrivers = onSnapshot(qDrivers, (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Admin drivers listener error:", error);
    });

    const qCoupons = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
    const unsubCoupons = onSnapshot(qCoupons, (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (doc) => {
      if (doc.exists()) {
        setShopStatus(doc.data().status || 'open');
      }
    });

    let unsubUser = () => {};
    if (auth.currentUser) {
      unsubUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
        setUserData(doc.data());
      });
    }

    return () => {
      unsubOrders();
      unsubMenu();
      unsubDrivers();
      unsubUser();
      unsubCoupons();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (selectedDriver && showChatModal && auth.currentUser) {
      const participants = [auth.currentUser.uid, selectedDriver.id].sort();
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
        if (error.message.includes("index")) {
          toast.error("Chat index is being built. Please wait a moment.");
        }
      });
      return () => unsubMessages();
    }
  }, [selectedDriver, showChatModal]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedDriver || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: auth.currentUser.uid,
        receiverId: selectedDriver.id,
        participants: [auth.currentUser.uid, selectedDriver.id].sort(),
        text: newMessage,
        timestamp: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'menu', editingItem.id), {
          ...menuForm,
          price: parseFloat(menuForm.price),
          rating: parseFloat(menuForm.rating)
        });
        toast.success('Menu item updated');
      } else {
        await addDoc(collection(db, 'menu'), {
          ...menuForm,
          price: parseFloat(menuForm.price),
          rating: parseFloat(menuForm.rating)
        });
        toast.success('Menu item added');
      }
      setShowMenuModal(false);
      setEditingItem(null);
      setMenuForm({ name: '', price: '', description: '', rating: '5', category: 'Burgers', imageUrl: 'https://picsum.photos/seed/food/400/300' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (confirm('Delete this item?')) {
      await deleteDoc(doc(db, 'menu', id));
      toast.success('Item deleted');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: new Date().toISOString() });
    toast.success(`Order status updated to ${status}`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to delete this order from history? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        toast.success('Order deleted successfully');
      } catch (error: any) {
        toast.error('Failed to delete order: ' + error.message);
      }
    }
  };

  const renderDashboard = () => {
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((acc, o) => acc + o.totalAmount, 0);

    const stats = [
      { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-brand-500', bg: 'bg-brand-50' },
      { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-50' },
      { label: 'Shop Status', value: shopStatus.toUpperCase(), icon: Power, color: shopStatus === 'open' ? 'text-green-500' : 'text-red-500', bg: shopStatus === 'open' ? 'bg-green-50' : 'bg-red-50', onClick: toggleShopStatus },
      { label: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
    ];

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label}
              onClick={stat.onClick}
              className={cn(
                "glass-luxury p-6 rounded-[2rem] luxury-shadow flex items-center gap-4 transition-all",
                stat.onClick && "cursor-pointer active:scale-95 hover:bg-brand-50/50"
              )}
            >
              <div className={cn("p-4 rounded-2xl transition-colors", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</p>
                <p className={cn("text-2xl font-bold transition-colors", stat.color)}>{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] luxury-shadow border border-brand-50 overflow-hidden">
          <div className="p-8 border-b border-brand-50 flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-brand-900">Recent Orders</h3>
            <button onClick={() => setActiveTab('orders')} className="text-brand-500 text-xs font-black uppercase tracking-widest hover:text-brand-600 transition-all">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="px-8 py-6 font-black">Order ID</th>
                  <th className="px-8 py-6 font-black">Customer</th>
                  <th className="px-8 py-6 font-black">Status</th>
                  <th className="px-8 py-6 font-black">Amount</th>
                  <th className="px-8 py-6 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-brand-50/50 transition-colors group">
                    <td className="px-8 py-5 font-bold text-brand-500 text-sm">#{order.id.slice(-6)}</td>
                    <td className="px-8 py-5 text-sm text-gray-600 font-medium">{order.deliveryAddress}</td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        order.status === 'delivered' ? "bg-green-100 text-green-600" :
                        order.status === 'cancelled' ? "bg-red-100 text-red-600" :
                        order.status === 'picked_up' ? "bg-blue-100 text-blue-600" :
                        "bg-brand-100 text-brand-500"
                      )}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-bold text-brand-900">₹{order.totalAmount.toFixed(0)}</td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderMenu = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Menu Items</h3>
        <button 
          onClick={() => { setEditingItem(null); setMenuForm({ name: '', price: '', description: '', rating: '5', category: 'Burgers', imageUrl: 'https://picsum.photos/seed/food/400/300' }); setShowMenuModal(true); }}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Food
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <motion.div layout key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group">
            <div className="relative h-48">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingItem(item); setMenuForm({ ...item, price: item.price.toString(), rating: item.rating.toString() }); setShowMenuModal(true); }}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-blue-500 hover:bg-white shadow-sm"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteMenu(item.id)}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-red-500 hover:bg-white shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-bold">{item.rating}</span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-lg">{item.name}</h4>
                <span className="text-orange-500 font-bold text-xl">₹{item.price.toFixed(2)}</span>
              </div>
              <div className="mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md">
                  {item.category || 'Uncategorized'}
                </span>
              </div>
              <p className="text-gray-400 text-sm line-clamp-2">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showMenuModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMenuModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">{editingItem ? 'Edit Food' : 'Add New Food'}</h3>
              <form onSubmit={handleAddMenu} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-500 block mb-1">Food Name</label>
                  <input 
                    required value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-500 block mb-1">Price (₹)</label>
                    <input 
                      required type="number" step="0.01" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-500 block mb-1">Category</label>
                    <select 
                      required value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                    >
                      {['Burgers', 'Pizza', 'Sushi', 'Desserts', 'Drinks'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-500 block mb-1">Rating (1-5)</label>
                  <input 
                    required type="number" step="0.1" min="1" max="5" value={menuForm.rating} onChange={e => setMenuForm({...menuForm, rating: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-500 block mb-1">Description</label>
                  <textarea 
                    required rows={3} value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-500 block mb-1">Image URL</label>
                  <input 
                    required value={menuForm.imageUrl} onChange={e => setMenuForm({...menuForm, imageUrl: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowMenuModal(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-serif font-bold text-brand-900">Incoming Orders</h3>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <Clock className="w-3 h-3" />
          Real-time Updates
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {orders.map((order) => (
          <motion.div layout key={order.id} className="bg-white p-8 rounded-[2.5rem] luxury-shadow border border-brand-50 flex flex-col md:flex-row gap-8 group relative">
            <button 
              onClick={() => handleDeleteOrder(order.id)}
              className="absolute top-6 right-6 p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-black text-brand-500 uppercase tracking-widest">#{order.id.slice(-6)}</span>
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  order.status === 'delivered' ? "bg-green-100 text-green-600" : 
                  order.status === 'picked_up' ? "bg-blue-100 text-blue-600" :
                  "bg-brand-100 text-brand-500"
                )}>{order.status.replace('_', ' ')}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-bold">Delivery Address</p>
                    <p className="text-sm text-gray-500">{order.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-bold">Customer Phone</p>
                    <p className="text-sm text-gray-500">{order.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-bold">Order Time</p>
                    <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {order.driverId && (
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-orange-500 mt-1" />
                    <div>
                      <p className="text-sm font-bold">Driver Assigned</p>
                      <p className="text-sm text-gray-500">
                        {drivers.find(d => d.id === order.driverId)?.name || 'Assigned'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6">
              <p className="text-sm font-bold mb-4">Items ({order.items.length})</p>
              <div className="space-y-2 mb-6 max-h-32 overflow-y-auto">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-500">{item.quantity}x {item.name}</span>
                    <span className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg mb-6 pt-4 border-t border-gray-50">
                <span>Total</span>
                <span className="text-orange-500">₹{order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {order.status === 'pending' && (
                  <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="col-span-2 bg-orange-500 text-white py-2 rounded-xl font-bold text-sm">Accept Order</button>
                )}
                {order.status === 'accepted' && (
                  <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="col-span-2 bg-blue-500 text-white py-2 rounded-xl font-bold text-sm">Start Preparing</button>
                )}
                {order.status === 'preparing' && (
                  confirmSendOrderId === order.id ? (
                    <button 
                      onClick={() => {
                        updateOrderStatus(order.id, 'out_for_delivery');
                        setConfirmSendOrderId(null);
                      }} 
                      className="col-span-2 bg-green-500 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send Order
                    </button>
                  ) : (
                    <button 
                      onClick={() => setConfirmSendOrderId(order.id)} 
                      className="col-span-2 bg-purple-500 text-white py-2 rounded-xl font-bold text-sm"
                    >
                      Out for Delivery
                    </button>
                  )
                )}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="col-span-2 border border-red-200 text-red-500 py-2 rounded-xl font-bold text-sm">Cancel</button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderDrivers = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">Delivery Drivers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <div key={driver.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center overflow-hidden">
                {driver.profilePicture ? (
                  <img src={driver.profilePicture} alt={driver.name} className="w-full h-full object-cover" />
                ) : (
                  <Truck className="w-8 h-8 text-orange-500" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-lg">{driver.name}</h4>
                <p className="text-sm text-gray-400">{driver.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { setSelectedDriver(driver); setShowChatModal(true); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-50 text-orange-500 font-bold text-sm hover:bg-orange-100 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </button>
              <button className="px-4 py-3 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChatModal && selectedDriver && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowChatModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg h-[600px] flex flex-col relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden">
                    {selectedDriver?.profilePicture ? (
                      <img src={selectedDriver.profilePicture} alt="Driver" className="w-full h-full object-cover" />
                    ) : (
                      <Truck className="w-5 h-5 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold">{selectedDriver.name}</h4>
                    <p className="text-xs text-green-500 font-medium">Online</p>
                  </div>
                </div>
                <button onClick={() => setShowChatModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
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
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
                <button 
                  type="submit"
                  className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderDispatch = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">Dispatch Orders</h3>
      <p className="text-gray-500">Send prepared orders to delivery drivers.</p>
      <div className="grid grid-cols-1 gap-6">
        {orders.filter(o => o.status === 'preparing' || o.status === 'accepted').map((order) => (
          <motion.div layout key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-orange-500">#{order.id.slice(-6)}</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-600">{order.status}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-bold">Delivery Address</p>
                    <p className="text-sm text-gray-500">{order.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-bold">Order Time</p>
                    <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-64 flex items-center justify-center">
              <button 
                onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
              >
                <Send className="w-5 h-5" />
                Send to Driver
              </button>
            </div>
          </motion.div>
        ))}
        {orders.filter(o => o.status === 'preparing' || o.status === 'accepted').length === 0 && (
          <div className="bg-white p-12 rounded-3xl text-center border border-gray-100">
            <ClipboardList className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Orders to Dispatch</h3>
            <p className="text-gray-400">Orders will appear here once they are accepted or preparing.</p>
          </div>
        )}
      </div>
    </div>
  );

  const handleUpdateProfilePicture = async () => {
    if (!auth.currentUser) return;
    const url = prompt("Please enter the direct URL for your profile picture:");
    if (!url) return;
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        profilePicture: url,
        updatedAt: new Date().toISOString()
      });
      toast.success("Profile picture updated!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-serif font-light text-brand-900 tracking-tight">Admin Settings</h1>
      <div className="bg-white p-10 rounded-[3rem] luxury-shadow border border-brand-50 text-center">
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className="w-full h-full rounded-[2.5rem] charcoal-gradient flex items-center justify-center overflow-hidden luxury-shadow border-4 border-white">
            {userData?.profilePicture ? (
              <img src={userData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-brand-500" />
            )}
          </div>
          <button 
            onClick={handleUpdateProfilePicture}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <Plus className="w-5 h-5 text-brand-900" />
          </button>
        </div>
        <h3 className="text-2xl font-serif font-light text-brand-900 tracking-tight mb-1">{userData?.name || auth.currentUser?.displayName || 'Admin'}</h3>
        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-10">{auth.currentUser?.email}</p>
        
        <div className="space-y-4">
          <div className="p-6 bg-brand-50 rounded-2xl text-left border border-brand-50">
            <h4 className="text-xs font-black uppercase tracking-widest mb-2 text-brand-900">Admin Account Info</h4>
            <div className="space-y-1">
               <p className="text-sm font-medium text-gray-500">Role: Administrator</p>
               <p className="text-sm font-medium text-gray-500">Admin ID: {userData?.easyMakerId || 'N/A'}</p>
               <p className="text-sm font-medium text-gray-500">Member Since: {new Date(userData?.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          <button 
            onClick={() => signOut(auth)}
            className="w-full bg-red-50 text-red-500 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl hover:bg-red-100 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 text-center space-y-6">
        <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto">
          <Info className="w-10 h-10 text-orange-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Easy Maker Admin</h2>
          <p className="text-orange-500 font-bold tracking-widest uppercase text-xs">Home Made Food Delivery</p>
        </div>
        <p className="text-gray-500 leading-relaxed">
          Welcome to the command center of <strong>Home Made Food Delivery</strong>. 
          Our mission is to bridge the gap between talented home cooks and hungry customers, 
          ensuring every meal is delivered with care and quality.
        </p>
        
        <div className="grid grid-cols-1 gap-4 pt-6">
          <div className="p-6 bg-gray-50 rounded-2xl flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <MapPin className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Headquarters</p>
              <p className="font-medium">123 Gourmet Lane, Foodie City</p>
            </div>
          </div>

          <a 
            href="https://whatsapp.com/channel/0029Vb7UGl90AgWJQzLO1M34" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-6 bg-green-50 rounded-2xl flex items-center justify-between hover:bg-green-100 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase">Official Channel</p>
                <p className="font-bold text-gray-900">WhatsApp Support</p>
              </div>
            </div>
            <ExternalLink className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-all" />
          </a>
        </div>

        <div className="pt-8 border-t border-gray-50">
          <p className="text-xs text-gray-400">© 2026 Easy Maker • Version 2.0.4</p>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'menu' && renderMenu()}
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'dispatch' && renderDispatch()}
          {activeTab === 'drivers' && renderDrivers()}
          {activeTab === 'coupons' && renderCoupons()}
          {activeTab === 'settings' && renderSettings()}
          {activeTab === 'about' && renderAbout()}
          {activeTab === 'users' && (
            <div className="bg-white p-12 rounded-3xl text-center border border-gray-100">
              <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">User Management</h3>
              <p className="text-gray-400">This section is under development.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </AdminLayout>
  );
}
