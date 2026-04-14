import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [confirmSendOrderId, setConfirmSendOrderId] = useState<string | null>(null);
  const prevOrdersCount = useRef<number | null>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);
  
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

    return () => {
      unsubOrders();
      unsubMenu();
      unsubDrivers();
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

  const renderDashboard = () => {
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((acc, o) => acc + o.totalAmount, 0);

    const stats = [
      { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
      { label: 'Delivered', value: deliveredOrders.length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
      { label: 'Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
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

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-lg">Recent Orders</h3>
            <button onClick={() => setActiveTab('orders')} className="text-orange-500 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Order ID</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">#{order.id.slice(-6)}</td>
                    <td className="px-6 py-4">{order.deliveryAddress}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase",
                        order.status === 'delivered' ? "bg-green-100 text-green-600" :
                        order.status === 'cancelled' ? "bg-red-100 text-red-600" :
                        "bg-orange-100 text-orange-600"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">₹{order.totalAmount.toFixed(2)}</td>
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
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">Incoming Orders</h3>
      <div className="grid grid-cols-1 gap-6">
        {orders.map((order) => (
          <motion.div layout key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-orange-500">#{order.id.slice(-6)}</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  order.status === 'delivered' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                )}>{order.status}</span>
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
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
                <Truck className="w-8 h-8 text-orange-500" />
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
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-orange-500" />
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
