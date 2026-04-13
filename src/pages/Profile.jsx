import React, { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import {
  ArrowLeft,
  Briefcase,
  Camera,
  CheckCircle2,
  Mail,
  Save,
  School,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import {
  buildUserProfileFallback,
  updateTeacherUserProfile,
} from '../services/firebase/repositories/userRepository';

const DEFAULT_FORM_DATA = {
  prefix: 'นาย',
  firstName: '',
  lastName: '',
  position: 'ครู',
  school: '',
  email: '',
  role: 'teacher',
  photoURL: '',
};

export default function Profile() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  useEffect(() => {
    if (!currentUser) {
      setFormData(DEFAULT_FORM_DATA);
      return;
    }

    const profile = userProfile || buildUserProfileFallback(currentUser);

    setFormData({
      prefix: profile.prefix || DEFAULT_FORM_DATA.prefix,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      position: profile.position || DEFAULT_FORM_DATA.position,
      school: profile.school || '',
      email: profile.email || currentUser.email || '',
      role: profile.role || DEFAULT_FORM_DATA.role,
      photoURL: profile.photoURL || currentUser.photoURL || '',
    });
  }, [currentUser, userProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!currentUser) {
      setMessage({
        type: 'error',
        text: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
      });
      setLoading(false);
      return;
    }

    try {
      const fullName = `${formData.prefix}${formData.firstName} ${formData.lastName}`.trim();

      await updateTeacherUserProfile({
        user: currentUser,
        prefix: formData.prefix,
        firstName: formData.firstName,
        lastName: formData.lastName,
        position: formData.position,
        school: formData.school,
        photoURL: formData.photoURL,
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: fullName,
        });
      }

      setMessage({
        type: 'success',
        text: 'บันทึกข้อมูลเรียบร้อยแล้ว',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: 'error',
        text: `เกิดข้อผิดพลาด: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in-up font-sans">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-500 hover:text-primary transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={20} className="mr-2" /> กลับสู่แดชบอร์ด
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">แก้ไขข้อมูลส่วนตัว</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-br from-blue-600 to-indigo-700" />

            <div className="relative mt-14 mb-4 group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                <img
                  src={
                    formData.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      formData.firstName || 'User',
                    )}&background=random`
                  }
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md border border-gray-200 text-gray-400 cursor-not-allowed"
                title="ฟีเจอร์อัปโหลดรูปจะเปิดใช้งานเร็ว ๆ นี้"
              >
                <Camera size={16} />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {formData.firstName} {formData.lastName}
            </h2>
            <p className="text-sm text-gray-500 mb-4 font-medium">{formData.email}</p>

            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-100">
              <ShieldCheck size={14} className="mr-1.5" /> {formData.role}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
            {message.text ? (
              <div
                className={`p-4 rounded-xl mb-6 flex items-center gap-3 text-sm font-bold ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <ShieldCheck size={20} />
                )}
                {message.text}
              </div>
            ) : null}

            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <User size={20} className="text-primary" /> ข้อมูลทั่วไป
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">คำนำหน้า</label>
                    <select
                      name="prefix"
                      value={formData.prefix}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="นาง">นาง</option>
                      <option value="ดร.">ดร.</option>
                      <option value="ผอ.">ผอ.</option>
                      <option value="ว่าที่ร้อยตรี">ว่าที่ร้อยตรี</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อ</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="ชื่อจริง"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">นามสกุล</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="นามสกุล"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Briefcase size={20} className="text-primary" /> ข้อมูลการทำงาน
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">ตำแหน่ง</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      placeholder="เช่น ครูชำนาญการ"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      สังกัด / สถานศึกษา
                    </label>
                    <div className="relative">
                      <School className="absolute left-4 top-3.5 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="school"
                        value={formData.school}
                        onChange={handleChange}
                        placeholder="ระบุโรงเรียน"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Mail size={20} className="text-primary" /> ข้อมูลบัญชี
                </h3>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">อีเมล</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed font-medium"
                  />
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <ShieldCheck size={12} /> เพื่อความปลอดภัย ไม่สามารถแก้ไขอีเมลได้
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-blue-700 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังบันทึกข้อมูล...
                    </>
                  ) : (
                    <>
                      <Save size={20} /> บันทึกการเปลี่ยนแปลง
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
