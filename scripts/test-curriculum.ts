/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Prueba de Integridad Curricular
 * ARCHIVO: scripts/test-curriculum.ts
 *
 * PROPÓSITO:
 * Verifica que la malla personalizada de Gael y Avril cubra los 200 días
 * lectivos, que todas las asignaturas tengan lección completa y que las áreas
 * académicas no contengan referencias confesionales forzadas.
 *
 * USO: npm run test:curriculum
 * ==============================================================================
 */

import { curriculumAuditorAndFiller } from '../src/services/curriculumAuditorAndFiller';
import { curriculumContentEngine } from '../src/services/curriculumContentEngine';
import { ESTUDIANTE_AVRIL_INICIAL, ESTUDIANTE_GAEL_INICIAL } from '../src/types/wisdom';
import { PERFIL_AVRIL_8VO } from '../src/data/curriculum/avril-8vo';
import { PERFIL_GAEL_4TO } from '../src/data/curriculum/gael-4to';

const ERRORES: string[] = [];

function comprobar(condicion: boolean, mensaje: string): void {
  if (!condicion) ERRORES.push(mensaje);
}

const auditoria = curriculumAuditorAndFiller.auditarPlanCompleto();
comprobar(auditoria.diasCompletos === 200, `Cobertura incompleta: ${auditoria.diasCompletos}/200`);
comprobar(auditoria.totalMateriasCatalogo === 20, `Catálogo esperado de 20 materias, obtenido ${auditoria.totalMateriasCatalogo}`);
comprobar(
  (auditoria.totalUnidadesCurriculares ?? 0) >= 240,
  `Unidades curriculares insuficientes: ${auditoria.totalUnidadesCurriculares}`
);

const perfiles = [
  { perfil: PERFIL_GAEL_4TO, estudiante: ESTUDIANTE_GAEL_INICIAL, esperadas: 9 },
  { perfil: PERFIL_AVRIL_8VO, estudiante: ESTUDIANTE_AVRIL_INICIAL, esperadas: 11 },
];

for (const { perfil, estudiante, esperadas } of perfiles) {
  comprobar(perfil.asignaturas.length === esperadas, `${perfil.estudiante}: se esperaban ${esperadas} asignaturas`);
  comprobar(
    perfil.asignaturas.filter((a) => a.area === 'TEOLOGIA').length === 1,
    `${perfil.estudiante}: debe existir exactamente una asignatura confesional`
  );

  for (let dia = 1; dia <= 200; dia++) {
    const jornada = curriculumAuditorAndFiller.obtenerJornadaEscolarCompleta(dia, estudiante);
    comprobar(jornada.materias.length === 5, `${perfil.estudiante} día ${dia}: se esperaban 5 bloques`);
    comprobar(
      jornada.materias.every((m) => m.temaDelDia && m.guiaPedagogica && m.preguntaQuiz.opciones.length === 3),
      `${perfil.estudiante} día ${dia}: bloque incompleto`
    );
  }

  for (const asignatura of perfil.asignaturas) {
    const leccion = curriculumContentEngine.obtenerLeccion(
      asignatura.nombre,
      perfil.estudiante === 'Gael'
    );
    comprobar(leccion.diapositivas.length === 4, `${asignatura.nombre}: se esperaban 4 diapositivas`);
    comprobar(leccion.preguntasQuiz.length >= 3, `${asignatura.nombre}: se esperaban al menos 3 preguntas`);
    comprobar(Boolean(leccion.retoPbl?.titulo), `${asignatura.nombre}: reto PBL ausente`);

    if (asignatura.area !== 'TEOLOGIA') {
      const texto = JSON.stringify(leccion);
      comprobar(
        !/\b(Dios|Biblia|Cristo|versículo|Señor)\b|fe cristiana|cosmovisión bíblica/i.test(texto),
        `${asignatura.nombre}: contiene referencias confesionales en un área académica`
      );
    } else {
      comprobar(
        /Salmos|Proverbios|Colosenses|Romanos|Mateo|Génesis|Isaías|Efesios|Juan|Hechos/i.test(
          JSON.stringify(leccion)
        ),
        `${asignatura.nombre}: no se detectó contenido bíblico`
      );
    }
  }
}

if (ERRORES.length > 0) {
  console.error('✗ PRUEBA CURRICULAR FALLIDA');
  ERRORES.slice(0, 50).forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✓ PRUEBA CURRICULAR APROBADA');
console.log(`  Días completos: ${auditoria.diasCompletos}/200`);
console.log(`  Materias: ${auditoria.totalMateriasCatalogo}`);
console.log(`  Unidades: ${auditoria.totalUnidadesCurriculares}`);
console.log('  Separación epistemológica: académicas neutrales • teología confesional exclusiva');
