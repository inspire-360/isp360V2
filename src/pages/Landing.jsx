import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // ✅ เพิ่ม useNavigate
import { 
  Sparkles, ArrowRight, BookOpen, Users, Award, 
  PlayCircle, Zap, Globe, MessageCircle, CheckCircle2 
} from 'lucide-react';
import { useLine } from '../contexts/LineContext'; // ✅ Import LINE Context

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const { lineProfile } = useLine(); // ✅ ดึงข้อมูล LINE
  const navigate = useNavigate();

  // ✅ เพิ่ม Effect: ถ้ามี LINE Profile (login ค้างไว้) ให้เด้งไปหน้า Login เพื่อ Sync เข้า Dashboard
  useEffect(() => {
    if (lineProfile) {
      console.log("Found LINE Session on Landing Page -> Redirecting to Sync...");
      navigate('/login');
    }
  }, [lineProfile, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      
      {/* 1. Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">InSPIRE 360°</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-primary transition-colors">
              เข้าสู่ระบบ
            </Link>
            <Link to="/register" className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              เริ่มต้นใช้งาน
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-10 overflow-hidden">
        
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
          <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-purple-400 opacity-20 blur-[100px]"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold mb-6 animate-fade-in-up uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            The Future of EdTech
          </div>
          
          {/* Main Title */}
          <h1 className="text-7xl md:text-9xl font-black text-gray-900 mb-2 tracking-tighter animate-fade-in-up delay-100 leading-none">
            InSPIRE
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600 ml-2">360°</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-2xl md:text-3xl font-light text-gray-600 mb-8 animate-fade-in-up delay-200">
            ยกระดับห้องเรียนสู่ <span className="font-semibold text-gray-900">นวัตกรรมแห่งอนาคต</span>
          </p>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up delay-300">
            <Link to="/register" className="group relative px-8 py-4 bg-primary text-white text-lg font-bold rounded-full overflow-hidden shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <span className="flex items-center gap-2">
                สมัครสมาชิกฟรี <ArrowRight size={20} />
              </span>
            </Link>
            <a href="#features" className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2 transition-colors">
              <PlayCircle size={20} /> เรียนรู้เพิ่มเติม
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto border-t border-gray-100 pt-8 animate-fade-in-up delay-500">
            <div>
              <div className="text-2xl font-black text-gray-900">5,000+</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Teachers</div>
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900">100+</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Schools</div>
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900">AI</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Powered</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Teacher Course</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                หลักสูตรเข้มข้น 5 Modules พัฒนาครูสู่การเป็นนวัตกรมืออาชีพ
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Student Space</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                พื้นที่เรียนรู้แห่งความสุข เชื่อมต่อจินตนาการไร้ขีดจำกัด
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI Innovation</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                ผสานเทคโนโลยี AI เพื่อยกระดับการจัดการเรียนการสอน
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">InSPIRE 360°</span>
            <span className="text-xs text-gray-400">© 2024</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-gray-900 transition"><Globe size={18}/></a>
            <a href="#" className="text-gray-400 hover:text-gray-900 transition"><MessageCircle size={18}/></a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out forwards;
            opacity: 0;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-500 { animation-delay: 0.5s; }
      `}</style>
    </div>
  );
}