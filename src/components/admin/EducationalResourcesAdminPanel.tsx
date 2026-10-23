'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Revisión Docente de Recursos
 * ARCHIVO: src/components/admin/EducationalResourcesAdminPanel.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Proporciona el mecanismo idóneo para convertir un video pendiente en un
 * recurso validado. El revisor:
 * 1. Introduce el token administrativo del servidor.
 * 2. Revisa la cola de candidatos por asignatura/unidad.
 * 3. Reproduce o abre el video y verifica los seis controles.
 * 4. Registra su nombre y la evidencia de revisión.
 * 5. Publica la aprobación en el catálogo curado.
 *
 * El token no forma parte del bundle ni se guarda en el repositorio; se captura
 * en sessionStorage y se envía sólo a las rutas administrativas del servidor.
 * ==============================================================================
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CandidatoRevision,
  ConfirmacionesAprobacion,
  ResultadoAprobacion,
} from '@/types/educationalResources';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

const CLAVE_TOKEN = 'wa_recursos_admin_token';

const CONFIRMACIONES_INICIALES: ConfirmacionesAprobacion = {
  pertinencia: false,
  idioma: false,
  nivel: false,
  seguridad: false,
  insercion: false,
  region: false,
};

const ETIQUETAS_CONFIRMACION: Array<{
  clave: keyof ConfirmacionesAprobacion;
  titulo: string;
  detalle: string;
}> = [
  {
    clave: 'pertinencia',
    titulo: 'Pertinencia curricular',
    detalle: 'El video explica el tema de la unidad y aporta ejemplos o demostraciones.',
  },
  {
    clave: 'idioma',
    titulo: 'Idioma adecuado',
    detalle: 'La explicación está en el idioma de la clase y se entiende con claridad.',
  },
  {
    clave: 'nivel',
    titulo: 'Nivel y edad apropiados',
    detalle: 'La complejidad, los ejemplos y el ritmo corresponden al curso.',
  },
  {
    clave: 'seguridad',
    titulo: 'Contenido seguro',
    detalle: 'No hay lenguaje, imágenes ni situaciones inapropiadas para el entorno escolar.',
  },
  {
    clave: 'insercion',
    titulo: 'Reproducción integrada verificada',
    detalle: 'Comprobé que el video se reproduce en el reproductor integrado.',
  },
  {
    clave: 'region',
    titulo: 'Disponible en la región',
    detalle: 'El video se reproduce desde Ecuador o desde la región configurada.',
  },
];

function estadoBadge(estado: CandidatoRevision['estado']): string {
  if (estado === 'APROBADA') return 'wa-resource-badge--validated';
  if (estado === 'RECHAZADA') return 'wa-resource-badge--rejected';
  return 'wa-resource-badge--pending';
}

