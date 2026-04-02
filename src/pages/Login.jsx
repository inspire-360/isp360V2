import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, // ✅ เพิ่ม create user
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth'; 
import { doc, setDoc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, MessageCircle, Mail, Lock, Sparkles, ArrowRight, Loader2, CheckCircle } from 'lucide-react'; 
import { useLine } from '../contexts/LineContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isProcessingLine, setIsProcessingLine] = useState(false);
  const [lineStatus, setLineStatus] = useState('กำลังเชื่อมต่อ...'); 
  const processingRef = useRef(false);
  
  const navigate = useNavigate();
  const { loginLine, lineProfile } = useLine();

  // Helper: แยกชื่อนามสกุล
  const splitName = (fullName) => {
    const parts = fullName ? fullName.split(' ') : ['User', ''];
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return { firstName, lastName };
  };

  // --- 🔥 Logic LINE Sync แบบ Virtual Account (UID คงที่ตลอดไป) ---
  useEffect(() => {
    const syncLineToFirebase = async () => {
      // ทำงานเฉพาะตอนมี Profile และยังไม่เคย Process
      if (lineProfile && !processingRef.current) {
        processingRef.current = true;
        setIsProcessingLine(true);
        setLineStatus('ยืนยันตัวตน LINE เรียบร้อย...');
        setError('');

        try {
          await new Promise(resolve => setTimeout(resolve, 800));

          // 1. สร้าง Virtual Credential จาก LINE ID
          // เทคนิค: แปลง LINE ID ให้เป็น Email/Password ที่คาดเดาได้เฉพาะระบบเรา
          const virtualEmail = `line.${lineProfile.userId.toLowerCase()}@inspire.local`;
          const virtualPassword = `line-secure-${lineProfile.userId}`; // รหัสผ่านภายใน (User ไม่ต้องรู้)

          let user = auth.currentUser;

          // 2. พยายาม Login ด้วย Virtual Email นี้ก่อน
          if (!user) {
             setLineStatus('กำลังดึงข้อมูลบัญชีเดิม...');
             try {
                const credential = await signInWithEmailAndPassword(auth, virtualEmail, virtualPassword);
                user = credential.user;
                console.log("✅ Found existing LINE virtual account:", user.uid);
             } catch (loginError) {
                // 3. ถ้า Login ไม่ได้ (แสดงว่าเป็นสมาชิกใหม่) -> ให้สมัครใหม่ด้วย Virtual Email นี้
                if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
                    setLineStatus('สร้างบัญชีผู้ใช้ใหม่สำหรับ LINE...');
                    const credential = await createUserWithEmailAndPassword(auth, virtualEmail, virtualPassword);
                    user = credential.user;
                    console.log("✅ Created new LINE virtual account:", user.uid);
                } else {
                    throw loginError; // Error อื่นๆ ให้โยนออกไป
                }
             }
          }
          
          // มาถึงตรงนี้ เราได้ User ที่มี UID คงที่แน่นอนแล้ว (ผูกกับ LINE ID)

          // 4. อัปเดต Profile ใน Auth (ชื่อ/รูป)
          setLineStatus('อัปเดตข้อมูลโปรไฟล์...');
          if (lineProfile.displayName || lineProfile.pictureUrl) {
            await updateProfile(user, {
              displayName: lineProfile.displayName,
              photoURL: lineProfile.pictureUrl
            });
          }

          // 5. บันทึก/อัปเดตข้อมูลลง Firestore
          setLineStatus('กำลังบันทึกข้อมูล...');
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          const { firstName, lastName } = splitName(lineProfile.displayName);

          const lineData = {
            name: lineProfile.displayName, 
            photoURL: lineProfile.pictureUrl, 
            lineUserId: lineProfile.userId,
            lastLogin: new Date()
          };

          if (!userSnap.exists()) {
            // สมาชิกใหม่
            await setDoc(userRef, {
              uid: user.uid,
              email: `line_${lineProfile.userId}@inspire.com`, // Email โชว์ในระบบ (สวยงามกว่า virtual)
              role: 'learner',
              firstName: firstName,
              lastName: lastName,
              prefix: 'คุณ',
              position: 'อื่นๆ',
              school: '',
              createdAt: new Date(),
              badges: [],
              pdpaAccepted: true,
              ...lineData
            });
          } else {
            // สมาชิกเก่า -> อัปเดตข้อมูลล่าสุด (เผื่อเปลี่ยนชื่อ/รูปใน LINE)
            await setDoc(userRef, lineData, { merge: true });
          }

          setLineStatus('เสร็จสมบูรณ์! กำลังไปที่ Dashboard...');
          await new Promise(resolve => setTimeout(resolve, 500)); 
          
          navigate('/dashboard');

        } catch (err) {
          console.error("❌ LINE Sync Error:", err);
          setError("เกิดข้อผิดพลาด: " + err.message);
          // ถ้าพลาด ให้ reset เพื่อลองใหม่
          processingRef.current = false; 
          setIsProcessingLine(false); 
        } 
      }
    };

    const isManualLogout = sessionStorage.getItem('manualLogout');
    // รันเฉพาะตอนไม่ได้กด Logout เอง หรือถ้ามี Profile เข้ามาใหม่
    if (!isManualLogout) {
      syncLineToFirebase();
    }
  }, [lineProfile, navigate]);

  // --- Google Login (แก้ไขเหมือนกันเพื่อความชัวร์) ---
  const handleGoogleLogin = async () => {
    try {
      sessionStorage.removeItem('manualLogout');
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Force update auth profile (แก้ปัญหารูปไม่ขึ้น)
      if (user.photoURL) {
        await updateProfile(user, { photoURL: user.photoURL });
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      const { firstName, lastName } = splitName(user.displayName);

      const googleData = {
        name: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date()
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          role: 'learner',
          firstName: firstName,
          lastName: lastName,
          prefix: 'คุณ',
          position: 'อื่นๆ',
          school: '',
          createdAt: new Date(),
          badges: [],
          pdpaAccepted: true,
          ...googleData
        });
      } else {
        // อัปเดตข้อมูลล่าสุด แต่ไม่เขียนทับข้อมูลที่ User แก้ไขเอง (ใช้ merge)
        await setDoc(userRef, {
            lastLogin: new Date(),
            // อัปเดตเฉพาะรูป ถ้าอยากให้รูป Google เป็นปัจจุบันเสมอ
            photoURL: user.photoURL 
        }, { merge: true });
      }
      navigate('/dashboard');
    } catch (err) {
      console.error("Google Login Error:", err);
      setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จ: " + err.message);
    }
  };

  const handleManualLineLogin = () => {
    sessionStorage.removeItem('manualLogout');
    loginLine();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      sessionStorage.removeItem('manualLogout');
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-sans p-4">
      {/* ... (UI ส่วนเดิม ไม่ต้องแก้) ... */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-warm/10"></div>
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-secondary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-accent/25 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-sm">
        <div className="absolute inset-0 bg-white shadow-2xl rounded-3xl -rotate-1 opacity-50 transform scale-105"></div>
        <div className="relative bg-white/[0.80] backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-xl min-h-[500px] flex flex-col justify-center">
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg mb-4 text-white transform rotate-3 hover:rotate-6 transition-all duration-300">
                <Sparkles size={28} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                InSPIRE <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">360°</span>
              </h1>
              {!isProcessingLine && (
                <p className="text-gray-500 text-sm mt-2 font-medium">เข้าสู่ระบบการเรียนรู้แห่งอนาคต</p>
              )}
            </div>

            {isProcessingLine ? (
              <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full border-4 border-gray-100 border-t-[#06C755] animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {lineStatus.includes('สำเร็จ') ? (
                        <CheckCircle size={40} className="text-[#06C755] animate-bounce" />
                    ) : (
                        <MessageCircle size={36} className="text-[#06C755] animate-pulse" fill="#06C755" color="white" />
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 transition-all duration-300">
                    {lineStatus.includes('สำเร็จ') ? 'เข้าสู่ระบบสำเร็จ!' : 'กำลังดำเนินการ...'}
                </h3>
                <p className="text-sm text-gray-500 text-center max-w-[220px] animate-pulse">
                    {lineStatus}
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-xs font-semibold animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="text-gray-400 group-focus-within:text-primary transition-colors duration-300" size={20} />
                      </div>
                      <input 
                        type="email" 
                        required 
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 text-sm font-medium text-gray-700 placeholder-gray-400" 
                        placeholder="อีเมลของคุณ"
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                      />
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="text-gray-400 group-focus-within:text-primary transition-colors duration-300" size={20} />
                      </div>
                      <input 
                        type="password" 
                        required 
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 text-sm font-medium text-gray-700 placeholder-gray-400" 
                        placeholder="รหัสผ่าน"
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary via-secondary to-accent text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-secondary/20 hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex justify-center items-center gap-2 group"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <span>เข้าสู่ระบบ</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold uppercase tracking-wider">หรือเชื่อมต่อด้วย</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleManualLineLogin}
                    className="flex flex-col items-center justify-center py-3 px-4 bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/20 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <MessageCircle size={24} className="mb-1" />
                    <span className="text-xs font-bold">LINE</span>
                  </button>

                  <button 
                    onClick={handleGoogleLogin}
                    className="flex flex-col items-center justify-center py-3 px-4 bg-gray-50 hover:bg-white text-gray-600 border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <div className="mb-1 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-bold">Google</span>
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-400 font-medium">
                    ยังไม่มีบัญชีผู้ใช้งาน? 
                    <Link to="/register" className="text-primary font-bold hover:text-blue-700 ml-1 transition-colors">
                      ลงทะเบียนใหม่
                    </Link>
                  </p>
                </div>
              </>
            )}
        </div>
      </div>
      
      {/* CSS Animation (Reuse from previous step) */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

