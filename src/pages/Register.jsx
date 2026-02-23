import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle2, User, Briefcase, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    prefix: 'นาย',
    otherPrefix: '',
    firstName: '',
    lastName: '',
    position: 'ครู',
    otherPosition: '',
    school: '',
    email: '',
    password: '',
    confirmPassword: '',
    pdpaAccepted: false
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }
    if (!formData.pdpaAccepted) {
      setError('กรุณายอมรับนโยบายความเป็นส่วนตัว (PDPA)');
      setLoading(false);
      return;
    }

    try {
      const finalPrefix = formData.prefix === 'อื่นๆ' ? formData.otherPrefix : formData.prefix;
      const finalPosition = formData.position === 'อื่นๆ' ? formData.otherPosition : formData.position;
      
      if (!finalPrefix || !formData.firstName || !formData.lastName) {
        throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
      }

      const fullName = `${finalPrefix}${formData.firstName} ${formData.lastName}`;

      // 1. สร้าง User Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. อัปเดต Profile พื้นฐาน
      await updateProfile(user, {
        displayName: fullName,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}&background=random&color=fff`
      });

      // 3. บันทึกข้อมูลละเอียดลง Firestore (สำคัญมากสำหรับหน้า Profile)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        prefix: finalPrefix,
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: fullName, // Display Name
        position: finalPosition,
        school: formData.school,
        email: formData.email,
        role: 'learner', // ✅ บังคับเป็น Learner ทุกคน
        photoURL: user.photoURL,
        createdAt: new Date(),
        pdpaAccepted: true,
        pdpaAcceptedAt: new Date(),
        badges: []
      });

      navigate('/dashboard');
    } catch (err) {
      console.error("Register Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('อีเมลนี้ถูกใช้งานแล้วในระบบ');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-gray-700";
  const labelClass = "block text-sm font-bold text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-indigo-50 via-white to-blue-50 font-sans flex justify-center items-center px-4">
      <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-3xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-purple-600"></div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight">ลงทะเบียนสมาชิกใหม่</h1>
          <p className="text-gray-500 text-lg">เข้าร่วมชุมชน InSPIRE 360° (สถานะ: Learner)</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 text-sm border border-red-100 flex gap-3 items-center animate-shake">
            <AlertCircle size={20} className="flex-shrink-0"/> 
            <span className="font-medium">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleRegister} className="space-y-8">
          {/* ข้อมูลส่วนตัว */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary border-b border-gray-100 pb-2 mb-4">
              <User size={20} />
              <h3 className="text-lg font-bold">ข้อมูลส่วนตัว</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className={labelClass}>คำนำหน้า</label>
                <select name="prefix" value={formData.prefix} onChange={handleChange} className={inputClass}>
                  <option value="นาย">นาย</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="นาง">นาง</option>
                  <option value="ดร.">ดร.</option>
                  <option value="ผอ.">ผอ.</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
                {formData.prefix === 'อื่นๆ' && (
                  <input type="text" name="otherPrefix" placeholder="ระบุ" value={formData.otherPrefix} onChange={handleChange} className={`${inputClass} mt-2`} required />
                )}
              </div>
              <div className="md:col-span-5">
                <label className={labelClass}>ชื่อ</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} placeholder="ชื่อจริง" required />
              </div>
              <div className="md:col-span-4">
                <label className={labelClass}>นามสกุล</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} placeholder="นามสกุล" required />
              </div>
            </div>
          </div>

          {/* ข้อมูลการทำงาน */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary border-b border-gray-100 pb-2 mb-4">
              <Briefcase size={20} />
              <h3 className="text-lg font-bold">ข้อมูลการทำงาน / การศึกษา</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>ตำแหน่ง</label>
                <select name="position" value={formData.position} onChange={handleChange} className={inputClass}>
                  <option value="ครู">ครู</option>
                  <option value="บุคลากรทางการศึกษา">บุคลากรทางการศึกษา</option>
                  <option value="ผู้อำนวยการสถานศึกษา">ผู้อำนวยการสถานศึกษา</option>
                  <option value="รองผู้อำนวยการสถานศึกษา">รองผู้อำนวยการสถานศึกษา</option>
                  <option value="ศึกษานิเทศก์">ศึกษานิเทศก์</option>
                  <option value="นักเรียน/นักศึกษา">นักเรียน/นักศึกษา</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
                {formData.position === 'อื่นๆ' && (
                  <input type="text" name="otherPosition" placeholder="ระบุตำแหน่ง" value={formData.otherPosition} onChange={handleChange} className={`${inputClass} mt-2`} required />
                )}
              </div>
              <div>
                <label className={labelClass}>สังกัด / สถานศึกษา</label>
                <input type="text" name="school" value={formData.school} onChange={handleChange} className={inputClass} placeholder="เช่น โรงเรียนบ้านพบพระ" required />
              </div>
            </div>
          </div>

          {/* ข้อมูลบัญชี */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary border-b border-gray-100 pb-2 mb-4">
              <Lock size={20} />
              <h3 className="text-lg font-bold">ตั้งค่าบัญชีใช้งาน</h3>
            </div>
            <div>
              <label className={labelClass}>อีเมล</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputClass} pl-11`} placeholder="name@example.com" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>รหัสผ่าน</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className={inputClass} placeholder="อย่างน้อย 6 ตัวอักษร" required />
              </div>
              <div>
                <label className={labelClass}>ยืนยันรหัสผ่าน</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={inputClass} placeholder="กรอกรหัสผ่านอีกครั้ง" required />
              </div>
            </div>
          </div>

          {/* PDPA */}
          <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
                <div className="flex items-center h-5">
                  <input type="checkbox" id="pdpa" name="pdpaAccepted" checked={formData.pdpaAccepted} onChange={handleChange} className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer" />
                </div>
                <div className="ml-1 text-sm">
                  <label htmlFor="pdpa" className="font-medium text-gray-700 cursor-pointer">ยอมรับเงื่อนไขและนโยบายความเป็นส่วนตัว</label>
                  <p className="text-gray-500 mt-1 leading-relaxed">
                    ข้าพเจ้ายินยอมให้เว็บไซต์ <strong>InSPIRE 360°</strong> เก็บรักษา รวบรวม และใช้ข้อมูลส่วนบุคคลเพื่อประโยชน์ในการจัดการเรียนรู้ ตาม <a href="#" className="text-primary hover:underline font-bold inline-flex items-center gap-1">นโยบาย PDPA <ShieldCheck size={14}/></a>
                  </p>
                </div>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-4 rounded-2xl font-bold hover:shadow-xl hover:to-blue-700 transition-all transform active:scale-[0.99] text-lg flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> กำลังบันทึกข้อมูล...</> : <><CheckCircle2 size={24} /> ลงทะเบียนสมาชิก</>}
          </button>
        </form>
        
        <div className="mt-10 text-center border-t border-gray-100 pt-6">
          <p className="text-gray-500">มีบัญชีอยู่แล้ว? <Link to="/login" className="text-primary font-bold hover:underline hover:text-blue-700 transition-colors ml-1">เข้าสู่ระบบที่นี่</Link></p>
        </div>
      </div>
    </div>
  );
}