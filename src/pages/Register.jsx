import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { auth, db } from "../lib/firebase";
import { positionOptions, prefixOptions } from "../data/profileOptions";

const HIGHLIGHTS = [
  {
    title: "Structured onboarding",
    description: "Account details, school context, and consent are grouped into one readable form.",
  },
  {
    title: "Learner-first default",
    description: "New accounts land in the workspace with the same clear profile model used across the app.",
  },
  {
    title: "Ready for cohorts",
    description: "The account record supports private access codes and future course unlocks cleanly.",
  },
];

export default function Register() {
  const [formData, setFormData] = useState({
    prefix: "นาย",
    otherPrefix: "",
    firstName: "",
    lastName: "",
    position: "ครู",
    otherPosition: "",
    school: "",
    email: "",
    password: "",
    confirmPassword: "",
    pdpaAccepted: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Password and confirmation do not match.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (!formData.pdpaAccepted) {
      setError("Please accept the PDPA consent checkbox before continuing.");
      setLoading(false);
      return;
    }

    try {
      const finalPrefix =
        formData.prefix === "อื่นๆ" ? formData.otherPrefix : formData.prefix;
      const finalPosition =
        formData.position === "อื่นๆ"
          ? formData.otherPosition
          : formData.position;

      if (!finalPrefix || !formData.firstName || !formData.lastName) {
        throw new Error("Please complete your name details.");
      }

      const fullName = `${finalPrefix}${formData.firstName} ${formData.lastName}`;
      const credential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );
      const user = credential.user;

      await updateProfile(user, {
        displayName: fullName,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          `${formData.firstName} ${formData.lastName}`,
        )}&background=0f172a&color=fff`,
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        prefix: finalPrefix,
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: fullName,
        position: finalPosition,
        school: formData.school,
        email: formData.email,
        role: "learner",
        photoURL: user.photoURL,
        createdAt: new Date(),
        pdpaAccepted: true,
        pdpaAcceptedAt: new Date(),
        badges: [],
      });

      navigate("/dashboard");
    } catch (registerError) {
      console.error("Register Error:", registerError);
      if (registerError.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else {
        setError(registerError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="New member"
      title="Create your InSPIRE account"
      description="Set up your identity and school context once, then move straight into the redesigned workspace."
      asideTitle="A cleaner onboarding flow for educators and learners."
      asideCopy="The registration experience now feels like part of the product, with clearer grouping, calmer hierarchy, and less visual clutter."
      highlights={HIGHLIGHTS}
    >
      {error && (
        <div className="mb-6 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-8">
        <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Identity
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-slate-950">
              Your personal details
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-[0.9fr_1.15fr_1fr]">
            <div>
              <label htmlFor="prefix" className="field-label">
                คำนำหน้า
              </label>
              <select
                id="prefix"
                name="prefix"
                value={formData.prefix}
                onChange={handleChange}
                className="field-select"
              >
                {prefixOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {formData.prefix === "อื่นๆ" && (
                <input
                  type="text"
                  name="otherPrefix"
                  value={formData.otherPrefix}
                  onChange={handleChange}
                  className="field-input mt-3"
                  placeholder="ระบุคำนำหน้า"
                  required
                />
              )}
            </div>

            <div>
              <label htmlFor="firstName" className="field-label">
                ชื่อ
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="field-input"
                placeholder="ชื่อจริง"
                required
              />
            </div>

            <div>
              <label htmlFor="lastName" className="field-label">
                นามสกุล
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="field-input"
                placeholder="นามสกุล"
                required
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Context
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-slate-950">
              School and role information
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="position" className="field-label">
                ตำแหน่ง
              </label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="field-select"
              >
                {positionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {formData.position === "อื่นๆ" && (
                <input
                  type="text"
                  name="otherPosition"
                  value={formData.otherPosition}
                  onChange={handleChange}
                  className="field-input mt-3"
                  placeholder="ระบุตำแหน่ง"
                  required
                />
              )}
            </div>

            <div>
              <label htmlFor="school" className="field-label">
                สังกัด / สถานศึกษา
              </label>
              <input
                id="school"
                type="text"
                name="school"
                value={formData.school}
                onChange={handleChange}
                className="field-input"
                placeholder="เช่น โรงเรียนตัวอย่าง"
                required
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Account
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-slate-950">
              Login credentials
            </h3>
          </div>

          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="field-input pl-11"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="field-input"
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="field-label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="field-input"
                placeholder="Repeat your password"
                required
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-start gap-3">
            <input
              id="pdpa"
              type="checkbox"
              name="pdpaAccepted"
              checked={formData.pdpaAccepted}
              onChange={handleChange}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
            />
            <div>
              <label htmlFor="pdpa" className="font-medium text-slate-800">
                I agree to the PDPA / privacy consent
              </label>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your profile information is used to personalize the learning
                workspace, enroll you into the correct pathways, and support the
                ongoing course experience.
              </p>
            </div>
          </div>
        </section>

        <button type="submit" disabled={loading} className="primary-button w-full justify-center">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Create account
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 text-slate-400" />
            <p className="leading-6">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-slate-950">
                Sign in here
              </Link>
              .
            </p>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}
