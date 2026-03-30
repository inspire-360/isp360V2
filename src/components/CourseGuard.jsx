import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Lock } from "lucide-react";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export default function CourseGuard({ children, courseId }) {
  const { currentUser } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function checkEnrollment() {
      if (!currentUser || !courseId) {
        return;
      }

      try {
        const enrollmentRef = doc(
          db,
          "users",
          currentUser.uid,
          "enrollments",
          courseId,
        );
        const enrollmentSnapshot = await getDoc(enrollmentRef);

        if (isMounted) {
          setIsEnrolled(enrollmentSnapshot.exists());
        }
      } catch (error) {
        console.error("Error checking enrollment:", error);
        if (isMounted) {
          setIsEnrolled(false);
        }
      }
    }

    checkEnrollment();

    return () => {
      isMounted = false;
    };
  }, [currentUser, courseId]);

  if (isEnrolled === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="dark-panel flex max-w-md items-center gap-4 p-5">
          <Loader2 size={24} className="animate-spin text-amber-200" />
          <div>
            <p className="font-semibold text-white">Checking access</p>
            <p className="mt-1 text-sm text-slate-300">
              We are confirming that this learning room is unlocked for your
              account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isEnrolled === false) {
    return (
      <div className="page-wrap flex min-h-[70vh] items-center justify-center px-4">
        <section className="dark-panel max-w-2xl p-8 text-center sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-400/10 text-red-200">
            <Lock size={36} />
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-red-200">
            Access required
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.08em] text-white">
            This room is not unlocked yet.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Return to the dashboard, enroll into this pathway first, and then
            come back once access has been granted.
          </p>
          <Link
            to="/dashboard"
            className="secondary-button mt-8 border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            Return to dashboard
          </Link>
        </section>
      </div>
    );
  }

  return children;
}
