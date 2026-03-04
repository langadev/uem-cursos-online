import axios, { AxiosError, AxiosInstance } from "axios";
import { Course } from "../types";

// Detectar porta da API dinamicamente
const API_PORT = import.meta.env.VITE_API_PORT || "3005";
const API_BASE_URL = import.meta.env.DEV
  ? `http://localhost:${API_PORT}/api`
  : "/api";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Interceptar requisições para adicionar JWT token ou X-User-Id header
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("auth_token");
      const userId =
        localStorage.getItem("user_id") || localStorage.getItem("firebase_uid");

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      } else if (userId) {
        config.headers["X-User-Id"] = userId;
      }
      return config;
    });

    // Interceptar erros
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_id");
          localStorage.removeItem("firebase_uid");
          window.location.href = "/login";
        }
        console.error("[API Error]", error.message);
        return Promise.reject(error);
      },
    );
  }

  // ============ AUTH ============
  async getMe() {
    const response = await this.client.get("/auth/me");
    return response.data;
  }

  async loginWithPassword(email: string, password: string) {
    const response = await this.client.post("/auth/login", { email, password });
    if (response.data.token) {
      localStorage.setItem("auth_token", response.data.token);
      localStorage.setItem("user_id", response.data.user.uid);
    }
    return response.data;
  }

  async registerWithPassword(
    email: string,
    password: string,
    name: string,
    role: "student" | "instructor" | "admin" = "student",
  ) {
    const response = await this.client.post("/auth/register", {
      email,
      password,
      name,
      role,
    });
    if (response.data.token) {
      localStorage.setItem("auth_token", response.data.token);
      localStorage.setItem("user_id", response.data.user.uid);
    }
    return response.data;
  }

  async loginWithGoogle(
    uid: string,
    email: string,
    name: string,
    photoURL?: string,
  ) {
    const response = await this.client.post("/auth/login-google", {
      uid,
      email,
      name,
      photoURL,
    });
    if (response.data.token) {
      localStorage.setItem("auth_token", response.data.token);
      localStorage.setItem("user_id", response.data.user.uid);
    }
    return response.data;
  }

  async register(userData: {
    uid: string;
    email: string;
    name?: string;
    role?: "student" | "instructor" | "admin";
  }) {
    // Legacy register method for Firebase Auth
    const response = await this.client.post("/auth/register", userData);
    return response.data;
  }

  async login(credentials: { email?: string; uid?: string }) {
    // Legacy login method for Firebase Auth
    const response = await this.client.post("/auth/login", credentials);
    return response.data;
  }

  // ============ COURSES ============
  async fetchAllCourses(): Promise<Course[]> {
    try {
      const response = await this.client.get("/courses");
      return response.data;
    } catch (error) {
      console.error("Erro ao carregar cursos:", error);
      return [];
    }
  }

  async fetchCourseById(courseId: string) {
    const response = await this.client.get(`/courses/${courseId}`);
    return response.data;
  }

  async createCourse(courseData: {
    instructor_uid: string;
    title: string;
    description?: string;
    image_url?: string;
    category?: string;
    level?: string;
    price?: number;
  }) {
    const response = await this.client.post("/courses", courseData);
    return response.data;
  }

  async updateCourse(
    courseId: string,
    courseData: {
      title?: string;
      description?: string;
      image_url?: string;
      category?: string;
      level?: string;
      price?: number;
      is_active?: boolean;
    },
  ) {
    const response = await this.client.put(`/courses/${courseId}`, courseData);
    return response.data;
  }

  async deleteCourse(courseId: string) {
    const response = await this.client.delete(`/courses/${courseId}`);
    return response.data;
  }

  // ============ ENROLLMENTS ============
  async enrollCourse(enrollmentData: { user_uid: string; course_id: string }) {
    const response = await this.client.post("/enrollments", enrollmentData);
    return response.data;
  }

  async fetchUserEnrollments(userUid: string) {
    const response = await this.client.get(`/enrollments/user/${userUid}`);
    return response.data;
  }

  async fetchCourseEnrollments(courseId: string) {
    const response = await this.client.get(`/enrollments/course/${courseId}`);
    return response.data;
  }

  // ============ LESSONS ============
  async fetchLessonsByModule(moduleId: string) {
    const response = await this.client.get(`/lessons/module/${moduleId}`);
    return response.data;
  }

  async updateLessonProgress(lessonId: string, completed: boolean) {
    const response = await this.client.post("/lessons/complete", {
      lesson_id: lessonId,
      completed,
    });
    return response.data;
  }

  // ============ QUESTIONS (FORUM) ============
  async fetchCourseQuestions(courseId: string) {
    const response = await this.client.get(`/questions/course/${courseId}`);
    return response.data;
  }

  async createQuestion(questionData: {
    course_id: string;
    instructor_uid: string;
    title: string;
    content: string;
    author_uid: string;
    author_name: string;
  }) {
    const response = await this.client.post("/questions", questionData);
    return response.data;
  }

  async createAnswer(answerData: {
    question_id: string;
    author_uid: string;
    author_name: string;
    content: string;
  }) {
    const response = await this.client.post("/answers", answerData);
    return response.data;
  }

  // ============ CERTIFICATES ============
  async fetchUserCertificates(userUid: string) {
    const response = await this.client.get(`/certificates/user/${userUid}`);
    return response.data;
  }

  async requestCertificate(certificateData: {
    user_uid: string;
    course_id: string;
    instructor_uid: string;
  }) {
    const response = await this.client.post("/certificates", certificateData);
    return response.data;
  }

  async approveCertificate(certificateId: string) {
    const response = await this.client.post(
      `/certificates/${certificateId}/approve`,
    );
    return response.data;
  }

  // ============ USERS ============
  async fetchUserProfile(userUid: string) {
    const response = await this.client.get(`/users/${userUid}/profile`);
    return response.data;
  }

  async updateUserProfile(userUid: string, profileData: any) {
    const response = await this.client.put(
      `/users/${userUid}/profile`,
      profileData,
    );
    return response.data;
  }

  async fetchAllUsers(role?: string) {
    const response = await this.client.get("/users", {
      params: role ? { role } : {},
    });
    return response.data;
  }

  // ============ GENERIC METHODS ============
  // Métodos genéricos para acesso direto ao axios client
  async get(path: string, config?: any) {
    const response = await this.client.get(path, config);
    return response;
  }

  async post(path: string, data?: any, config?: any) {
    const response = await this.client.post(path, data, config);
    return response;
  }

  async put(path: string, data?: any, config?: any) {
    const response = await this.client.put(path, data, config);
    return response;
  }

  async delete(path: string, config?: any) {
    const response = await this.client.delete(path, config);
    return response;
  }
}

// Exportar instância única
export const apiClient = new ApiClient();

/**
 * @deprecated Use apiClient.fetchAllCourses() instead
 */
export const fetchRecommendedCourses = async (): Promise<Course[]> => {
  return apiClient.fetchAllCourses();
};

export default apiClient;
