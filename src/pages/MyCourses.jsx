import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, PlayCircle, Clock, CheckCircle2, Loader2, Search, Layout
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function MyCourses() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // ข้อมูลคอร์สทั้งหมด (ใช้ ID เดิมเพื่อ map กับ Database)
  const allCourses = [
    {
      id: "course-teacher",
      title: "InSPIRE for Teacher",
      desc: "หลักสูตรพัฒนาครูนวัตกรผ่านกระบวนการ Design Thinking แบบเข้มข้น 5 Modules",
      icon: <BookOpen className="text-white" size={32} />,
      bgGradient: "bg-gradient-to-br from-blue-500 to-blue-700",
      shadow: "shadow-blue-500/30",
      path: "/course/teacher/module1",
      modules: 5,
      hours: 20
    },
    {
      id: "course-student",
      title: "InSPIRE for Student",
      desc: "พื้นที่แห่งความสุขและการเรียนรู้สำหรับนักเรียน เชื่อมต่อจินตนาการด้วยเทคโนโลยี",
      icon: <Layout className="text-white" size={32} />, 
      bgGradient: "bg-gradient-to-br from-green-500 to-green-700",
      shadow: "shadow-green-500/30",
      path: "/course/student",
      modules: 8,
      hours: 12
    },
    {
      id: "course-ai",
      title: "AI & Innovation",
      desc: "เตรียมพร้อมสู่ยุค AI เรียนรู้เครื่องมือใหม่ๆ เพื่อการศึกษา",
      icon: <div className="text-white font-bold text-xl">AI</div>,
      bgGradient: "bg-gradient-to-br from-purple-500 to-purple-700",
      shadow: "shadow-purple-500/30",
      path: "/course/ai-era",
      modules: 4,
      hours: 10
    }
  ];

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (currentUser) {
        try {
          const querySnapshot = await getDocs(collection(db, "users", currentUser.uid, "enrollments"));
          const ids = querySnapshot.docs.map(doc => doc.id);
          setEnrolledIds(ids);
        } catch (error) {
          console.error("Error fetching enrollments:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchEnrollments();
  }, [currentUser]);

  // กรองเฉพาะคอร์สที่มี ID อยู่ใน enrolledIds
  const myCourses = allCourses.filter(course => enrolledIds.includes(course.id));

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40}/></div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans animate-fade-in-up">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-100 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
              <Layout className="text-primary" size={32} /> คอร์สของฉัน
            </h1>
            <p className="text-gray-500">วิชาที่คุณลงทะเบียนเรียนไว้ทั้งหมด</p>
          </div>
          {myCourses.length > 0 && (
            <div className="text-sm font-medium bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-100 mt-4 md:mt-0">
              กำลังเรียนอยู่ {myCourses.length} วิชา
            </div>
          )}
        </div>

        {myCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* แก้ไขตรงนี้: ลบ index ออกจาก parameter เพราะไม่ได้ใช้ */}
            {myCourses.map((course) => (
              <div 
                key={course.id}
                onClick={() => navigate(course.path)}
                className="group bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col relative overflow-hidden"
              >
                {/* Progress Bar Mockup */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
                    <div className="h-full bg-green-500 w-[15%] rounded-r-full"></div>
                </div>

                <div className={`h-40 rounded-2xl ${course.bgGradient} ${course.shadow} mb-6 flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-white/30">
                        <CheckCircle2 size={12} /> Active
                    </div>
                    <div className="transform group-hover:scale-110 transition-transform duration-300">
                        {course.icon}
                    </div>
                </div>
                
                <div className="space-y-3 flex-1">
                    <h4 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                        {course.title}
                    </h4>
                    <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                        {course.desc}
                    </p>
                    
                    <div className="pt-4 flex items-center justify-between text-xs text-gray-400 font-medium border-t border-gray-50">
                        <div className="flex items-center gap-1.5">
                            <BookOpen size={14} /> {course.modules} Modules
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} /> {course.hours} Hours
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <button className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-primary text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                        <PlayCircle size={18} /> สานต่อบทเรียน
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-400">
                <Search size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">ยังไม่มีคอร์สเรียน</h3>
            <p className="text-gray-500 mb-8 max-w-md">
                คุณยังไม่ได้ลงทะเบียนวิชาใดๆ ไปที่หน้า Dashboard เพื่อค้นหาหลักสูตรที่น่าสนใจ
            </p>
            <button 
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
                ค้นหาคอร์สเรียน
            </button>
          </div>
        )}
      </div>
    </div>
  );
}