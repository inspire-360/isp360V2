import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CourseGuard from "../components/CourseGuard";
import { useAuth } from "../contexts/AuthContext";

const Layout = lazy(() => import("../components/Layout"));
const Landing = lazy(() => import("../pages/Landing"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const MyCourses = lazy(() => import("../pages/MyCourses"));
const Profile = lazy(() => import("../pages/Profile"));
const Construction = lazy(() => import("../pages/Construction"));
const CourseRoom = lazy(() => import("../pages/CourseRoom"));

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111d] px-4 text-white">
      <div className="dark-panel flex max-w-md items-center gap-4 p-5">
        <Loader2 size={24} className="animate-spin text-amber-200" />
        <div>
          <p className="font-semibold text-white">Loading workspace</p>
          <p className="mt-1 text-sm text-slate-300">
            Preparing the next screen for you.
          </p>
        </div>
      </div>
    </div>
  );
}

function renderLazy(element) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>;
}

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<PublicRoute>{renderLazy(<Landing />)}</PublicRoute>}
      />
      <Route path="/landing" element={<Navigate to="/" />} />
      <Route
        path="/login"
        element={<PublicRoute>{renderLazy(<Login />)}</PublicRoute>}
      />
      <Route
        path="/register"
        element={<PublicRoute>{renderLazy(<Register />)}</PublicRoute>}
      />

      <Route
        element={<ProtectedRoute>{renderLazy(<Layout />)}</ProtectedRoute>}
      >
        <Route path="/dashboard" element={renderLazy(<Dashboard />)} />
        <Route path="/profile" element={renderLazy(<Profile />)} />
        <Route path="/courses" element={renderLazy(<MyCourses />)} />

        <Route
          path="/course/teacher/*"
          element={
            <CourseGuard courseId="course-teacher">
              {renderLazy(<CourseRoom />)}
            </CourseGuard>
          }
        />

        <Route
          path="/course/student"
          element={
            <CourseGuard courseId="course-student">
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-slate-950/10">
                <iframe
                  src="https://chpspace.my.canva.site/the-learning-and-happiness-ecosystem-space"
                  className="h-[calc(100vh-11rem)] w-full border-0"
                  title="Student Space"
                  loading="lazy"
                />
              </div>
            </CourseGuard>
          }
        />

        <Route
          path="/course/ai-era"
          element={
            <CourseGuard courseId="course-ai">
              {renderLazy(
                <Construction message="InSPIRE 360 in AI Era is coming soon." />,
              )}
            </CourseGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
