import React, { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Mail,
  Save,
  School,
  ShieldCheck,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { getRoleLabel, prefixOptions } from "../data/profileOptions";

export default function Profile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    prefix: "นาย",
    firstName: "",
    lastName: "",
    position: "ครู",
    school: "",
    email: "",
    role: "learner",
    photoURL: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchUserData() {
      if (!currentUser) {
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (!isMounted) {
          return;
        }

        if (userSnapshot.exists()) {
          const data = userSnapshot.data();
          setFormData({
            prefix: data.prefix || "นาย",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            position: data.position || "ครู",
            school: data.school || "",
            email: data.email || currentUser.email || "",
            role: data.role || "learner",
            photoURL: data.photoURL || currentUser.photoURL || "",
          });
          return;
        }

        const displayName = currentUser.displayName || "";
        const names = displayName.split(" ");
        setFormData((prev) => ({
          ...prev,
          firstName: names[0] || "",
          lastName: names.slice(1).join(" ") || "",
          email: currentUser.email || "",
          photoURL: currentUser.photoURL || "",
        }));
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    }

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const avatarUrl = useMemo(
    () =>
      formData.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        `${formData.firstName || "User"} ${formData.lastName || ""}`.trim(),
      )}&background=0f172a&color=fff`,
    [formData.firstName, formData.lastName, formData.photoURL],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (!currentUser) {
      setMessage({
        type: "error",
        text: "Please sign in again before editing your profile.",
      });
      setLoading(false);
      return;
    }

    try {
      const fullName = `${formData.prefix}${formData.firstName} ${formData.lastName}`;
      const userRef = doc(db, "users", currentUser.uid);

      await setDoc(
        userRef,
        {
          prefix: formData.prefix,
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: fullName,
          position: formData.position,
          school: formData.school,
          email: formData.email,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: fullName,
        });
      }

      setMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: `Could not update the profile: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
            Account settings
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.08em] text-white">
            Keep your profile current.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            This page now matches the rest of the workspace: cleaner grouping,
            clearer hierarchy, and less visual noise around routine profile edits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="secondary-button self-start border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </button>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <section className="dark-panel p-6">
          <div className="flex flex-col items-center text-center">
            <img
              src={avatarUrl}
              alt={`${formData.firstName} ${formData.lastName}`.trim()}
              referrerPolicy="no-referrer"
              className="h-28 w-28 rounded-[28px] object-cover ring-4 ring-white/10"
            />
            <h3 className="mt-5 font-display text-3xl font-semibold tracking-[-0.06em] text-white">
              {formData.firstName || "Your"} {formData.lastName || "Profile"}
            </h3>
            <p className="mt-2 text-sm text-slate-300">{formData.email || "No email"}</p>
            <span className="mt-4 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-amber-200">
              {getRoleLabel(formData.role)}
            </span>
          </div>

          <div className="mt-8 space-y-3">
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Current position
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {formData.position || "Not specified"}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                School
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {formData.school || "Not specified"}
              </p>
            </div>
          </div>
        </section>

        <section className="surface-panel p-6 sm:p-8">
          {message.text && (
            <div
              className={`mb-6 rounded-[22px] px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-8">
            <section className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Identity
                </p>
                <h3 className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  <User size={18} />
                  Personal details
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
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Context
                </p>
                <h3 className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  <Briefcase size={18} />
                  Work information
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="position" className="field-label">
                    ตำแหน่ง
                  </label>
                  <input
                    id="position"
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="field-input"
                    placeholder="เช่น ครูชำนาญการ"
                  />
                </div>

                <div>
                  <label htmlFor="school" className="field-label">
                    สถานศึกษา
                  </label>
                  <div className="relative">
                    <School
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="school"
                      type="text"
                      name="school"
                      value={formData.school}
                      onChange={handleChange}
                      className="field-input pl-11"
                      placeholder="ระบุโรงเรียนหรือสังกัด"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Access
                </p>
                <h3 className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  <Mail size={18} />
                  Account details
                </h3>
              </div>

              <div>
                <label htmlFor="email" className="field-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="field-input cursor-not-allowed bg-slate-100 text-slate-500"
                />
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck size={14} />
                  Email is locked for account security.
                </p>
              </div>
            </section>

            <button type="submit" disabled={loading} className="primary-button w-full justify-center">
              {loading ? (
                <>
                  <Save size={16} />
                  Saving profile...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save changes
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
