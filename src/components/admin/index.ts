/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Índice de Componentes Administrativos
 * ARCHIVO: src/components/admin/index.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Exportación centralizada del módulo de administración escolar, legal y de IA:
 * - AdminDashboard: Panel integral de control académico y roles.
 * - StudentCredentialsManager: Gestión de estudiantes y credenciales seguras.
 * - MoodleEnrolmentsManager: Sistema de matriculación estilo Moodle.
 * - AIProfessorsAndCoursesManager: Calibración de Profesores IA (OpenMAIC) y bancos.
 * - MasterGradebookManager: Libro maestro de calificaciones y auditoría de notas.
 * - EcuadorPortfolioManager: Portafolio legal y boletines del Ecuador (MINEDUC).
 * - CertificateGenerator: Emisión de certificados criptográficos verificables.
 * - WorkshopsAndGradesCatalog: Catálogo de 14 años y registro de calificaciones.
 * ==============================================================================
 */

export * from './AdminDashboard';
export * from './StudentCredentialsManager';
export * from './MoodleEnrolmentsManager';
export * from './AIProfessorsAndCoursesManager';
export * from './MasterGradebookManager';
export * from './EcuadorPortfolioManager';
export * from './EcuadorOfficialReportCardGenerator';
export * from './CertificateGenerator';
export * from './WorkshopsAndGradesCatalog';
