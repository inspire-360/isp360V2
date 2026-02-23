import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Users, Circle } from 'lucide-react';

export default function OnlineUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // ดึงข้อมูล User 20 คนล่าสุดที่ Active (เรียงตามเวลา lastSeen)
    const q = query(
      collection(db, "users"),
      orderBy("lastSeen", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        // คำนวณเวลา: ถ้า lastSeen ห่างจากปัจจุบันไม่เกิน 3 นาที ถือว่า Online
        const lastSeenDate = data.lastSeen?.toDate();
        const now = new Date();
        const diffMinutes = lastSeenDate ? (now - lastSeenDate) / 1000 / 60 : 999;
        
        return {
          id: doc.id,
          ...data,
          isOnline: diffMinutes < 3 // Online ถ้า active ภายใน 3 นาที
        };
      });
      setUsers(activeUsers);
    });

    return () => unsubscribe();
  }, []);

  // กรองเฉพาะคนที่ Online จริงๆ
  const onlineCount = users.filter(u => u.isOnline).length;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Users size={20} className="text-primary" /> เพื่อนที่ออนไลน์
        </h3>
        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          {onlineCount} ออนไลน์
        </span>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="relative">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`} 
                alt={user.name}
                className={`w-10 h-10 rounded-full object-cover border-2 ${user.isOnline ? 'border-green-500' : 'border-gray-200 grayscale'}`}
              />
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name || 'ไม่ระบุชื่อ'}</p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                {user.role === 'learner' ? '🎓 Learner' : '👨‍🏫 Teacher'}
                {!user.isOnline && <span className="text-[10px] ml-1">• ใช้งานล่าสุดเมื่อสักครู่</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}