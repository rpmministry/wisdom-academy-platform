/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Índice de Componentes LMS (Platzi + Moodle)
 * ARCHIVO: src/components/lms/index.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Exportación centralizada del sistema de aprendizaje y aula tipo Platzi:
 * - PlatziCoursePlayerLayout: Master player con OpenMAIC y temario.
 * - CourseSyllabusSidebar: Temario colapsable con estado Moodle.
 * - LessonResourceTabs: Recursos, Guías PDF, Quizzes formativos y Apuntes.
 * - VideoTutoringModal: Hub de tutoría sincrónica con profesores humanos.
 * ==============================================================================
 */

export * from './PlatziCoursePlayerLayout';
export * from './PlatziClassroomRightPanel';
export * from './CourseSyllabusSidebar';
export * from './LessonResourceTabs';
export * from './VideoTutoringModal';

