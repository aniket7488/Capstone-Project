import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllCourses, getCourseById } from '../services/courseService';
import { getCachedCourses, cacheCourses } from '../utils/offlineStorage';

/**
 * Courses page – lists all courses with their lessons.
 *
 * Offline-first behaviour:
 *  - When online: fetches from the API and updates the cache.
 *  - When offline: reads from IndexedDB cache.
 */
function Courses() {
  const [courses,         setCourses]         = useState([]);
  const [selectedCourse,  setSelectedCourse]  = useState(null);
  const [loadingCourses,  setLoadingCourses]  = useState(true);
  const [loadingDetail,   setLoadingDetail]   = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoadingCourses(true);
    try {
      if (navigator.onLine) {
        const { data } = await getAllCourses();
        setCourses(data);
        await cacheCourses(data); // refresh cache
      } else {
        const cached = await getCachedCourses();
        setCourses(cached);
      }
    } catch (err) {
      // Fallback to cache on any network error
      const cached = await getCachedCourses();
      setCourses(cached);
    } finally {
      setLoadingCourses(false);
    }
  }

  async function handleSelectCourse(id) {
    if (selectedCourse?.id === id) {
      setSelectedCourse(null);
      return;
    }
    setLoadingDetail(true);
    try {
      if (navigator.onLine) {
        const { data } = await getCourseById(id);
        setSelectedCourse(data);
      } else {
        // Offline: find from cached summary (limited – no full lesson content)
        const c = courses.find((c) => c.id === id);
        setSelectedCourse(c);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }

  if (loadingCourses) return <Loading />;

  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>📚 Courses</h2>

      {!navigator.onLine && (
        <div style={styles.offlineNote}>
          📴 Showing cached courses. Some lesson content may be unavailable offline.
        </div>
      )}

      <div style={styles.grid}>
        {courses.map((course) => (
          <div key={course.id} style={styles.card}>
            {course.thumbnailUrl && (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                style={styles.thumbnail}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div style={styles.cardBody}>
              <h3 style={styles.courseTitle}>{course.title}</h3>
              <p style={styles.courseDesc}>{course.description}</p>
              <span style={styles.author}>by {course.createdByUsername}</span>

              <button
                onClick={() => handleSelectCourse(course.id)}
                style={styles.viewBtn}
                disabled={loadingDetail}
              >
                {selectedCourse?.id === course.id ? '▲ Hide Lessons' : '▼ View Lessons'}
              </button>

              {/* Expanded lesson list */}
              {selectedCourse?.id === course.id && selectedCourse.lessons && (
                <div style={styles.lessonList}>
                  {selectedCourse.lessons.map((lesson) => (
                    <div key={lesson.id} style={styles.lessonRow}>
                      <div>
                        <span style={styles.lessonNum}>Lesson {lesson.position}</span>
                        <span style={styles.lessonTitle}>{lesson.title}</span>
                        <span style={styles.quizBadge}>
                          {lesson.quizCount} {lesson.quizCount === 1 ? 'question' : 'questions'}
                        </span>
                      </div>
                      <Link to={`/quiz/${lesson.id}`} style={styles.startBtn}>
                        Start →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {courses.length === 0 && (
          <div style={styles.empty}>No courses available yet.</div>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading courses...</div>;
}

const styles = {
  page: { maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' },
  pageTitle: { fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '20px' },
  offlineNote: {
    background: '#fef3c7',
    border: '1px solid #fcd34d',
    color: '#92400e',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  grid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
  },
  thumbnail: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
  },
  cardBody: { padding: '20px' },
  courseTitle: { fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' },
  courseDesc:  { fontSize: '14px', color: '#4b5563', marginBottom: '8px', lineHeight: '1.5' },
  author:      { fontSize: '12px', color: '#9ca3af' },
  viewBtn: {
    marginTop: '14px',
    display: 'block',
    width: '100%',
    padding: '9px',
    background: '#eef2ff',
    color: '#4f46e5',
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
  },
  lessonList: { marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' },
  lessonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f9fafb',
  },
  lessonNum:   { fontSize: '11px', color: '#9ca3af', marginRight: '8px' },
  lessonTitle: { fontSize: '14px', fontWeight: '500', color: '#374151', marginRight: '8px' },
  quizBadge: {
    fontSize: '11px',
    background: '#f3f4f6',
    color: '#6b7280',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  startBtn: {
    background: '#4f46e5',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  empty: { textAlign: 'center', color: '#6b7280', padding: '40px', fontSize: '16px' },
};

export default Courses;
