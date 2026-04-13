import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { ensureTeacherUserProfile } from '../services/firebase/repositories/userRepository';
import { buildUserDisplayName } from '../services/firebase/mappers/userMapper';

const INITIAL_FORM = {
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
  pdpaAccepted: false,
};

export default function Register() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }

    if (!formData.pdpaAccepted) {
      setError('กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนลงทะเบียน');
      setLoading(false);
      return;
    }

    try {
      const finalPrefix =
        formData.prefix === 'อื่นๆ' ? String(formData.otherPrefix || '').trim() : formData.prefix;
      const finalPosition =
        formData.position === 'อื่นๆ'
          ? String(formData.otherPosition || '').trim()
          : formData.position;

      if (!finalPrefix || !formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('กรุณากรอกชื่อ นามสกุล และคำนำหน้าให้ครบถ้วน');
      }

      const fullName = buildUserDisplayName({
        prefix: finalPrefix,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        `${formData.firstName} ${formData.lastName}`,
      )}&background=random&color=fff`;

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password,
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: fullName,
        photoURL: avatarUrl,
      });

      await ensureTeacherUserProfile({
        user,
        prefix: finalPrefix,
        firstName: formData.firstName,
        lastName: formData.lastName,
        position: finalPosition,
        school: formData.school,
        email: formData.email.trim(),
        photoURL: avatarUrl,
        pdpaAccepted: true,
        role: 'teacher',
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('เกิดข้อผิดพลาดระหว่างลงทะเบียนสมาชิก', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('อีเมลนี้ถูกใช้งานแล้วในระบบ');
      } else {
        setError(err.message || 'ไม่สามารถลงทะเบียนสมาชิกได้');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20';
  const labelClass = 'mb-1.5 block text-sm font-bold text-gray-700';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-12 font-sans">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-8 shadow-2xl md:p-10">
        <div className="absolute left-0 top-0 h-2 w-full bg-gradient-to-r from-primary to-purple-600" />

        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <UserPlus size={28} />
          </div>
          <h1 className="mb-3 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
            ลงทะเบียนสมาชิกใหม่
          </h1>
          <p className="text-lg text-gray-500">เริ่มต้นเส้นทางการเรียนรู้ในบทบาทครูได้ทันที</p>
        </div>

        {error ? (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            <AlertCircle size={20} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleRegister} className="space-y-8">
          <div className="space-y-4">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 text-primary">
              <User size={20} />
              <h3 className="text-lg font-bold">ข้อมูลส่วนตัว</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-3">
                <label className={labelClass}>คำนำหน้า</label>
                <select
                  name="prefix"
                  value={formData.prefix}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="นาย">นาย</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="นาง">นาง</option>
                  <option value="ดร.">ดร.</option>
                  <option value="ผอ.">ผอ.</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
                {formData.prefix === 'อื่นๆ' ? (
                  <input
                    type="text"
                    name="otherPrefix"
                    placeholder="ระบุคำนำหน้า"
                    value={formData.otherPrefix}
                    onChange={handleChange}
                    className={`${inputClass} mt-2`}
                    required
                  />
                ) : null}
              </div>

              <div className="md:col-span-5">
                <label className={labelClass}>ชื่อ</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="ชื่อจริง"
                  required
                />
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>นามสกุล</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="นามสกุล"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 text-primary">
              <Briefcase size={20} />
              <h3 className="text-lg font-bold">ข้อมูลการทำงาน</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>ตำแหน่ง</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="ครู">ครู</option>
                  <option value="บุคลากรทางการศึกษา">บุคลากรทางการศึกษา</option>
                  <option value="ผู้อำนวยการสถานศึกษา">ผู้อำนวยการสถานศึกษา</option>
                  <option value="รองผู้อำนวยการสถานศึกษา">รองผู้อำนวยการสถานศึกษา</option>
                  <option value="ศึกษานิเทศก์">ศึกษานิเทศก์</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
                {formData.position === 'อื่นๆ' ? (
                  <input
                    type="text"
                    name="otherPosition"
                    placeholder="ระบุตำแหน่ง"
                    value={formData.otherPosition}
                    onChange={handleChange}
                    className={`${inputClass} mt-2`}
                    required
                  />
                ) : null}
              </div>

              <div>
                <label className={labelClass}>สถานศึกษา / หน่วยงาน</label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="เช่น โรงเรียนบ้านตัวอย่าง"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 text-primary">
              <Lock size={20} />
              <h3 className="text-lg font-bold">ข้อมูลบัญชีผู้ใช้</h3>
            </div>

            <div>
              <label className={labelClass}>อีเมล</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${inputClass} pl-11`}
                  placeholder="อีเมลสำหรับเข้าสู่ระบบ"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>รหัสผ่าน</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>ยืนยันรหัสผ่าน</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  required
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5 transition-colors hover:border-primary/30">
            <div className="flex items-start gap-3">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  id="pdpa"
                  name="pdpaAccepted"
                  checked={formData.pdpaAccepted}
                  onChange={handleChange}
                  className="h-5 w-5 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="ml-1 text-sm">
                <label htmlFor="pdpa" className="cursor-pointer font-medium text-gray-700">
                  ยอมรับเงื่อนไขและนโยบายความเป็นส่วนตัว
                </label>
                <p className="mt-1 leading-relaxed text-gray-500">
                  ข้าพเจ้ายินยอมให้ระบบจัดเก็บ ใช้งาน และประมวลผลข้อมูลส่วนบุคคลเพื่อใช้ในการดูแลการเรียนรู้
                  โดยอ้างอิงตามนโยบายคุ้มครองข้อมูลส่วนบุคคลของแพลตฟอร์ม
                  <span className="ml-1 inline-flex items-center gap-1 font-bold text-primary">
                    อ่านนโยบาย
                    <ShieldCheck size={14} />
                  </span>
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-blue-600 py-4 text-lg font-bold text-white transition-all hover:to-blue-700 hover:shadow-xl active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                กำลังบันทึกข้อมูล...
              </>
            ) : (
              <>
                <CheckCircle2 size={24} />
                ลงทะเบียนสมาชิก
              </>
            )}
          </button>
        </form>

        <div className="mt-10 border-t border-gray-100 pt-6 text-center">
          <p className="text-gray-500">
            มีบัญชีอยู่แล้ว?
            <Link
              to="/login"
              className="ml-1 font-bold text-primary transition-colors hover:text-blue-700 hover:underline"
            >
              เข้าสู่ระบบที่นี่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
