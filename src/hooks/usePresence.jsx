import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export function usePresence() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);

    // 1. ฟังก์ชันอัปเดตเวลา
    const updateStatus = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: serverTimestamp() // ใช้เวลาของ Server เพื่อความแม่นยำ
        });
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    };

    // 2. ทำงานทันทีเมื่อเปิดหน้าเว็บ
    updateStatus();

    // 3. ตั้งเวลาให้ทำงานซ้ำทุกๆ 1 นาที (Heartbeat)
    const interval = setInterval(updateStatus, 60000);

    // 4. Cleanup เมื่อปิดหน้าเว็บ (พยายามปรับสถานะเป็น offline - แต่ไม่การันตี 100% ใน web)
    return () => {
      clearInterval(interval);
    };
  }, [currentUser]);
}