export const EducationalResourcesAdminPanel: React.FC = () => {
  const [token, setToken] = useState('');
  const [tokenConfirmado, setTokenConfirmado] = useState(false);
  const [candidatos, setCandidatos] = useState<CandidatoRevision[]>([]);
  const [versionCriterios, setVersionCriterios] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [seleccionado, setSeleccionado] = useState<CandidatoRevision | null>(null);
  const [revisor, setRevisor] = useState('');
  const [evidencia, setEvidencia] = useState('');
  const [confirmaciones, setConfirmaciones] = useState<ConfirmacionesAprobacion>(
    CONFIRMACIONES_INICIALES
  );
  const [publicando, setPublicando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAprobacion | null>(null);
  const [errorAprobacion, setErrorAprobacion] = useState('');

  const todasConfirmadas = useMemo(
    () => Object.values(confirmaciones).every(Boolean),
    [confirmaciones]
  );

  const cargarCandidatos = useCallback(async (tokenUsado: string) => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await fetch('/api/educational-resources/review', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-educational-admin-token': tokenUsado,
        },
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as
        | {
            ok?: boolean;
            candidatos?: CandidatoRevision[];
            versionCriterios?: string;
            mensaje?: string;
          }
        | null;
      if (!respuesta.ok || !cuerpo?.ok) {
        throw new Error(cuerpo?.mensaje || 'No fue posible cargar la cola de revisión.');
      }
      setCandidatos(cuerpo.candidatos || []);
      setVersionCriterios(cuerpo.versionCriterios || '');
      setTokenConfirmado(true);
      setAviso(
        (cuerpo.candidatos || []).length === 0
          ? 'No hay candidatos pendientes en la cola.'
          : ''
      );
    } catch (fallo) {
      setTokenConfirmado(false);
      setError(
        fallo instanceof Error
          ? fallo.message
          : 'No fue posible cargar la cola de revisión.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem(CLAVE_TOKEN);
      if (guardado) {
        setToken(guardado);
        void cargarCandidatos(guardado);
      }
    } catch {
      // sessionStorage puede estar deshabilitado; se solicita el token.
    }
  }, [cargarCandidatos]);

  const confirmarToken = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const valor = token.trim();
    if (!valor) {
      setError('Introduce el token administrativo.');
      return;
    }
    try {
      sessionStorage.setItem(CLAVE_TOKEN, valor);
    } catch {}
    await cargarCandidatos(valor);
  };

  const seleccionarCandidato = (candidato: CandidatoRevision) => {
    setSeleccionado(candidato);
    setRevisor('');
    setEvidencia('');
    setConfirmaciones(CONFIRMACIONES_INICIALES);
    setResultado(null);
    setErrorAprobacion('');
  };

  const alternarConfirmacion = (clave: keyof ConfirmacionesAprobacion) => {
    setConfirmaciones((previo) => ({ ...previo, [clave]: !previo[clave] }));
  };

  const aprobar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!seleccionado || publicando) return;
    if (!todasConfirmadas) {
      setErrorAprobacion('Debes confirmar los seis controles antes de publicar.');
      return;
    }

    setPublicando(true);
    setErrorAprobacion('');
    setResultado(null);
    try {
      const respuesta = await fetch('/api/educational-resources/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-educational-admin-token': token.trim(),
        },
        body: JSON.stringify({
          videoId: seleccionado.recurso.id,
          contexto: seleccionado.contexto,
          revisor: revisor.trim(),
          evidencia: evidencia.trim(),
          confirmaciones,
        }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as
        | ResultadoAprobacion
        | { mensaje?: string }
        | null;
      if (!cuerpo || !('mensaje' in cuerpo)) {
        throw new Error('El servidor no devolvió un resultado válido.');
      }
      if (!respuesta.ok || !('ok' in cuerpo) || !cuerpo.ok) {
        throw new Error(cuerpo.mensaje || 'No fue posible publicar la aprobación.');
      }
      setResultado(cuerpo as ResultadoAprobacion);
      setCandidatos((previo) =>
        previo.map((candidato) =>
          candidato.id === seleccionado.id
            ? { ...candidato, estado: 'APROBADA' }
            : candidato
        )
      );
      setSeleccionado((previo) =>
        previo ? { ...previo, estado: 'APROBADA' } : previo
      );
      await cargarCandidatos(token.trim());
    } catch (fallo) {
      setErrorAprobacion(
        fallo instanceof Error
          ? fallo.message
          : 'No fue posible publicar la aprobación.'
      );
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className="wa-admin-resources">
      <div className="wa-admin-resources-intro">
        <span className="wa-resources-eyebrow">OpenMAIC · Revisión académica</span>
        <p>
          Revisa los videos pendientes de cada clase y publícalos como recursos
          validados. La aprobación queda registrada con revisor, fecha, evidencia y
          versión de criterios.
        </p>
      </div>

      {!tokenConfirmado && (
        <form className="wa-admin-resources-token" onSubmit={confirmarToken}>
          <div>
            <strong>Token de revisión</strong>
            <p>
              Se configura en el servidor como <code>EDUCATIONAL_RESOURCES_ADMIN_TOKEN</code>.
              No se guarda en el repositorio ni se envía al navegador hasta que lo
              introduces aquí. Se conserva sólo durante esta pestaña.
            </p>
          </div>
          <label>
            Token administrativo
            <input
              type="password"
              value={token}
              onChange={(evento) => setToken(evento.target.value)}
              autoComplete="off"
              placeholder="Pega el token del servidor"
            />
          </label>
          <button
            type="submit"
            className="wa-resource-btn wa-resource-btn--primary"
            disabled={cargando}
          >
            {cargando ? 'Verificando…' : 'Abrir cola de revisión'}
          </button>
          {error && (
            <p className="wa-resource-warning" role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      {tokenConfirmado && (
        <>
          <div className="wa-admin-resources-toolbar">
            <p>
              <strong>{candidatos.length}</strong> candidato
              {candidatos.length === 1 ? '' : 's'} · Criterios{' '}
              <code>{versionCriterios}</code>
            </p>
            <button
              type="button"
              className="wa-resource-btn wa-resource-btn--secondary"
              onClick={() => void cargarCandidatos(token.trim())}
              disabled={cargando}
            >
              {cargando ? 'Actualizando…' : 'Actualizar cola'}
            </button>
          </div>

          {aviso && (
            <p className="wa-resource-review-status is-ok" role="status">
              {aviso}
            </p>
          )}
          {error && !seleccionado && (
            <p className="wa-resource-warning" role="alert">
              {error}
            </p>
          )}

          <div className="wa-admin-resources-layout">
            <section aria-label="Candidatos pendientes">
              <h2>Cola de revisión</h2>
              {candidatos.length === 0 && (
                <div className="wa-resources-empty">
                  <WisdomIcon name="check" size={26} color="emerald" />
                  <strong>No hay candidatos pendientes</strong>
                  <p>
                    Abre una clase en el aula para generar candidatos con la búsqueda
                    contextual. Los videos sin validación completa aparecerán aquí.
                  </p>
                </div>
              )}
              <ul className="wa-admin-resources-list">
                {candidatos.map((candidato) => (
                  <li key={candidato.id}>
                    <button
                      type="button"
                      className={`wa-admin-resource-item${
                        seleccionado?.id === candidato.id ? ' is-selected' : ''
                      }`}
                      onClick={() => seleccionarCandidato(candidato)}
                      aria-pressed={seleccionado?.id === candidato.id}
                    >
                      <span className="wa-admin-resource-context">
                        {candidato.contexto.asignatura} · {candidato.contexto.curso}
                      </span>
                      <strong>{candidato.contexto.unidad}</strong>
                      <span className="wa-admin-resource-video">
                        {candidato.recurso.titulo}
                      </span>
                      <span className="wa-admin-resource-meta">
                        <span
                          className={`wa-resource-badge ${estadoBadge(candidato.estado)}`}
                        >
                          {candidato.estado === 'SOLICITADA'
                            ? 'Solicitada'
                            : candidato.estado === 'APROBADA'
                            ? 'Aprobada'
                            : candidato.estado === 'RECHAZADA'
                            ? 'Rechazada'
                            : 'Pendiente'}
                        </span>
                        <span>Puntuación {candidato.recurso.puntuacion}/100</span>
                        <span>{candidato.recurso.canal}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Revisión del candidato">
              {!seleccionado && (
                <div className="wa-resources-empty">
                  <WisdomIcon name="video" size={26} color="gold" />
                  <strong>Selecciona un candidato</strong>
                  <p>
                    Revisa el video, confirma los seis controles y registra la evidencia.
                    Al aprobarlo, se publicará en el catálogo curado y aparecerá como
                    validado para esa clase.
                  </p>
                </div>
              )}

              {seleccionado && (
                <div className="wa-admin-review">
                  <div className="wa-admin-review-heading">
                    <span className="wa-resource-kicker">
                      {seleccionado.contexto.asignatura} · {seleccionado.contexto.curso}
                    </span>
                    <h2>{seleccionado.contexto.unidad}</h2>
                    <p>{seleccionado.recurso.titulo}</p>
                    <span>{seleccionado.recurso.canal}</span>
                  </div>

                  {seleccionado.recurso.reproduceIntegrado ? (
                    <div className="wa-resource-player-frame wa-admin-review-player">
                      <iframe
                        src={seleccionado.recurso.embedUrl}
                        title={`Revisión del video: ${seleccionado.recurso.titulo}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  ) : (
                    <div className="wa-resource-player-fallback">
                      <strong>Reproducción integrada no verificada</strong>
                      <p>
                        Abre el video en YouTube para revisarlo. Si confirmas que se
                        reproduce, podrás aprobarlo para inserción integrada.
                      </p>
                      <a
                        href={seleccionado.recurso.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wa-resource-btn wa-resource-btn--primary"
                      >
                        Abrir en YouTube
                      </a>
                    </div>
                  )}

                  <details className="wa-resource-details">
                    <summary>Motivos de la clasificación pendiente</summary>
                    <ul>
                      {seleccionado.recurso.motivos.map((motivo, indice) => (
                        <li key={`${seleccionado.id}-motivo-${indice}`}>{motivo}</li>
                      ))}
                    </ul>
                    <p>
                      Puntuación de metadatos: {seleccionado.recurso.puntuacion}/100 ·
                      Origen: {seleccionado.recurso.origen}
                    </p>
                  </details>

                  {seleccionado.estado === 'APROBADA' ? (
                    <>
                      {resultado && (
                        <p className="wa-resource-review-status is-ok" role="status">
                          {resultado.mensaje}
                        </p>
                      )}
                      <p className="wa-resource-review-status is-ok" role="status">
                        Este recurso ya fue aprobado. El aula lo mostrará como validado al
                        actualizar las recomendaciones.
                      </p>
                    </>
                  ) : (
                    <form className="wa-admin-review-form" onSubmit={aprobar}>
                      <fieldset>
                        <legend>Confirmaciones obligatorias</legend>
                        {ETIQUETAS_CONFIRMACION.map((item) => (
                          <label key={item.clave} className="wa-report-option">
                            <input
                              type="checkbox"
                              checked={confirmaciones[item.clave]}
                              onChange={() => alternarConfirmacion(item.clave)}
                            />
                            <span>
                              <strong>{item.titulo}</strong>
                              <small>{item.detalle}</small>
                            </span>
                          </label>
                        ))}
                      </fieldset>

                      <label className="wa-report-comment">
                        Revisor responsable
                        <span>Nombre de la persona que aprueba el recurso.</span>
                        <input
                          type="text"
                          value={revisor}
                          onChange={(evento) => setRevisor(evento.target.value)}
                          maxLength={120}
                          placeholder="Ej. Prof. Mateo"
                        />
                      </label>

                      <label className="wa-report-comment">
                        Evidencia de revisión
                        <span>
                          Describe qué comprobaste: pertinencia, ejemplos, lenguaje,
                          duración y reproducción.
                        </span>
                        <textarea
                          value={evidencia}
                          onChange={(evento) => setEvidencia(evento.target.value)}
                          maxLength={600}
                          rows={4}
                          placeholder="Ej. Revisé el video completo: explica el tema, usa ejemplos adecuados para 8.° EGB y se reproduce correctamente en el aula."
                        />
                      </label>

                      {errorAprobacion && (
                        <p className="wa-resource-warning" role="alert">
                          {errorAprobacion}
                        </p>
                      )}
                      {resultado && (
                        <div
                          className="wa-resource-review-status is-ok"
                          role="status"
                        >
                          {resultado.mensaje}
                        </div>
                      )}

                      <div className="wa-resource-actions">
                        <button
                          type="submit"
                          className="wa-resource-btn wa-resource-btn--primary"
                          disabled={
                            publicando ||
                            !todasConfirmadas ||
                            revisor.trim().length < 2 ||
                            evidencia.trim().length < 10
                          }
                        >
                          {publicando ? 'Publicando…' : 'Aprobar y publicar'}
                        </button>
                        <a
                          href={seleccionado.recurso.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-resource-btn wa-resource-btn--secondary"
                        >
                          Ver en YouTube
                        </a>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
