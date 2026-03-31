import React, { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { auth, db } from "../lib/firebase";
import { useLine } from "../contexts/LineContext";

const HIGHLIGHTS = [
  {
    title: "ทางเข้าเดียว",
    description: "อีเมล Google และ LINE อยู่ใน flow เดียวกันแบบไม่สลับประสบการณ์ใช้งาน",
  },
  {
    title: "พร้อมใช้งานทันที",
    description: "ข้อมูลผู้ใช้ถูกซิงก์เข้าระบบเพื่อเข้าแดชบอร์ดและคอร์สได้ต่อเนื่อง",
  },
  {
    title: "รองรับการดูแลรุ่นเรียน",
    description: "โครงสร้างบัญชีถูกเตรียมไว้สำหรับสิทธิ์คอร์สและการติดตามในระบบ",
  },
];

function splitName(fullName) {
  const parts = fullName ? fullName.split(" ") : ["ผู้ใช้", ""];
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "",
  };
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isProcessingLine, setIsProcessingLine] = useState(false);
  const [lineStatus, setLineStatus] = useState("กำลังเตรียมเชื่อมต่อบัญชี LINE...");
  const [lineCompleted, setLineCompleted] = useState(false);

  const processingRef = useRef(false);
  const navigate = useNavigate();
  const { loginLine, lineProfile } = useLine();

  useEffect(() => {
    const syncLineToFirebase = async () => {
      if (!lineProfile || processingRef.current) {
        return;
      }

      processingRef.current = true;
      setIsProcessingLine(true);
      setLineCompleted(false);
      setLineStatus("กำลังตรวจสอบโปรไฟล์ LINE...");
      setError("");

      try {
        await new Promise((resolve) => setTimeout(resolve, 400));

        const virtualEmail = `line.${lineProfile.userId.toLowerCase()}@inspire.local`;
        const virtualPassword = `line-secure-${lineProfile.userId}`;

        let user = auth.currentUser;

        if (!user) {
          setLineStatus("กำลังค้นหาบัญชีที่ผูกกับ LINE...");
          try {
            const credential = await signInWithEmailAndPassword(
              auth,
              virtualEmail,
              virtualPassword,
            );
            user = credential.user;
          } catch (loginError) {
            if (
              loginError.code === "auth/user-not-found" ||
              loginError.code === "auth/invalid-credential"
            ) {
              setLineStatus("ยังไม่พบบัญชี กำลังสร้างพื้นที่ทำงานใหม่...");
              const credential = await createUserWithEmailAndPassword(
                auth,
                virtualEmail,
                virtualPassword,
              );
              user = credential.user;
            } else {
              throw loginError;
            }
          }
        }

        setLineStatus("กำลังอัปเดตข้อมูลโปรไฟล์...");
        await updateProfile(user, {
          displayName: lineProfile.displayName,
          photoURL: lineProfile.pictureUrl,
        });

        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);
        const { firstName, lastName } = splitName(lineProfile.displayName);
        const lineData = {
          name: lineProfile.displayName,
          photoURL: lineProfile.pictureUrl,
          lineUserId: lineProfile.userId,
          lastLogin: new Date(),
          status: "active",
        };

        setLineStatus("กำลังบันทึกข้อมูลการเข้าใช้งาน...");

        if (!userSnapshot.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: `line_${lineProfile.userId}@inspire.com`,
            role: "teacher",
            firstName,
            lastName,
            prefix: "คุณ",
            position: "ครู",
            school: "",
            createdAt: new Date(),
            badges: [],
            pdpaAccepted: true,
            ...lineData,
          });
        } else {
          await setDoc(userRef, lineData, { merge: true });
        }

        setLineStatus("เชื่อมต่อ LINE สำเร็จ กำลังเข้าสู่แดชบอร์ด...");
        setLineCompleted(true);
        await new Promise((resolve) => setTimeout(resolve, 400));
        navigate("/dashboard");
      } catch (syncError) {
        console.error("LINE Sync Error:", syncError);
        setError(`ไม่สามารถเข้าสู่ระบบด้วย LINE ได้: ${syncError.message}`);
        processingRef.current = false;
        setIsProcessingLine(false);
        setLineCompleted(false);
      }
    };

    if (!sessionStorage.getItem("manualLogout")) {
      syncLineToFirebase();
    }
  }, [lineProfile, navigate]);

  const handleGoogleLogin = async () => {
    try {
      sessionStorage.removeItem("manualLogout");
      setError("");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.photoURL) {
        await updateProfile(user, { photoURL: user.photoURL });
      }

      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const { firstName, lastName } = splitName(user.displayName);

      if (!userSnapshot.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          role: "teacher",
          firstName,
          lastName,
          prefix: "คุณ",
          position: "ครู",
          school: "",
          createdAt: new Date(),
          badges: [],
          pdpaAccepted: true,
          name: user.displayName,
          photoURL: user.photoURL,
          lastLogin: new Date(),
          status: "active",
        });
      } else {
        await setDoc(
          userRef,
          {
            lastLogin: new Date(),
            photoURL: user.photoURL,
            status: "active",
          },
          { merge: true },
        );
      }

      navigate("/dashboard");
    } catch (googleError) {
      console.error("Google Login Error:", googleError);
      setError(`ไม่สามารถเข้าสู่ระบบด้วย Google ได้: ${googleError.message}`);
    }
  };

  const handleManualLineLogin = () => {
    sessionStorage.removeItem("manualLogout");
    loginLine();
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      sessionStorage.removeItem("manualLogout");
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (loginError) {
      console.error(loginError);
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="เข้าสู่ระบบ"
      title="เข้าสู่ InSPIRE Workspace"
      description="เลือกวิธีการเข้าสู่ระบบที่เหมาะกับบัญชีของคุณ แล้วไปต่อยังพื้นที่เรียนรู้และการทำงาน"
      asideTitle="เริ่มต้นอย่างนิ่ง ชัด และพร้อมใช้งานจริง"
      asideCopy="หน้าทางเข้าถูกออกแบบให้รองรับทั้งครู ผู้เรียน และผู้ดูแลระบบใน flow เดียวกัน พร้อมพาเข้าสู่ workspace ได้ต่อเนื่อง"
      highlights={HIGHLIGHTS}
    >
      {isProcessingLine ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-emerald-200 bg-emerald-50/80 px-6 py-10 text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-full border-4 border-emerald-100 border-t-[#06C755] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-[#06C755]">
              {lineCompleted ? <CheckCircle2 size={30} /> : <MessageCircle size={28} />}
            </div>
          </div>
          <h3 className="mt-6 font-display text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            {lineCompleted ? "เชื่อมต่อ LINE สำเร็จ" : "กำลังเชื่อมต่อ LINE"}
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
            {lineStatus}
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="field-label">
                อีเมล
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field-input pl-11"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field-input pl-11"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="primary-button w-full justify-center">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  กำลังเข้าสู่ระบบ
                </>
              ) : (
                <>
                  เข้าสู่แดชบอร์ด
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
              หรือใช้
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleManualLineLogin}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#06C755]/20 bg-[#06C755]/10 px-4 py-3 text-sm font-semibold text-[#06C755] transition hover:bg-[#06C755]/15"
            >
              <MessageCircle size={18} />
              เข้าด้วย LINE
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.04 5.04 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09A6.61 6.61 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.26.81-.58Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
                />
              </svg>
              เข้าด้วย Google
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            ยังไม่มีบัญชี?{" "}
            <Link to="/register" className="font-semibold text-slate-950">
              สมัครใช้งานที่นี่
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
