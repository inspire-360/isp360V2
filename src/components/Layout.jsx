import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, BookOpen, LogOut, AlertTriangle, Menu, X, User, Settings, ChevronRight } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { useAuth } from '../contexts/AuthContext';
import { useLine } from '../contexts/LineContext';
import { usePresence } from '../hooks/usePresence'; // ✅ 1. Import Hook

export default function Layout() {
  const { currentUser } = useAuth();
  const { logoutLine } = useLine();
  
  // ✅ 2. เรียกใช้ Hook เพื่อส่งสัญญาณ Online
  usePresence();
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  const [userData, setUserData] = useState({
    name: 'User',
    role: 'Learner', 
    photoURL: ''
  });

  useEffect(() => {
    if (currentUser) {
      const unsub = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUserData({
            name: data.name || currentUser.displayName || currentUser.email?.split('@')[0],
            role: data.role || 'Learner',
            photoURL: data.photoURL || currentUser.photoURL
          });
        }
      });
      return () => unsub(); 
    }
  }, [currentUser]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log(`User left screen`);
      } else {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 4000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleLogout = async () => {
    try {
      sessionStorage.setItem('manualLogout', 'true');
      logoutLine(); 
      await auth.signOut();
      window.location.href = '/'; 
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const menuItems = [
    { icon: <Home size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <BookOpen size={20} />, label: 'My Courses', path: '/courses' },
    { icon: <Settings size={20} />, label: 'Profile Settings', path: '/profile' }, 
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {showWarning && (
        <div className="fixed top-4 right-4 bg-orange-500 text-white px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-bounce">
          <AlertTriangle size={24} />
          <div>
            <p className="font-bold">Focus Mode Active!</p>
            <p className="text-sm">ยินดีต้อนรับกลับ ระบบได้บันทึกการออกจากหน้าจอไว้แล้ว</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-xl transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <span className="text-2xl font-black text-gray-800 tracking-tight">InSPIRE <span className="text-primary">360°</span></span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
              {item.path === '/courses' && <ChevronRight size={16} className="ml-auto opacity-50" />}
            </NavLink>
          ))}
        </nav>

        {/* User Profile Section (Bottom) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <img 
                    src={userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`} 
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
                <div className="overflow-hidden flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{userData.name}</p>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider bg-primary/10 inline-block px-2 py-0.5 rounded-md mt-0.5">
                        {userData.role}
                    </p>
                </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                <LogOut size={18} /> ออกจากระบบ
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-72 transition-all duration-300">
        <header className="bg-white/80 backdrop-blur-md shadow-sm p-4 md:hidden flex justify-between items-center z-30 sticky top-0">
          <span className="font-bold text-primary text-lg">InSPIRE 360°</span>
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 p-2 rounded-lg hover:bg-gray-100">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}