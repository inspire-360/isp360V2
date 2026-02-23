import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock } from 'lucide-react';

// Component นี้จะใช้ห่อหุ้มหน้า Course ต่างๆ
const CourseGuard = ({ children, courseId }) => {
  const { currentUser } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(null); // null = loading, true = pass, false = block

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!currentUser || !courseId) return;

      try {
        // เช็คใน Subcollection 'enrollments' ของ User นั้นๆ
        const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);
        const enrollSnap = await getDoc(enrollRef);

        if (enrollSnap.exists()) {
          setIsEnrolled(true);
        } else {
          setIsEnrolled(false);
        }
      } catch (error) {
        console.error("Error checking enrollment:", error);
        setIsEnrolled(false);
      }
    };

    checkEnrollment();
  }, [currentUser, courseId]);

  // 1. กำลังเช็คสถานะ
  if (isEnrolled === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-gray-500 font-medium">กำลังตรวจสอบสิทธิ์การเข้าเรียน...</p>
      </div>
    );
  }

  // 2. ถ้ายังไม่ลงทะเบียน -> บังคับเด้งกลับไปหน้า Dashboard พร้อมแจ้งเตือน (หรือแสดงหน้า Access Denied)
  if (isEnrolled === false) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
            <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">คุณยังไม่ได้ลงทะเบียนเรียนวิชานี้</h2>
        <p className="text-gray-500 mb-8 max-w-md">
            กรุณากดปุ่ม "ลงทะเบียน (Enroll)" ที่หน้าแดชบอร์ดก่อนเข้าสู่บทเรียน เพื่อให้ระบบบันทึกความก้าวหน้าของคุณ
        </p>
        <a 
            href="/dashboard" 
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
        >
            กลับไปลงทะเบียนที่ Dashboard
        </a>
      </div>
    );
  }

  // 3. ผ่านการตรวจสอบ -> อนุญาตให้เข้าถึงเนื้อหา
  return children;
};

export default CourseGuard;