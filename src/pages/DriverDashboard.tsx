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
  Send,
  ArrowRight,
  Info,
  ExternalLink,
  Plus
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
  const [userData, setUserData] = useState<any>(null);
  const [shopStatus, setShopStatus] = useState<'open' | 'closed'>('open');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null);
  const [showSuccessTick, setShowSuccessTick] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const watchId = useRef<number | null>(null);
  const prevAvailableCount = useRef<number | null>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    // Watch driver location if they have an active order
    const activeOrder = myOrders.find(o => ['accepted', 'preparing', 'picked_up'].includes(o.status));
    
    if (activeOrder && navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          // Update order with driver location
          updateDoc(doc(db, 'orders', activeOrder.id), {
            driverLocation: { lat: latitude, lng: longitude },
            updatedAt: new Date().toISOString()
          }).catch(err => console.error("Error updating location:", err));
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
    } else {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [myOrders]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (doc) => {
      if (doc.exists()) {
        setShopStatus(doc.data().status || 'open');
      }
    });

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
      const unsubUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
        setUserData(doc.data());
      });

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

      return () => { unsubAvailable(); unsubMy(); unsubAdmin(); unsubUser(); };
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

  const updateOrderStatus = async (orderId: string, status: string, distance?: number) => {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };
      if (distance !== undefined) updateData.distanceKm = distance;
      
      await updateDoc(doc(db, 'orders', orderId), updateData);
      
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
    { label: 'Earnings', value: `₹${(myOrders.filter(o => o.status === 'delivered').length * 10).toFixed(0)}`, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Active', value: myOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length, icon: ClipboardList, color: 'text-brand-500', bg: 'bg-brand-50' },
  ];

  const renderDashboard = () => (
    <div className="space-y-10">
      {shopStatus === 'closed' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500 text-white p-6 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-red-100 border-4 border-red-400"
        >
          <Info className="w-6 h-6 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-[0.1em] text-center">Shop is currently Closed. No new orders can be placed.</span>
        </motion.div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="glass-luxury p-6 rounded-[2rem] luxury-shadow flex items-center gap-4 border border-brand-50"
          >
            <div className={cn("p-4 rounded-2xl", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-brand-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        <h3 className="text-xs font-black text-brand-900 uppercase tracking-[0.2em]">Available Orders</h3>
        {availableOrders.length === 0 ? (
          <div className="bg-white p-16 rounded-[2.5rem] text-center border border-brand-50 luxury-shadow">
            <Truck className="w-16 h-16 text-brand-100 mx-auto mb-6" />
            <p className="text-gray-400 font-medium">No orders available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {availableOrders.map((order) => (
              <div key={order.id} className="bg-white p-8 rounded-[2.5rem] luxury-shadow border border-brand-50 flex flex-col md:flex-row justify-between items-center gap-8 group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-black text-brand-500 uppercase tracking-widest">#{order.id.slice(-6)}</span>
                    <span className="px-3 py-1 bg-brand-50 text-brand-500 text-[10px] font-black rounded-full uppercase tracking-widest">{order.status}</span>
                  </div>
                  <div className="flex items-start gap-3 group cursor-pointer" onClick={() => openInMaps(order.deliveryAddress)}>
                    <MapPin className="w-5 h-5 text-gray-300 mt-1 group-hover:text-brand-500 transition-colors" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 group-hover:text-brand-900 transition-colors underline decoration-dotted underline-offset-8">{order.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  {confirmAcceptId === order.id ? (
                    <div className="flex gap-3 w-full">
                      <button 
                        onClick={() => {
                          acceptOrder(order.id);
                          openInMaps(order.deliveryAddress);
                          setConfirmAcceptId(null);
                        }}
                        className="flex-1 charcoal-gradient text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest luxury-shadow"
                      >
                        Confirm Accept
                      </button>
                      <button 
                        onClick={() => setConfirmAcceptId(null)}
                        className="flex-1 bg-brand-50 text-gray-400 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-100 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => setConfirmAcceptId(order.id)}
                        className="flex-1 md:flex-none charcoal-gradient text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest luxury-shadow"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => toast.info('Order hidden from your view')}
                        className="flex-1 md:flex-none bg-brand-50 text-gray-400 px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-100 transition-all"
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
    <div className="space-y-8">
      <h3 className="text-xs font-black text-brand-900 uppercase tracking-[0.2em]">My Active Deliveries</h3>
      <div className="grid grid-cols-1 gap-8">
        {myOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map((order) => (
          <div key={order.id} className="bg-white p-8 rounded-[3rem] luxury-shadow border border-brand-50">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h4 className="font-serif text-2xl font-light text-brand-900 tracking-tight">Order #{order.id.slice(-6)}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{order.items.length} items • ₹{order.totalAmount.toFixed(0)}</p>
                </div>
              </div>
              <span className="px-4 py-1.5 bg-brand-50 text-brand-500 text-[10px] font-black rounded-full uppercase tracking-widest">{order.status.replace('_', ' ')}</span>
            </div>
            
            <div className="space-y-5 mb-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-50 rounded-2xl">
                  <MapPin className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Delivery Address</p>
                  <p className="text-sm font-medium text-gray-600">{order.deliveryAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-50 rounded-2xl">
                  <Phone className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Customer Phone</p>
                  <p className="text-sm font-medium text-gray-600">{order.customerPhone}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => openInMaps(order.deliveryAddress)}
                className="flex items-center justify-center gap-3 py-5 bg-brand-100 text-brand-900 rounded-2xl font-black text-[10px] uppercase tracking-widest luxury-shadow border border-brand-50"
              >
                <Navigation className="w-5 h-5" />
                Open Maps
              </button>
              
              {order.status === 'picked_up' ? (
                <button 
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  className="flex items-center justify-center gap-3 py-5 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest luxury-shadow"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Delivered
                </button>
              ) : (
                <button 
                  onClick={() => updateOrderStatus(order.id, 'picked_up')}
                  className="flex items-center justify-center gap-3 py-5 charcoal-gradient text-white rounded-2xl font-black text-[10px] uppercase tracking-widest luxury-shadow"
                >
                  <Truck className="w-5 h-5" />
                  Picked Up
                </button>
              )}
            </div>
          </div>
        ))}
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

  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([
    'https://picsum.photos/seed/delivery1/400/300',
    'https://picsum.photos/seed/delivery2/400/300',
    'https://picsum.photos/seed/delivery3/400/300',
    'https://picsum.photos/seed/delivery4/400/300',
  ]);

  const handleAddGalleryPhoto = () => {
    const url = prompt("Enter Image URL for Gallery:");
    if (url) {
      setGalleryImages([url, ...galleryImages]);
      toast.success("Photo added to gallery!");
    }
  };

  const renderProfile = () => {
    const deliveredOrders = myOrders.filter(o => o.status === 'delivered')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    return (
      <div className="space-y-10">
        <h1 className="text-3xl font-serif font-light text-brand-900 tracking-tight">Driver Profile</h1>
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
          <h3 className="text-2xl font-serif font-light text-brand-900 tracking-tight mb-1">{userData?.name || auth.currentUser?.displayName || 'Driver'}</h3>
          <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-10">{auth.currentUser?.email}</p>
          
          <div className="space-y-6">
            {/* Gallery Section */}
            <div className="text-left space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest">Delivery Gallery</h4>
                  <button 
                    onClick={handleAddGalleryPhoto}
                    className="w-6 h-6 bg-brand-50 text-brand-500 rounded-lg flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button 
                  onClick={() => setShowGallery(!showGallery)}
                  className="text-[10px] font-black text-brand-500 uppercase tracking-widest hover:underline"
                >
                  {showGallery ? "Hide" : "View All"}
                </button>
              </div>
              <AnimatePresence>
                {showGallery && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-2 gap-4 overflow-hidden"
                  >
                    {galleryImages.map((img, i) => (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="aspect-[4/3] rounded-2xl overflow-hidden luxury-shadow bg-gray-100"
                      >
                        <img src={img} alt="Gallery" className="w-full h-full object-cover" />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {!showGallery && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {galleryImages.map((img, i) => (
                    <div key={i} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden luxury-shadow border border-white">
                      <img src={img} alt="Gallery" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent History Section */}
            <div className="text-left space-y-4 pt-4">
              <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest">Recent Success</h4>
              <div className="space-y-3">
                {deliveredOrders.length > 0 ? deliveredOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-brand-50 rounded-2xl border border-brand-100 flex items-center justify-between group hover:bg-white hover:luxury-shadow transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-500 luxury-shadow group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-900">Order #{order.id.slice(-6)}</p>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          {new Date(order.updatedAt).toLocaleDateString()} • ₹{order.totalAmount.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                )) : (
                  <p className="text-xs text-gray-400 text-center py-4 italic">No successful deliveries yet.</p>
                )}
              </div>
            </div>

            <div className="p-8 bg-brand-50 rounded-[2.5rem] text-left space-y-5 border border-brand-50">
            <div className="flex items-center gap-4 text-brand-900">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center luxury-shadow">
                <Info className="w-6 h-6 text-brand-500" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em]">About Easy Driver</h4>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              Part of the <strong className="text-brand-900">Home Made Food Delivery</strong> network. We empower local drivers to deliver fresh, home-cooked meals.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span>Home Made Food Delivery, 123 Gourmet Lane</span>
              </div>
              <a 
                href="https://whatsapp.com/channel/0029Vb7UGl90AgWJQzLO1M34" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white rounded-2xl hover:bg-brand-100 transition-all group luxury-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-brand-900 uppercase tracking-widest">Driver Community</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-brand-500" />
              </a>
            </div>
          </div>

          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-3 p-5 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

  const renderMessages = () => (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-white rounded-[3rem] luxury-shadow border border-brand-50 overflow-hidden">
      <div className="p-8 border-b border-brand-50 flex items-center gap-4 bg-brand-50/30">
        <div className="w-12 h-12 rounded-2xl charcoal-gradient flex items-center justify-center luxury-shadow overflow-hidden">
          {adminUser?.profilePicture ? (
            <img src={adminUser.profilePicture} alt="Admin" className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-brand-500" />
          )}
        </div>
        <div>
          <h4 className="font-serif text-xl font-light text-brand-900 tracking-tight">Admin Support</h4>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Online</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-brand-100/30">
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            "flex flex-col max-w-[85%]",
            msg.senderId === auth.currentUser?.uid ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "px-6 py-4 rounded-[1.5rem] text-sm font-medium leading-relaxed luxury-shadow",
              msg.senderId === auth.currentUser?.uid 
                ? "charcoal-gradient text-white rounded-tr-none" 
                : "bg-white text-gray-600 border border-brand-50 rounded-tl-none"
            )}>
              {msg.text}
            </div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-24 text-gray-300">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest">No messages with admin yet.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-brand-50 flex gap-4">
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message to admin..."
          className="flex-1 px-6 py-4 bg-brand-50 border border-brand-50 rounded-2xl outline-none focus:ring-1 focus:ring-brand-500/30 transition-all text-sm font-medium placeholder:text-gray-300"
        />
        <button 
          type="submit"
          className="charcoal-gradient text-white p-4 rounded-2xl hover:scale-105 transition-all luxury-shadow group"
        >
          <Send className="w-5 h-5 text-brand-500 group-hover:scale-110 transition-transform" />
        </button>
      </form>
    </div>
  );

  return (
    <div className={cn("min-h-screen transition-colors duration-300", isDarkMode ? "bg-gray-900 text-white" : "bg-brand-100 text-gray-900")}>
      {/* Success Tick Overlay */}
      <AnimatePresence>
        {showSuccessTick && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-100/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="flex flex-col items-center"
            >
              <div className="w-40 h-40 charcoal-gradient rounded-[3rem] flex items-center justify-center luxury-shadow mb-8">
                <CheckCircle2 className="w-24 h-24 text-brand-500" />
              </div>
              <h2 className="text-3xl font-serif font-light text-brand-900 tracking-tight">Order Delivered!</h2>
              <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] mt-4">Excellence in Service</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-white border-r border-brand-50 p-8 luxury-shadow">
          <div className="flex items-center gap-4 mb-12">
            <div className="charcoal-gradient p-3 rounded-2xl luxury-shadow">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif font-bold tracking-tight text-brand-900">Easy Driver</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">Delivery Partner</span>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
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
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all group",
                  activeTab === item.id 
                    ? "charcoal-gradient text-white luxury-shadow" 
                    : "text-gray-400 hover:bg-brand-50 hover:text-brand-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-colors", activeTab === item.id ? "text-brand-500" : "text-gray-300 group-hover:text-brand-500")} />
                {item.label}
              </button>
            ))}
          </nav>

          <button onClick={() => signOut(auth)} className="mt-auto flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-400 hover:bg-red-50 hover:text-red-500 transition-all">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10 pb-32 lg:pb-10 max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'orders' && renderMyOrders()}
              {activeTab === 'messages' && renderMessages()}
              {activeTab === 'profile' && renderProfile()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-8 left-8 right-8 h-20 glass-luxury rounded-[2rem] flex items-center justify-around px-8 z-40 luxury-shadow border border-white/20">
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
                "p-4 rounded-2xl transition-all",
                activeTab === item.id ? "charcoal-gradient text-white luxury-shadow scale-110" : "text-gray-400 hover:text-brand-900"
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
