import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { 
  Search, 
  ShoppingBag, 
  History, 
  User, 
  Home, 
  Plus, 
  Minus, 
  Star, 
  MapPin, 
  Clock,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Moon,
  Sun,
  Bell,
  Heart,
  Filter,
  ChevronRight,
  MapPinned,
  PhoneCall,
  Info,
  ExternalLink,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { signOut } from 'firebase/auth';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const driverIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ff8c42; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; items-center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const restaurantIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; items-center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const customerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; items-center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

function MapUpdater({ driverLoc, customerLoc }: { driverLoc: [number, number], customerLoc: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (customerLoc) {
      const bounds = L.latLngBounds([driverLoc, customerLoc]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(driverLoc, 15);
    }
  }, [driverLoc, customerLoc, map]);
  return null;
}

export default function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [cart, setCart] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLocating, setIsLocating] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [customerLocation, setCustomerLocation] = useState<[number, number] | null>(null);
  const prevStatuses = useRef<Record<string, string>>({});

  const trackingOrder = orders.find(o => o.id === trackingOrderId);

  const categories = ['All', 'Burgers', 'Pizza', 'Sushi', 'Desserts', 'Drinks'];

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Audio play failed:", e));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation is not supported by your browser");
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // In a real app, we'd reverse geocode here. For now, we'll set a placeholder or just the coords.
        const addrInput = document.getElementById('delivery-address') as HTMLInputElement;
        if (addrInput) {
          addrInput.value = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        }
        setIsLocating(false);
        toast.success("Location updated!");
      },
      (error) => {
        setIsLocating(false);
        toast.error("Unable to retrieve your location");
      }
    );
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCustomerLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  useEffect(() => {
    // Status change notifications
    orders.forEach(order => {
      const prevStatus = prevStatuses.current[order.id];
      if (prevStatus && prevStatus !== order.status) {
        let message = "";
        if (order.status === 'picked_up') {
          message = "🛵 Order picked up! Rider is on the way.";
          setTrackingOrderId(order.id); // Auto-open tracking map on pickup
        }
        if (order.status === 'delivered') message = "✅ Order delivered! Enjoy your meal.";
        if (order.status === 'accepted') message = "👨‍🍳 Restaurant accepted your order.";
        
        if (message) {
          toast.success(message, { duration: 5000 });
          playNotificationSound();
        }
      }
      prevStatuses.current[order.id] = order.status;
    });
  }, [orders]);

  useEffect(() => {
    const qMenu = query(collection(db, 'menu'));
    const unsubMenu = onSnapshot(qMenu, (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Menu listener error:", error);
    });

    if (auth.currentUser) {
      const qOrders = query(collection(db, 'orders'), where('customerId', '==', auth.currentUser.uid));
      const unsubOrders = onSnapshot(qOrders, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      }, (error) => {
        console.error("Orders listener error:", error);
      });
      return () => { unsubMenu(); unsubOrders(); };
    }

    return () => unsubMenu();
  }, []);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const placeOrder = async (address: string, phone: string) => {
    if (!auth.currentUser) return;
    try {
      const orderData = {
        customerId: auth.currentUser.uid,
        items: cart,
        status: 'pending',
        driverId: null,
        totalAmount,
        deliveryAddress: address,
        customerPhone: phone,
        customerCoords: customerLocation ? { lat: customerLocation[0], lng: customerLocation[1] } : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      setActiveTab('success');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredMenu = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderHome = () => (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-serif font-light tracking-tight text-brand-900 leading-tight">
            Hey, <span className="font-bold italic text-brand-500">{auth.currentUser?.displayName?.split(' ')[0] || 'Foodie'}</span>! 👋
          </h1>
          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
            <MapPin className="w-3 h-3 text-brand-500" />
            <span>Deliver to: Home • 123 Street</span>
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playNotificationSound();
            toast("No new notifications", {
              description: "We'll let you know when your order status changes.",
              icon: <Bell className="w-4 h-4 text-brand-500" />
            });
          }}
          className="w-14 h-14 rounded-2xl bg-white luxury-shadow flex items-center justify-center relative border border-brand-50"
        >
          <Bell className="w-6 h-6 text-gray-300" />
          <span className="absolute top-4 right-4 w-2 h-2 bg-brand-500 rounded-full border-2 border-white" />
        </motion.button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
          <input 
            type="text"
            placeholder="Craving something specific?"
            className="w-full pl-14 pr-6 py-5 bg-white rounded-2xl luxury-shadow border-none focus:ring-1 focus:ring-brand-500/30 outline-none transition-all placeholder:text-gray-300 text-sm font-medium"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="w-16 h-16 charcoal-gradient text-white rounded-2xl flex items-center justify-center luxury-shadow">
          <Filter className="w-6 h-6" />
        </button>
      </div>

      {/* Active Orders */}
      {orders.filter(o => ['accepted', 'preparing', 'picked_up'].includes(o.status)).length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-brand-900 uppercase tracking-[0.2em]">Active Orders</h3>
            <button onClick={() => setActiveTab('history')} className="text-brand-500 text-[10px] font-black uppercase tracking-widest">View All</button>
          </div>
          <div className="space-y-4">
            {orders.filter(o => ['accepted', 'preparing', 'picked_up'].includes(o.status)).map(order => (
              <div key={order.id} className="charcoal-gradient p-8 rounded-[2.5rem] text-white luxury-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 group-hover:scale-110 transition-transform duration-1000" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">#{order.id.slice(-6)}</p>
                    <h4 className="text-2xl font-serif font-light tracking-tight">{order.status.replace('_', ' ')}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                      <Clock className="w-3 h-3" />
                      Estimated: 15-20 mins
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTrackingOrderId(order.id)}
                    className="px-8 py-4 bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-500/20"
                  >
                    Track Live
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black text-brand-900 uppercase tracking-[0.2em]">Categories</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
          {categories.map((cat) => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2",
                selectedCategory === cat 
                  ? "charcoal-gradient text-white luxury-shadow" 
                  : "bg-white text-gray-400 luxury-shadow border border-brand-50"
              )}
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Featured Items / Popular */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black text-brand-900 uppercase tracking-[0.2em]">Popular Dishes</h3>
          <button className="text-brand-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-8">
          {filteredMenu.map((item, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id} 
              className="bg-white rounded-[3rem] luxury-shadow border border-brand-50 overflow-hidden group flex flex-col sm:flex-row"
            >
              <div className="relative w-full sm:w-56 h-56 sm:h-auto overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <button className="absolute top-6 left-6 w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-gray-400 hover:text-brand-500 transition-all luxury-shadow">
                  <Heart className="w-5 h-5" />
                </button>
                <div className="absolute bottom-6 right-6 charcoal-gradient text-white px-4 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                  <Star className="w-3 h-3 fill-brand-500 text-brand-500" />
                  {item.rating}
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-serif text-2xl font-light text-brand-900 tracking-tight leading-tight">{item.name}</h4>
                    <span className="text-brand-500 font-bold text-3xl">₹{item.price.toFixed(0)}</span>
                  </div>
                  <p className="text-gray-400 text-sm font-medium line-clamp-2 mb-8 leading-relaxed">{item.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" />
                    20-30 min
                  </div>
                  <div className="w-1 h-1 bg-brand-500/20 rounded-full" />
                  <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Free Delivery</div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addToCart(item)}
                    className="ml-auto charcoal-gradient text-white p-4 rounded-2xl luxury-shadow transition-all"
                  >
                    <Plus className="w-6 h-6" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCart = () => (
    <div className="space-y-8 pb-32">
      <h1 className="text-3xl font-bold text-brand-900">My Basket</h1>
      {cart.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-10 h-10 text-brand-200" />
          </div>
          <h3 className="text-xl font-bold text-brand-900">Your basket is empty</h3>
          <p className="text-gray-400 max-w-[200px] mx-auto">Looks like you haven't added anything yet.</p>
          <button 
            onClick={() => setActiveTab('home')} 
            className="text-brand-500 font-bold hover:underline"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            {cart.map((item) => (
              <motion.div 
                layout
                key={item.id} 
                className="bg-white p-4 rounded-3xl soft-shadow border border-gray-50 flex items-center gap-4"
              >
                <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-brand-900">{item.name}</h4>
                  <p className="text-brand-500 font-bold">₹{item.price.toFixed(0)}</p>
                </div>
                <div className="flex items-center gap-3 bg-brand-50 p-2 rounded-2xl">
                  <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-white rounded-lg transition-all text-brand-900"><Minus className="w-4 h-4" /></button>
                  <span className="font-bold w-4 text-center text-brand-900">{item.quantity}</span>
                  <button onClick={() => addToCart(item)} className="p-1 hover:bg-white rounded-lg transition-all text-brand-900"><Plus className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-brand-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl shadow-brand-100">
            <div className="space-y-3">
              <div className="flex justify-between text-brand-100/60 text-sm">
                <span>Subtotal</span>
                <span className="font-bold text-white">₹{totalAmount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-brand-100/60 text-sm">
                <span>Delivery Fee</span>
                <span className="font-bold text-white">₹20</span>
              </div>
              <div className="h-px bg-white/10 my-4" />
              <div className="flex justify-between font-bold text-2xl">
                <span>Total</span>
                <span className="text-brand-500">₹{(totalAmount + 20).toFixed(0)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-brand-100/40 uppercase tracking-widest">Delivery Address</label>
                  <button 
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    className="text-[10px] font-bold text-brand-500 flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    {isLocating ? "Locating..." : "Use Current Location"}
                  </button>
                </div>
                <div className="relative">
                  <MapPinned className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 w-5 h-5" />
                  <input 
                    id="delivery-address" 
                    type="text" 
                    placeholder="Where should we drop it?" 
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 transition-all placeholder:text-white/20" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-100/40 uppercase tracking-widest">Phone Number</label>
                <div className="relative">
                  <PhoneCall className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 w-5 h-5" />
                  <input 
                    id="delivery-phone" 
                    type="text" 
                    placeholder="In case we need to call" 
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 transition-all placeholder:text-white/20" 
                  />
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const addr = (document.getElementById('delivery-address') as HTMLInputElement).value;
                  const phone = (document.getElementById('delivery-phone') as HTMLInputElement).value;
                  if (!addr || !phone) return toast.error('Please fill in all details');
                  placeOrder(addr, phone);
                }}
                className="w-full bg-brand-500 text-white font-bold py-5 rounded-2xl shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 text-lg"
              >
                Checkout Now
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-8 pb-32">
      <h1 className="text-3xl font-bold text-brand-900">My Orders</h1>
      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <History className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No orders yet. Time to eat!</p>
          </div>
        ) : (
          orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={order.id} 
              className="bg-white p-6 rounded-[2rem] soft-shadow border border-gray-50"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-brand-500 uppercase tracking-widest">#{order.id.slice(-6)}</p>
                  <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  order.status === 'delivered' ? "bg-green-100 text-green-600" : "bg-brand-100 text-brand-500"
                )}>{order.status}</span>
              </div>
              <div className="space-y-3 mb-6">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400">{item.quantity}x</span>
                      <span className="text-gray-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-brand-900">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-gray-50 gap-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-medium">Total Amount Paid</div>
                  <span className="font-bold text-xl text-brand-900">₹{order.totalAmount.toFixed(0)}</span>
                </div>
                {['accepted', 'preparing', 'picked_up'].includes(order.status) && (
                  <button 
                    onClick={() => setTrackingOrderId(order.id)}
                    className="px-6 py-3 bg-brand-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-100"
                  >
                    Track Live
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8 pb-32">
      <h1 className="text-3xl font-bold text-brand-900">Settings</h1>
      <div className="bg-white p-8 rounded-[2.5rem] soft-shadow border border-gray-50 text-center">
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className="w-full h-full rounded-[2.5rem] bg-brand-50 flex items-center justify-center overflow-hidden border-4 border-white soft-shadow">
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-brand-200" />
            )}
          </div>
          <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <h3 className="text-2xl font-bold text-brand-900">{auth.currentUser?.displayName || 'Hungry User'}</h3>
        <p className="text-gray-400 mb-10">{auth.currentUser?.email}</p>
        
        <div className="space-y-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors", isDarkMode ? "bg-yellow-100 text-yellow-600" : "bg-gray-200 text-gray-500")}>
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <span className="font-bold text-brand-900">Dark Appearance</span>
            </div>
            <div className={cn("w-12 h-6 rounded-full transition-all relative", isDarkMode ? "bg-brand-500" : "bg-gray-300")}>
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", isDarkMode ? "right-1" : "left-1")} />
            </div>
          </button>
          
          <button className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <span className="font-bold text-brand-900">Notifications</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-900 transition-colors" />
          </button>

          <div className="p-6 bg-brand-50 rounded-[2rem] text-left space-y-4 border border-brand-100">
            <div className="flex items-center gap-3 text-brand-900">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="font-bold">About Easy Maker</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              We specialize in <strong>Home Made Food Delivery</strong>, bringing the warmth of home-cooked meals straight to your doorstep.
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
                className="flex items-center justify-between p-3 bg-white rounded-xl hover:bg-brand-100 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-brand-900">Join our WhatsApp</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-brand-500" />
              </a>
            </div>
          </div>

          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-4 p-5 text-red-500 font-bold hover:bg-red-50 rounded-3xl transition-all"
          >
            <div className="w-10 h-10 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("min-h-screen transition-colors duration-300", isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900")}>
      <div className="max-w-md mx-auto px-6 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'search' && (
               <div className="space-y-8">
                 <h1 className="text-3xl font-bold text-brand-900">Search</h1>
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="text"
                      placeholder="Search for food..."
                      autoFocus
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl soft-shadow border-none focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {filteredMenu.map(item => (
                      <div key={item.id} className="bg-white p-4 rounded-2xl soft-shadow border border-gray-50 flex items-center gap-4">
                        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                        <div className="flex-1">
                          <h4 className="font-bold text-brand-900">{item.name}</h4>
                          <p className="text-brand-500 font-bold">₹{item.price.toFixed(0)}</p>
                        </div>
                        <button onClick={() => addToCart(item)} className="p-2 bg-brand-50 text-brand-500 rounded-xl hover:bg-brand-500 hover:text-white transition-colors"><Plus className="w-5 h-5" /></button>
                      </div>
                    ))}
                  </div>
               </div>
            )}
            {activeTab === 'cart' && renderCart()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'success' && (
              <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-6">
                <motion.div 
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-100"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-brand-900">Order Placed!</h2>
                <p className="text-gray-500 max-w-xs">Thank you for ordering. Your food is being prepared and will be delivered soon.</p>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="bg-brand-900 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-brand-100"
                >
                  Track Order
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-6 left-6 right-6 h-20 glass rounded-[2.5rem] flex items-center justify-around px-4 z-40 soft-shadow transition-all duration-500",
        isDarkMode ? "bg-gray-900/80 border-gray-800" : "bg-white/80 border-white/20"
      )}>
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'search', icon: Search, label: 'Search' },
          { id: 'cart', icon: ShoppingBag, label: 'Basket', badge: cart.length },
          { id: 'history', icon: History, label: 'Orders' },
          { id: 'profile', icon: User, label: 'Me' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative",
              activeTab === item.id ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <motion.div
              animate={activeTab === item.id ? { scale: [1, 1.2, 1] } : {}}
            >
              <item.icon className={cn("w-6 h-6", activeTab === item.id ? "fill-brand-500/10" : "")} />
            </motion.div>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", activeTab === item.id ? "opacity-100" : "opacity-0")}>
              {item.label}
            </span>
            {item.badge > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-brand-900 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                {item.badge}
              </span>
            )}
            {activeTab === item.id && (
              <motion.div 
                layoutId="nav-indicator"
                className="absolute -bottom-1 w-1 h-1 bg-brand-500 rounded-full"
              />
            )}
          </button>
        ))}
      </nav>

      {/* Tracking Modal */}
      <AnimatePresence>
        {trackingOrderId && trackingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setTrackingOrderId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[80vh] relative z-10 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Live Tracking</h3>
                  <p className="text-sm text-gray-400">Order #{trackingOrder.id.slice(-6)} • {trackingOrder.status.replace('_', ' ')}</p>
                </div>
                <button 
                  onClick={() => setTrackingOrderId(null)}
                  className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 relative">
                {!trackingOrder.driverLocation && (
                  <div className="absolute inset-0 z-[2000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center animate-bounce">
                      <Truck className="w-8 h-8 text-brand-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-brand-900">Waiting for Driver</h4>
                      <p className="text-sm text-gray-500">The driver hasn't started moving yet. We'll show their location here soon!</p>
                    </div>
                  </div>
                )}
                <MapContainer 
                  center={customerLocation || [12.9716, 77.5946]} 
                  zoom={15} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Restaurant (Static Bangalore for demo if not set) */}
                  <Marker position={[12.9716, 77.5946]} icon={restaurantIcon}>
                    <Popup>Restaurant</Popup>
                  </Marker>

                  {/* Driver */}
                  {trackingOrder.driverLocation && (
                    <>
                      <Marker position={[trackingOrder.driverLocation.lat, trackingOrder.driverLocation.lng]} icon={driverIcon}>
                        <Popup>Delivery Partner</Popup>
                      </Marker>
                      
                      {/* Route Line */}
                      {(trackingOrder.customerCoords || customerLocation) && (
                        <Polyline 
                          positions={[
                            [trackingOrder.driverLocation.lat, trackingOrder.driverLocation.lng],
                            trackingOrder.customerCoords 
                              ? [trackingOrder.customerCoords.lat, trackingOrder.customerCoords.lng]
                              : (customerLocation as [number, number])
                          ]}
                          color="#ff8c42"
                          weight={4}
                          dashArray="10, 10"
                          opacity={0.6}
                        />
                      )}

                      <MapUpdater 
                        driverLoc={[trackingOrder.driverLocation.lat, trackingOrder.driverLocation.lng]} 
                        customerLoc={trackingOrder.customerCoords 
                          ? [trackingOrder.customerCoords.lat, trackingOrder.customerCoords.lng] 
                          : customerLocation} 
                      />
                    </>
                  )}

                  {/* Customer */}
                  {(trackingOrder.customerCoords || customerLocation) && (
                    <Marker 
                      position={trackingOrder.customerCoords 
                        ? [trackingOrder.customerCoords.lat, trackingOrder.customerCoords.lng] 
                        : (customerLocation as [number, number])} 
                      icon={customerIcon}
                    >
                      <Popup>You</Popup>
                    </Marker>
                  )}
                </MapContainer>

                {/* Floating Status Card */}
                <div className="absolute bottom-6 left-6 right-6 z-[1000]">
                  <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center">
                        <Truck className="w-6 h-6 text-brand-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Estimated Delivery</p>
                        <p className="text-xl font-bold">15-20 mins</p>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-bold rounded-full uppercase">
                          {trackingOrder.status === 'picked_up' ? 'On the way' : 'Preparing'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
