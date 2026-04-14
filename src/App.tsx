import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import SplashScreen from './pages/SplashScreen';
import RoleSelection from './pages/RoleSelection';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let unsubscribe: () => void;

    if (user && !loading) {
      setRoleLoading(true);
      unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setUserRole(doc.data().role);
        } else {
          setUserRole(null);
        }
        setRoleLoading(false);
      }, (error) => {
        console.error("Error fetching user role:", error);
        setRoleLoading(false);
      });
    } else if (!loading) {
      setUserRole(null);
      setRoleLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, loading]);

  if (showSplash) {
    return <SplashScreen />;
  }

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/role-selection" element={user && !userRole ? <RoleSelection /> : <Navigate to="/" />} />
        
        <Route
          path="/"
          element={
            user ? (
              userRole === 'admin' ? (
                <AdminDashboard />
              ) : userRole === 'driver' ? (
                <DriverDashboard />
              ) : userRole === 'customer' ? (
                <CustomerDashboard />
              ) : (
                <Navigate to="/role-selection" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
