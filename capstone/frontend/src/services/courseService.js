/**
 * courseService.js – Course and lesson API calls.
 */
import axios from 'axios';

const API = '/api/courses';

/** Fetch all courses (summary list). */
export const getAllCourses = () => axios.get(API);

/** Fetch a single course with full lesson details. */
export const getCourseById = (id) => axios.get(`${API}/${id}`);
