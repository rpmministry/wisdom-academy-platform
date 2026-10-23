import React from 'react';
import { getFacultyForSemester, type FacultyMember } from '@/lib/courses/n2nFaculty';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface FacultyPanelProps {
  semester: number;
  semesterTitle: string;
}

const initials = (name: string): string =>
  name
    .replace(/^(Rev\.|Dr\.|Dra\.|Prof\.)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const FacultyCard: React.FC<{ member: FacultyMember }> = ({ member }) => (
  <article className="wa-lms-faculty-card">
    <div className="wa-lms-faculty-portrait">
      {member.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.photo} alt={member.name} loading="lazy" />
      ) : (
        <span className="wa-lms-faculty-placeholder" aria-hidden="true">{initials(member.name)}</span>
      )}
    </div>
    <div className="wa-lms-faculty-body">
      <span className="wa-lms-faculty-kicker">Profesor del semestre</span>
      <h3>{member.name}</h3>
      <p className="wa-lms-faculty-title">{member.title}</p>
      <p className="wa-lms-faculty-bio">{member.shortBio}</p>
      <div className="wa-lms-faculty-subjects">
        {member.subjects.map((subject) => (
          <span key={`${member.id}-${subject.code}`}>{subject.code} · {subject.name}</span>
        ))}
      </div>
      <details className="wa-lms-faculty-details">
        <summary>
          Ver trayectoria y credenciales
          <WisdomIcon name="chevron-down" size={14} />
        </summary>
        <div className="wa-lms-faculty-expanded">
          <p>{member.fullBio}</p>
          {member.credentials.length > 0 && (
            <>
              <span className="wa-lms-faculty-label">Credenciales y servicio</span>
              <ul>
                {member.credentials.map((credential) => (
                  <li key={credential}>{credential}</li>
                ))}
              </ul>
            </>
          )}
          <span className="wa-lms-faculty-label">Enfoque académico</span>
          <p>{member.focus}</p>
          {member.sourceRefs.length > 0 && (
            <p className="wa-lms-faculty-source">
              Fuente: {member.sourceRefs.join(' · ')}
            </p>
          )}
        </div>
      </details>
    </div>
  </article>
);

export const FacultyPanel: React.FC<FacultyPanelProps> = ({ semester, semesterTitle }) => {
  const faculty = getFacultyForSemester(semester);
  return (
    <section className="wa-lms-panel">
      <div className="wa-lms-section-head">
        <div>
          <span className="wa-lms-kicker">Faculty template</span>
          <h2>Cuerpo docente · {semesterTitle}</h2>
          <p>
            Conoce a los profesores que acompañan este semestre. Expande cada perfil para consultar
            su trayectoria, credenciales y enfoque académico.
          </p>
        </div>
        <span className="wa-lms-chip is-gold"><WisdomIcon name="user" size={13} /> {faculty.length} profesores</span>
      </div>

      {faculty.length > 0 ? (
        <div className="wa-lms-faculty-grid">
          {faculty.map((member) => (
            <FacultyCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="wa-lms-empty">
          <span className="wa-lms-empty-icon"><WisdomIcon name="user" size={26} /></span>
          <h3>Claustro pendiente de publicación</h3>
          <p>Los perfiles docentes se incorporarán cuando la institución entregue los materiales del semestre.</p>
        </div>
      )}

      {semester === 1 && (
        <p className="wa-lms-faculty-note">
          <WisdomIcon name="shield" size={14} />
          Fotos y biografías extraídas de las portadas e introducciones de los libros oficiales del Semestre 1.
          No se añadieron credenciales no documentadas.
        </p>
      )}
    </section>
  );
};
