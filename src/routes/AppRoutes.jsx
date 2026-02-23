import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import MyCourses from '../pages/MyCourses';
import Profile from '../pages/Profile';
import Construction from '../pages/Construction';
import CourseGuard from '../components/CourseGuard';
import CourseRoom from '../pages/CourseRoom'; // ✅ อย่าลืม Import
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

const PublicRoute = ({ children }) => {
    const { currentUser } = useAuth();
    if (currentUser) return <Navigate to="/dashboard" />;
    return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/landing" element={<Navigate to="/" />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/courses" element={<MyCourses />} />

        {/* -------------------------------------------------------
            ✅ จุดที่ต้องเปลี่ยน (Course Routes)
           ------------------------------------------------------- */}
        
        {/* 1. คอร์สครู: ยุบรวมเหลือบรรทัดเดียว ใช้ CourseRoom */}
        <Route path="/course/teacher/*" element={
            <CourseGuard courseId="course-teacher">
                <CourseRoom />
            </CourseGuard>
        } />

        {/* 2. คอร์สนักเรียน: (ยังใช้แบบเดิมได้ หรือจะเปลี่ยนเป็น CourseRoom ในอนาคตก็ได้) */}
        <Route path="/course/student" element={
            <CourseGuard courseId="course-student">
                <div className="h-[calc(100vh-100px)] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                    <iframe 
                    src="https://chpspace.my.canva.site/the-learning-and-happiness-ecosystem-space" 
                    className="w-full h-full border-0" 
                    title="Student Space" 
                    loading="lazy"
                    />
                </div>
            </CourseGuard>
        } />
        
        {/* 3. คอร์ส AI */}
        <Route path="/course/ai-era" element={
            <CourseGuard courseId="course-ai">
                <Construction message="InSPIRE 360 in AI Era is Coming Soon" />
            </CourseGuard>
        } />

      </Route>
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}