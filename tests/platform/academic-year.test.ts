import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EcuadorSchoolCalendarEngine,
  FERIADOS_ECUADOR_2026_2027,
} from '../../src/services/ecuadorSchoolCalendar';
import { curriculumAuditorAndFiller } from '../../src/services/curriculumAuditorAndFiller';
import { dailyGuideCompiler } from '../../src/lib/pdf/daily-guide-compiler';
import { ESTUDIANTE_AVRIL_INICIAL } from '../../src/types/wisdom';

test('el año escolar inicia el lunes 26 de octubre de 2026', () => {
  const days = EcuadorSchoolCalendarEngine.obtenerDiasEscolares(200);
  assert.equal(EcuadorSchoolCalendarEngine.FECHA_INICIO_OFICIAL, '2026-10-26');
  assert.equal(days.length, 200);
  assert.equal(days[0].fechaIso, '2026-10-26');
  assert.equal(new Date(`${days[0].fechaIso}T12:00:00Z`).getUTCDay(), 1);
});

test('los 200 días escolares excluyen fines de semana y feriados', () => {
  const days = EcuadorSchoolCalendarEngine.obtenerDiasEscolares(200);
  const dates = new Set(days.map((day) => day.fechaIso));
  assert.equal(dates.size, 200);
  const holidayDates = new Set(FERIADOS_ECUADOR_2026_2027.map((holiday) => holiday.fecha));
  for (const day of days) {
    const weekday = new Date(`${day.fechaIso}T12:00:00Z`).getUTCDay();
    assert.ok(weekday >= 1 && weekday <= 5, `${day.fechaIso} no es día laborable`);
    assert.equal(holidayDates.has(day.fechaIso), false, `${day.fechaIso} es feriado`);
  }
});

test('la auditoría curricular certifica los 200 días sin faltantes', () => {
  const audit = curriculumAuditorAndFiller.auditarPlanCompleto();
  assert.equal(audit.totalDiasAuditados, 200);
  assert.equal(audit.diasCompletos, 200);
  assert.equal(audit.coberturaPorcentaje, 100);
  assert.equal(audit.estado, 'CERTIFICADO_SIN_FALTANTES');
});

test('cada jornada genera cinco bloques y una guía HTML completa', () => {
  const journey = curriculumAuditorAndFiller.obtenerJornadaEscolarCompleta(1, ESTUDIANTE_AVRIL_INICIAL);
  assert.equal(journey.materias.length, 5);
  assert.equal(journey.fechaIso, '2026-10-26');
  const html = dailyGuideCompiler.compilarGuiaDiariaHtml(journey);
  assert.ok(html.includes('Guía de Estudio'));
  assert.ok(html.includes('Desarrollo Conceptual'));
  assert.ok(html.length > 10000);
});
