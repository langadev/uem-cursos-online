import React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { BrandingProvider } from "./contexts/BrandingContext";

// Expor Firebase ao console para debugging
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./services/firebase";
(window as any).debugFirebase = {
  db,
  auth,
  getDocs,
  collection,
  query,
  where,
  runDiagnostic: async () => {
    const uid = auth.currentUser?.uid;
    console.log("🔍 [DEBUG] UID:", uid);
    if (!uid) {
      console.log("❌ Não autenticado!");
      return;
    }
    const enrolls = await getDocs(
      query(collection(db, "enrollments"), where("user_uid", "==", uid)),
    );
    const courses = await getDocs(collection(db, "courses"));
    console.log(`📋 Suas inscrições: ${enrolls.size}`);
    enrolls.forEach((d) => console.log("   →", d.id, d.data()));
    console.log(`📚 Total de cursos: ${courses.size}`);
  },
};

// Pages
import AboutPage from "./pages/AboutPage";
import CategoriesPage from "./pages/CategoriesPage";
import CommunityPage from "./pages/CommunityPage";
import CourseDetailsPage from "./pages/CourseDetailsPage";
import CoursesPage from "./pages/CoursesPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import InstructorDetailsPage from "./pages/InstructorDetailsPage";
import InstructorsPage from "./pages/InstructorsPage";
import LoginPage from "./pages/LoginPage";
import PrivacyPage from "./pages/PrivacyPage";
import RegisterPage from "./pages/RegisterPage";
import TermsPage from "./pages/TermsPage";

// Student Pages
import StudentCertificatesPage from "./pages/student/CertificatesPage";
import StudentCertificateViewPage from "./pages/student/CertificateViewPage";
import StudentCommunityPage from "./pages/student/CommunityPage";
import StudentClassroomPage from "./pages/student/CoursePlayerPage";
import StudentDashboardPage from "./pages/student/DashboardPage";
import StudentEnrollmentPage from "./pages/student/EnrollmentPage";
import StudentFeedbackPage from "./pages/student/FeedbackPage";
import StudentHistoryPage from "./pages/student/HistoryPage";
import StudentCoursesPage from "./pages/student/MyCoursesPage";
import StudentSettingsPage from "./pages/student/SettingsPage";

// Instructor Pages
import InstructorCertificatesPage from "./pages/instructor/CertificatesManagementPage";
import InstructorCommunityPage from "./pages/instructor/CommunityPage";
import InstructorCourseEditorPage from "./pages/instructor/CourseEditorPage";
import InstructorDashboardPage from "./pages/instructor/DashboardPage";
import InstructorCoursesPage from "./pages/instructor/MyCoursesPage";
import InstructorStudentsPage from "./pages/instructor/MyStudentsPage";
import InstructorQuestionsPage from "./pages/instructor/QuestionsPage";
import InstructorReportsPage from "./pages/instructor/ReportsPage";
import InstructorSettingsPage from "./pages/instructor/SettingsPage";
import InstructorProgressPage from "./pages/instructor/StudentsProgressPage";

// Admin Pages
import AdminAnalyticsPage from "./pages/admin/AnalyticsPage";
import AdminCertificateApprovalPage from "./pages/admin/CertificateApprovalPage";
import AdminContentsPage from "./pages/admin/ContentManagementPage";
import AdminModerationPage from "./pages/admin/CourseModerationPage";
import AdminDashboardPage from "./pages/admin/DashboardPage";
import AdminPermissionsPage from "./pages/admin/PermissionsPage";
import AdminSettingsPage from "./pages/admin/SettingsPage";
import AdminTutorsPage from "./pages/admin/TutorsManagementPage";
import AdminUsersPage from "./pages/admin/UsersManagementPage";

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-grow">{children}</main>
    <Footer />
  </div>
);

const App: React.FC = () => {
  return (
    <BrandingProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <PublicLayout>
                  <HomePage />
                </PublicLayout>
              }
            />
            <Route
              path="/cursos"
              element={
                <PublicLayout>
                  <CoursesPage />
                </PublicLayout>
              }
            />
            <Route
              path="/cursos/:id"
              element={
                <PublicLayout>
                  <CourseDetailsPage />
                </PublicLayout>
              }
            />
            <Route
              path="/tutores"
              element={
                <PublicLayout>
                  <InstructorsPage />
                </PublicLayout>
              }
            />
            <Route
              path="/tutores/:uid"
              element={
                <PublicLayout>
                  <InstructorDetailsPage />
                </PublicLayout>
              }
            />
            <Route
              path="/categorias"
              element={
                <PublicLayout>
                  <CategoriesPage />
                </PublicLayout>
              }
            />
            <Route
              path="/comunidade"
              element={
                <PublicLayout>
                  <CommunityPage />
                </PublicLayout>
              }
            />
            <Route
              path="/sobre"
              element={
                <PublicLayout>
                  <AboutPage />
                </PublicLayout>
              }
            />
            <Route
              path="/termos"
              element={
                <PublicLayout>
                  <TermsPage />
                </PublicLayout>
              }
            />
            <Route
              path="/privacidade"
              element={
                <PublicLayout>
                  <PrivacyPage />
                </PublicLayout>
              }
            />
            <Route
              path="/login"
              element={
                <PublicLayout>
                  <LoginPage />
                </PublicLayout>
              }
            />
            <Route
              path="/cadastro"
              element={
                <PublicLayout>
                  <RegisterPage />
                </PublicLayout>
              }
            />
            <Route
              path="/recuperar-senha"
              element={
                <PublicLayout>
                  <ForgotPasswordPage />
                </PublicLayout>
              }
            />

            {/* Student Protected Routes */}
            <Route
              path="/aluno/dashboard"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/cursos"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/historico"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/forum"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentCommunityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/certificados"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentCertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/certificado/:id"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentCertificateViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/configuracoes"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/feedback"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentFeedbackPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/inscricao/:id"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentEnrollmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aluno/sala-de-aula/:id"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentClassroomPage />
                </ProtectedRoute>
              }
            />

            {/* Instructor Routes */}
            <Route
              path="/instrutor/dashboard"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/cursos"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/cursos/novo"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorCourseEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/cursos/editar/:id"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorCourseEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/alunos"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorStudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/certificados"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorCertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/progresso"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorProgressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/duvidas"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorQuestionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/comunidade"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorCommunityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/relatorios"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instrutor/configuracoes"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorSettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/instrutor/comunidade"
              element={
                <ProtectedRoute allowedRole="instructor">
                  <InstructorCommunityPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tutores"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminTutorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/conteudos"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminContentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/moderacao"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminModerationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/certificados"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminCertificateApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/permissoes"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminPermissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminSettingsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </BrandingProvider>
  );
};

export default App;
