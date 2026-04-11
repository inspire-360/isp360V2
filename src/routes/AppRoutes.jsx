import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CourseGuard from "../components/CourseGuard";
import { useAuth } from "../contexts/AuthContext";
import { isAdminRole } from "../utils/userRoles";

const Layout = lazy(() => import("../components/Layout"));
const AdminConsole = lazy(() => import("../pages/AdminConsole"));
const Construction = lazy(() => import("../pages/Construction"));
const CourseRoom = lazy(() => import("../pages/CourseRoom"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Landing = lazy(() => import("../pages/Landing"));
const Login = lazy(() => import("../pages/Login"));
const MemberControl = lazy(() => import("../pages/MemberControl"));
const MyCourses = lazy(() => import("../pages/MyCourses"));
const Profile = lazy(() => import("../pages/Profile"));
const Register = lazy(() => import("../pages/Register"));
const SOSCenter = lazy(() => import("../pages/SOSCenter"));
const VideoAnnotation = lazy(() => import("../pages/VideoAnnotation"));

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <Loader2 className="animate-spin text-primary" size={34} />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">กำลังโหลดข้อมูลผู้ใช้งาน</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (currentUser) return <Navigate to="/dashboard" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { currentUser, loading, userRole } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">กำลังตรวจสอบสิทธิ์การใช้งาน</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (!isAdminRole(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route path="/landing" element={<Navigate to="/" />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/courses" element={<MyCourses />} />
          <Route path="/du/sos" element={<SOSCenter />} />
          <Route
            path="/du/admin"
            element={
              <AdminRoute>
                <AdminConsole />
              </AdminRoute>
            }
          />
          <Route
            path="/du/members"
            element={
              <AdminRoute>
                <MemberControl />
              </AdminRoute>
            }
          />
          <Route
            path="/du/video-coach"
            element={
              <AdminRoute>
                <VideoAnnotation />
              </AdminRoute>
            }
          />

          <Route
            path="/course/teacher/*"
            element={
              <CourseGuard courseId="course-teacher">
                <CourseRoom />
              </CourseGuard>
            }
          />

          <Route
            path="/course/student"
            element={
              <CourseGuard courseId="course-student">
                <div className="h-[calc(100vh-100px)] w-full overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_20px_70px_rgba(13,17,100,0.08)]">
                  <iframe
                    src="https://chpspace.my.canva.site/the-learning-and-happiness-ecosystem-space"
                    className="h-full w-full border-0"
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
                <Construction message="InSPIRE 360 in AI Era is Coming Soon" />
              </CourseGuard>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}
