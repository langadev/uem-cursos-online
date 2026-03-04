import { Course } from "../types";

/**
 * Fetches courses from the backend database.
 * This should be updated to call your actual API endpoint.
 */
export const fetchRecommendedCourses = async (): Promise<Course[]> => {
  try {
    // TODO: Replace with actual API call to your backend
    // const response = await fetch('/api/courses');
    // return response.json();

    // For now, returns empty array - courses should come from database only
    return [];
  } catch (error) {
    console.error("Erro ao carregar cursos:", error);
    return [];
  }
};
