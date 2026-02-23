import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Users, Award, PlayCircle, Clock, 
  Sparkles, Zap, GraduationCap, CheckCircle2, 
  Loader2, Lock, X, Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, getCountFromServer } from 'firebase/firestore';
import OnlineUsers from '../components/OnlineUsers'; // ✅ 1. Import Widget

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  
  const [enrolledCourses, setEnrolledCourses] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0); 
  const [myCertificates, setMyCertificates] = useState(0); 
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [modalError, setModalError] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";
  const displayRole = userRole || "Learner";

  const COURSE_KEYS = {
    "course-teacher": "TEACHER2024", 
    "course-student": "STUDENT2024", 
    "course-ai": "AI2024"            
  };

  const courses = [
    {
      id: "course-teacher",
      title: "InSPIRE for Teacher",
      desc: "หลักสูตรพัฒนาครูนวัตกรผ่านกระบวนการ Design Thinking แบบเข้มข้น 5 Modules",
      icon: <BookOpen className="text-white" size={32} />,
      bgGradient: "bg-gradient-to-br from-blue-500 to-blue-700",
      shadow: "shadow-blue-500/30",
      path: "/course/teacher/module1",
      modules: 5,
      hours: 20,
      requiresCode: true 
    },
    {
      id: "course-student",
      title: "InSPIRE for Student",
      desc: "พื้นที่แห่งความสุขและการเรียนรู้สำหรับนักเรียน เชื่อมต่อจินตนาการด้วยเทคโนโลยี",
      icon: <Globe className="text-white" size={32} />,
      bgGradient: "bg-gradient-to-br from-green-500 to-green-700",
      shadow: "shadow-green-500/30",
      path: "/course/student",
      modules: 8,
      hours: 12,
      requiresCode: false
    },
    {
      id: "course-ai",
      title: "AI & Innovation",
      desc: "เตรียมพร้อมสู่ยุค AI (Coming Soon) เรียนรู้เครื่องมือใหม่ๆ เพื่อการศึกษา",
      icon: <Zap className="text-white" size={32} />,
      bgGradient: "bg-gradient-to-br from-purple-500 to-purple-700",
      shadow: "shadow-purple-500/30",
      path: "/course/ai-era",
      modules: 4,
      hours: 10,
      requiresCode: false 
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser) {
        try {
          const enrollSnapshot = await getDocs(collection(db, "users", currentUser.uid, "enrollments"));
          const enrolledIds = enrollSnapshot.docs.map(doc => doc.id);
          setEnrolledCourses(enrolledIds);

          const coll = collection(db, "users");
          const snapshot = await getCountFromServer(coll);
          setTotalUsers(snapshot.data().count);

          setMyCertificates(0);

        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [currentUser]);

  const systemStats = [
    { 
        label: "ผู้ใช้งานทั้งหมด", 
        value: totalUsers.toLocaleString(),
        icon: <Users size={20} />, 
        color: "text-blue-600", 
        bg: "bg-blue-50" 
    },
    { 
        label: "หลักสูตร", 
        value: courses.length,
        icon: <BookOpen size={20} />, 
        color: "text-purple-600", 
        bg: "bg-purple-50" 
    },
    { 
        label: "ลงทะเบียนแล้ว", 
        value: enrolledCourses.length,
        icon: <GraduationCap size={20} />, 
        color: "text-green-600", 
        bg: "bg-green-50" 
    },
    { 
        label: "ใบรับรอง", 
        value: myCertificates, 
        icon: <Award size={20} />, 
        color: "text-yellow-600", 
        bg: "bg-yellow-50" 
    },
  ];

  const openEnrollModal = (course) => {
    if (enrolledCourses.includes(course.id)) {
        navigate(course.path);
        return;
    }
    if (!course.requiresCode) {
        processEnrollment(course.id, course.path);
        return;
    }
    setSelectedCourse(course);
    setAccessCode('');
    setModalError('');
    setShowModal(true);
  };

  const handleConfirmEnroll = async () => {
    if (!accessCode) {
        setModalError('กรุณากรอกรหัสเข้าเรียน');
        return;
    }
    const correctKey = COURSE_KEYS[selectedCourse.id];
    if (accessCode.trim().toUpperCase() !== correctKey) {
        setModalError('รหัสไม่ถูกต้อง');
        return;
    }
    await processEnrollment(selectedCourse.id, selectedCourse.path);
    setShowModal(false);
  };

  const processEnrollment = async (courseId, path) => {
    setEnrollLoading(true);
    try {
        await setDoc(doc(db, "users", currentUser.uid, "enrollments", courseId), {
            enrolledAt: new Date(),
            progress: 0,
            status: 'active',
            lastAccess: new Date(),
            accessCodeUsed: accessCode || 'none'
        });
        setEnrolledCourses(prev => [...prev, courseId]);
        navigate(path);
    } catch (error) {
        console.error("Enrollment failed:", error);
        alert("เกิดข้อผิดพลาด");
    } finally {
        setEnrollLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40}/></div>;

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans overflow-hidden">
      
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50 -z-10"></div>
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob -z-10"></div>

      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <span className="inline-block px-3 py-1 mb-2 text-xs font-bold tracking-wider text-primary uppercase bg-primary/10 rounded-full border border-primary/20">
                    {displayRole} Dashboard
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                    ยินดีต้อนรับ, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">{displayName}</span>
                </h1>
            </div>
          </div>
        </header>

        {/* ✅ ปรับ Layout: แบ่ง 2 คอลัมน์ (ซ้าย 3/4 เนื้อหา, ขวา 1/4 Widget) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Left Column: Stats & Courses */}
            <div className="lg:col-span-3 space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up delay-100">
                    {systemStats.map((stat, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-2`}>
                                {stat.icon}
                            </div>
                            <div className="text-xl font-black text-gray-900">{stat.value}</div>
                            <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Explore Courses */}
                <div className="animate-fade-in-up delay-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles size={20} className="text-yellow-500"/> หลักสูตรทั้งหมดในระบบ
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {courses.map((course) => {
                            const isEnrolled = enrolledCourses.includes(course.id);
                            return (
                                <div 
                                    key={course.id}
                                    className="group bg-white rounded-3xl p-5 border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 flex flex-col relative overflow-hidden"
                                >
                                    <div className={`h-40 rounded-2xl ${course.bgGradient} ${course.shadow} mb-4 flex items-center justify-center relative overflow-hidden`}>
                                        {isEnrolled ? (
                                            <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-white/30 shadow-lg">
                                                <CheckCircle2 size={12} /> ลงทะเบียนแล้ว
                                            </div>
                                        ) : (
                                            <div className="absolute top-3 right-3 bg-black/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                                                {course.requiresCode ? 'Requires Code' : 'Free Access'}
                                            </div>
                                        )}
                                        <div className="transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                            {course.icon}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 flex-1">
                                        <h4 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                                            {course.title}
                                        </h4>
                                        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
                                            {course.desc}
                                        </p>
                                        
                                        <div className="flex items-center gap-4 text-xs text-gray-400 font-medium pt-2">
                                            <span className="flex items-center gap-1"><BookOpen size={14}/> {course.modules} บทเรียน</span>
                                            <span className="flex items-center gap-1"><Clock size={14}/> {course.hours} ชม.</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-50">
                                        <button 
                                            onClick={() => openEnrollModal(course)}
                                            className={`
                                                w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 text-sm
                                                ${isEnrolled 
                                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                                                    : 'bg-primary text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'}
                                            `}
                                        >
                                            {isEnrolled ? (
                                                <><PlayCircle size={16} /> ไปที่บทเรียน</>
                                            ) : (
                                                <><Sparkles size={16} /> {course.requiresCode ? 'ลงทะเบียน (ใส่รหัส)' : 'ลงทะเบียนฟรี'}</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Column: Online Users Widget */}
            <div className="lg:col-span-1 animate-fade-in-up delay-300">
                <div className="sticky top-8">
                    {/* ✅ 2. แสดง Widget คนออนไลน์ */}
                    <OnlineUsers />
                </div>
            </div>

        </div>

        {/* Modal Access Code */}
        {showModal && selectedCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                <div className="bg-white rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl animate-fade-in-up">
                    <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition"><X size={20} /></button>
                    
                    <div className="text-center mb-6">
                        <div className={`w-16 h-16 mx-auto rounded-2xl ${selectedCourse.bgGradient} flex items-center justify-center mb-4 shadow-lg`}>
                            <Lock className="text-white" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">ยืนยันสิทธิ์เข้าเรียน</h3>
                        <p className="text-gray-500 mt-2 text-sm">กรอกรหัส Access Code เพื่อปลดล็อกวิชา <br/><span className="font-bold text-primary">{selectedCourse.title}</span></p>
                    </div>

                    <div className="space-y-4">
                        <input 
                            type="text" 
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-0 outline-none transition-all text-center text-xl font-bold tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-base placeholder:text-gray-400"
                            placeholder="Enter Code"
                            autoFocus
                        />
                        {modalError && <div className="text-red-500 text-xs text-center font-bold bg-red-50 py-2 rounded-lg">{modalError}</div>}
                        <button 
                            onClick={handleConfirmEnroll}
                            disabled={enrollLoading}
                            className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"
                        >
                            {enrollLoading ? <Loader2 className="animate-spin" /> : 'ยืนยันและลงทะเบียน'}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}