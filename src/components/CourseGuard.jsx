import React, { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getEnrollmentSummary } from '../services/firebase/repositories/enrollmentRepository';

const CourseGuard = ({ children, courseId }) => {
  const { currentUser } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkEnrollment = async () => {
      if (!currentUser || !courseId) {
        if (isMounted) {
          setIsEnrolled(false);
        }
        return;
      }

      try {
        const enrollment = await getEnrollmentSummary(currentUser.uid, courseId);
        if (isMounted) {
          setIsEnrolled(Boolean(enrollment));
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
        if (isMounted) {
          setIsEnrolled(false);
        }
      }
    };

    void checkEnrollment();

    return () => {
      isMounted = false;
    };
  }, [currentUser, courseId]);

  if (isEnrolled === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-gray-500 font-medium">กำลังตรวจสอบสิทธิ์การเข้าเรียน...</p>
      </div>
    );
  }

  if (isEnrolled === false) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">คุณยังไม่ได้ลงทะเบียนเรียนวิชานี้</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          กรุณากดปุ่ม &quot;ลงทะเบียน (Enroll)&quot; ที่หน้าแดชบอร์ดก่อนเข้าสู่บทเรียน เพื่อให้ระบบบันทึกความก้าวหน้าของคุณ
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

  return children;
};

export default CourseGuard;
