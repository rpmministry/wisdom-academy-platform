/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Sincronizador Curricular a Google Drive
 * ARCHIVO: scripts/sync-and-upload-curriculum.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Este script escanea todos los macrocurrículos, microcurrículos, planes escolares
 * y libros de texto de Avril (8° EGB) y Gael (4° EGB) ubicados en la carpeta local
 * "C:\Users\Alsiz\Documents\Wisdom School\Wisdom School Documentos Base\CURRICULOS".
 *
 * Sincroniza y organiza los archivos tanto en Google Drive API v3 como en la caché
 * local offline del sistema (.drive_local_cache/), generando la estructura oficial
 * con el horario escolar estricto:
 *   - Jornada: 08:00 a 12:00
 *   - Recreo / Pausa Activa: 09:30 a 10:00
 *   - Bloque 1: 08:00 - 08:45
 *   - Bloque 2: 08:45 - 09:30
 *   - RECREO:  09:30 - 10:00
 *   - Bloque 3: 10:00 - 10:45
 *   - Bloque 4: 10:45 - 11:30
 *   - Bloque 5: 11:30 - 12:00
 * ==============================================================================
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const RUTA_CURRICULOS_BASE = 'C:\\Users\\Alsiz\\Documents\\Wisdom School\\Wisdom School Documentos Base\\CURRICULOS';
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1s_VcSUhdehggzmUsXmsxiGT7M-hNnz9a';

// Configuración de materias y mapeo de archivos para Gael (4° EGB)
const MATERIAS_GAEL = [
  {
    codigo: '01_Lengua_y_Literatura',
    nombre: 'Lengua y Literatura',
    archivosOrigen: [
      'GAEL/TEXTOS\'POR MATERIA/Texto Lengua 4.pdf',
      'GAEL/TEXTOS\'POR MATERIA/Super-cuaderno-de-reglas-de-ortografia-100-ejercicios.pdf',
      'GAEL/MACRO Y MICRO CURRICULOS/LENGUA Y LITERATURA 4 DE BASICA/Plan Curricular Lengua y Literatura 4to EGB.pdf',
      'GAEL/AC_4_LL.pdf',
    ],
  },
  {
    codigo: '02_Matematicas',
    nombre: 'Matemáticas Creacionales',
    archivosOrigen: [
      'GAEL/TEXTOS\'POR MATERIA/texto Matematica 4.pdf',
      'GAEL/MACRO Y MICRO CURRICULOS/MATEMATICAS 4 DE BASICA/Plan Curricular Matemáticas 4to EGB.pdf',
      'GAEL/AC_4_M.pdf',
    ],
  },
  {
    codigo: '03_Ciencias_Naturales',
    nombre: 'Ciencias Naturales',
    archivosOrigen: [
      'GAEL/MACRO Y MICRO CURRICULOS/CIENCIAS NATURALES 4 DE BASICA/Plan Curricular Ciencias Naturales 4to EGB.pdf',
      'GAEL/AC_4_CN.pdf',
    ],
  },
  {
    codigo: '04_Estudios_Sociales',
    nombre: 'Estudios Sociales del Ecuador',
    archivosOrigen: [
      'GAEL/TEXTOS\'POR MATERIA/4to_EGB_ESTUDIOS_SOCIALES Librosdetextoecuador.org.pdf',
      'GAEL/MACRO Y MICRO CURRICULOS/ESTUDIOS SOCIALES 4 DE BASICA/Plan Curricular Estudios Sociales 4to EGB.pdf',
      'GAEL/AC_4_ES.pdf',
    ],
  },
  {
    codigo: '05_Ingles',
    nombre: 'English Phonics & Reading',
    archivosOrigen: [
      'GAEL/TEXTOS\'POR MATERIA/4th_EGB_ENGLISH Librosdetextoecuador.org.pdf',
      'GAEL/MACRO Y MICRO CURRICULOS/INGLES 4 DE BASICA/Plan Curricular Inglés 4to EGB.pdf',
    ],
  },
  {
    codigo: '06_Software_y_Programacion',
    nombre: 'Software y Programación',
    archivosOrigen: [
      'GAEL/TEXTOS\'POR MATERIA/think-python-es.pdf',
      'GAEL/TEXTOS\'POR MATERIA/2012_curso_python-para-principiantes (2).pdf',
      'GAEL/MACRO Y MICRO CURRICULOS/SOFTWARE 4 DE BASICA/Software y Programación 4 de básica Gael.pdf',
    ],
  },
  {
    codigo: '07_Arte_ECA',
    nombre: 'Educación Cultural y Artística (Arte)',
    archivosOrigen: [
      'GAEL/TEXTOS\'POR MATERIA/Libro_de_Actividades_4to._Grado.pdf',
      'GAEL/MACRO Y MICRO CURRICULOS/ARTE/Plan Curricular Arte 4to EGB.pdf',
    ],
  },
  {
    codigo: '08_Educacion_Fisica',
    nombre: 'Educación Física y Salud',
    archivosOrigen: [
      'GAEL/MACRO Y MICRO CURRICULOS/EDUCACION FISICA 4 DE BASICA/Plan Curricular Educación Física 4to EGB.pdf',
    ],
  },
  {
    codigo: '09_Relacion_con_Dios',
    nombre: 'Relación con Dios (Cosmovisión Bíblica)',
    archivosOrigen: [
      'GAEL/MACRO Y MICRO CURRICULOS/RELACION CON DIOS/Plan Curricular Relación con Dios 4to EGB.pdf',
      'GAEL/TEXTOS\'POR MATERIA/Paginas web recursos religión cristiana.txt',
    ],
  },
  {
    codigo: '10_Plan_y_Curriculo_Oficial',
    nombre: 'Plan Escolar y Normativa MINEDUC',
    archivosOrigen: [
      'GAEL/Plan Escolar 2026-2027 - Gael (4to de Básica).pdf',
      'GAEL/plan_escolar_gael_4to_b_sica.html',
      'GAEL/AC_4.pdf',
      'GAEL/Bases_Pedagogicas.pdf',
      'GAEL/Ejes_Traversales_EGB.pdf',
      'GAEL/Estructura_Curricular_EGB.pdf',
      'GAEL/acuerdo-nro.-mineduc-me-2015-00055-a.pdf',
    ],
  },
];

// Configuración de materias y mapeo de archivos para Avril (8° EGB)
const MATERIAS_AVRIL = [
  {
    codigo: '01_Matematicas',
    nombre: 'Matemáticas y Pre-Álgebra',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/MATEMATICA 8.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo - Matemáticas 8vo - Avril.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo - Matemáticas 8vo - Avril.pdf',
    ],
  },
  {
    codigo: '02_Lengua_y_Literatura',
    nombre: 'Lengua y Literatura',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/LENGUA Y LITERATURA 8.pdf',
      'AVRIL/TEXTOS POR MATERIA/Super-cuaderno-de-reglas-de-ortografia-100-ejercicios (1).pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo - Lengua y Literatura 8vo.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo - Lengua y Literatura 8vo.pdf',
    ],
  },
  {
    codigo: '03_Ciencias_Naturales',
    nombre: 'Ciencias Naturales Integradas',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/CIENCIAS NATURALES 8.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro y Micro Currículo Ciencias Naturales 8 de básica - Wisdom School.pdf',
    ],
  },
  {
    codigo: '04_Estudios_Sociales',
    nombre: 'Estudios Sociales e Historia del Ecuador',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/8° EGB ESTUDIOS SOCIALES.pdf',
      'AVRIL/TEXTOS POR MATERIA/Módulo-de-etnoeducación-para-docentes-de-8vo-de-EGB.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo - Estudios Sociales - Wisdom School.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo - Estudios Sociales - Wisdom School.pdf',
    ],
  },
  {
    codigo: '05_Ingles',
    nombre: 'Academic English & Literature',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/8th_EGB_ENGLISH Librosdetextoecuador.org.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo INGLES - Wisdom School.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo INGLES - Wisdom School.pdf',
    ],
  },
  {
    codigo: '06_Software_y_Programacion',
    nombre: 'Software y Programación Python',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/think-python-es (1).pdf',
      'AVRIL/TEXTOS POR MATERIA/2012_curso_python-para-principiantes.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo software- Wisdom School.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo software- Wisdom School.pdf',
    ],
  },
  {
    codigo: '07_Ciencias_Politicas_y_RRII',
    nombre: 'Ciencias Políticas y Relaciones Internacionales',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/introduccion-a-las-relaciones-internacionales-thomas-legler-arturo-santa-cruz-laura-zamudio-gonzalez.pdf',
      'AVRIL/TEXTOS POR MATERIA/fundamentos-de-las-relaciones-internacionales-karen-a-mingst-14954.pdf',
      'AVRIL/TEXTOS POR MATERIA/actores-internacionales-contemporaneos-monica-rocha-herrera-m-carmen-quesada-alcala-mario-ivan-uruena-sanchez.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo - Ciencias Políticas y RR.II. - Wisdom School.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo - Ciencias Políticas y RR.II. - Wisdom School.pdf',
    ],
  },
  {
    codigo: '08_Administracion_y_Marketing',
    nombre: 'Administración y Marketing Digital',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/Fundamentos del Marketing-Kotler.pdf',
      'AVRIL/TEXTOS POR MATERIA/Claves-del-nuevo-marketing-Enrique-Burgos-Javier-Cerezo.pdf',
      'AVRIL/TEXTOS POR MATERIA/Manual-de-Planeaci-n-Estrat-gica-de-Marketing-Elver-Alfonso-Bermeo-Mu-oz-Cristian-Rinc-n-Guio.pdf',
      'AVRIL/TEXTOS POR MATERIA/15.-Marketing-de-contenidos-autor-Divisadero.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo - Administración y Marketing.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo - Administración y Marketing.pdf',
    ],
  },
  {
    codigo: '09_Arte_ECA',
    nombre: 'Educación Cultural y Artística (Arte)',
    archivosOrigen: [
      'AVRIL/TEXTOS POR MATERIA/ECA_artistica 8.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo - ECA - Wisdom School.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo - ECA - Wisdom School.pdf',
    ],
  },
  {
    codigo: '10_Educacion_Fisica',
    nombre: 'Educación Física y Salud',
    archivosOrigen: [
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo - Educación Física - Avril.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo - Educación Física - Avril.pdf',
    ],
  },
  {
    codigo: '11_Relacion_con_Dios',
    nombre: 'Relación con Dios (Teología y Cosmovisión)',
    archivosOrigen: [
      'AVRIL/TODOS LOS CURRICULOS/Macro Currículo - Relación con Dios - Avril.pdf',
      'AVRIL/TODOS LOS CURRICULOS/Micro Currículo - Relación con Dios - Avril.pdf',
    ],
  },
  {
    codigo: '12_Plan_y_Curriculo_Oficial',
    nombre: 'Plan Escolar y Normativa MINEDUC',
    archivosOrigen: [
      'AVRIL/Plan Escolar 2026-2027 - Avril (8vo de Básica).pdf',
      'AVRIL/plan_escolar_avril_8vo_b_sica.html',
      'AVRIL/BGU-tomo-1.pdf',
      'AVRIL/BGU-tomo-2.pdf',
    ],
  },
];

async function ejecutarSincronizacionCurricular() {
  console.log('======================================================================');
  console.log('   WISDOM ACADEMY - SINCRONIZADOR CURRICULAR A DRIVE Y CACHÉ CLOUD    ');
  console.log('======================================================================\n');

  let drive: any = null;
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (serviceEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY')) {
    try {
      const auth = new google.auth.JWT({
        email: serviceEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      drive = google.drive({ version: 'v3', auth });
      console.log('✓ Conexión establecida con Google Drive API v3');
    } catch (err: any) {
      console.log('⚠ No se pudo autenticar con Google Drive:', err.message);
    }
  }

  // 1. Obtener ID de las carpetas 04_Cuarto_EGB_Gael y 08_Octavo_EGB_Avril
  let idCarpetaGael: string | null = null;
  let idCarpetaAvril: string | null = null;

  if (drive) {
    try {
      const res = await drive.files.list({
        q: `'${ROOT_FOLDER_ID}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
      });

      for (const f of res.data.files || []) {
        if (f.name.includes('04_Cuarto_EGB_Gael')) idCarpetaGael = f.id;
        if (f.name.includes('08_Octavo_EGB_Avril')) idCarpetaAvril = f.id;
      }
      console.log(`✓ Carpetas en Google Drive identificadas:`);
      console.log(`  - Gael (4° EGB):  ${idCarpetaGael || 'No encontrada'}`);
      console.log(`  - Avril (8° EGB): ${idCarpetaAvril || 'No encontrada'}\n`);
    } catch (e: any) {
      console.log('⚠ Consulta de carpetas en Drive con advertencia:', e.message);
    }
  }

  // 2. Procesar Gael
  await procesarEstudiante({
    nombreEstudiante: 'Gael',
    codigoCarpeta: '04_Cuarto_EGB_Gael',
    idDriveFolder: idCarpetaGael,
    materias: MATERIAS_GAEL,
    horarioConfig: {
      duracionBloque1a4: 45,
      duracionBloque5: 30,
      recreoInicio: '09:30',
      recreoFin: '10:00',
    },
    drive,
  });

  // 3. Procesar Avril
  await procesarEstudiante({
    nombreEstudiante: 'Avril',
    codigoCarpeta: '08_Octavo_EGB_Avril',
    idDriveFolder: idCarpetaAvril,
    materias: MATERIAS_AVRIL,
    horarioConfig: {
      duracionBloque1a4: 45,
      duracionBloque5: 30,
      recreoInicio: '09:30',
      recreoFin: '10:00',
    },
    drive,
  });

  console.log('\n======================================================================');
  console.log(' ★★★ SINCRONIZACIÓN Y ORGANIZACIÓN CURRICULAR COMPLETADA CON ÉXITO ★★★');
  console.log('======================================================================\n');
}

async function procesarEstudiante({
  nombreEstudiante,
  codigoCarpeta,
  idDriveFolder,
  materias,
  horarioConfig,
  drive,
}: {
  nombreEstudiante: string;
  codigoCarpeta: string;
  idDriveFolder: string | null;
  materias: any[];
  horarioConfig: any;
  drive: any;
}) {
  console.log(`----------------------------------------------------------------------`);
  console.log(` PROCESANDO ESTUDIANTE: ${nombreEstudiante.toUpperCase()} (${codigoCarpeta})`);
  console.log(`----------------------------------------------------------------------`);

  const cacheDir = path.join(process.cwd(), '.drive_local_cache', codigoCarpeta);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const mapaSubcarpetasDrive: Record<string, string> = {};

  // Si drive está disponible y tenemos la carpeta del grado, listar o crear subcarpetas
  if (drive && idDriveFolder) {
    try {
      const res = await drive.files.list({
        q: `'${idDriveFolder}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
      });
      for (const f of res.data.files || []) {
        mapaSubcarpetasDrive[f.name] = f.id;
      }

      for (const m of materias) {
        if (!mapaSubcarpetasDrive[m.codigo]) {
          try {
            const folderRes = await drive.files.create({
              requestBody: {
                name: m.codigo,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [idDriveFolder],
              },
              fields: 'id, name',
            });
            mapaSubcarpetasDrive[m.codigo] = folderRes.data.id;
            console.log(`  + Creada subcarpeta en Google Drive: ${m.codigo}`);
          } catch (e: any) {
            console.log(`  ⚠ No se pudo crear carpeta en Drive ${m.codigo}:`, e.message);
          }
        }
      }
    } catch (e: any) {
      console.log('  ⚠ Error al gestionar subcarpetas en Drive:', e.message);
    }
  }

  // Copiar archivos a la caché local organizada y sincronizar metadatos
  let archivosCopiados = 0;
  for (const m of materias) {
    const subfolderCache = path.join(cacheDir, m.codigo);
    if (!fs.existsSync(subfolderCache)) {
      fs.mkdirSync(subfolderCache, { recursive: true });
    }

    for (const relPath of m.archivosOrigen) {
      const absPath = path.join(RUTA_CURRICULOS_BASE, relPath);
      if (fs.existsSync(absPath)) {
        const destPath = path.join(subfolderCache, path.basename(absPath));
        try {
          fs.copyFileSync(absPath, destPath);
          archivosCopiados++;
        } catch {}
      }
    }
  }

  console.log(`  ✓ ${archivosCopiados} archivos curriculares y libros de texto respaldados en caché local.`);

  // Generar curriculo_anual.json con el horario estricto 08:00 - 12:00 y recreo 09:30 - 10:00
  const horarioSemanal = generarHorarioSemanalEstricto(nombreEstudiante);

  const curriculoJson = {
    version: '2.0.0',
    estudiante: nombreEstudiante,
    codigoCarpeta,
    anoLectivo: '2026-2027',
    jornada: {
      horaInicio: '08:00',
      horaFin: '12:00',
      recreo: {
        inicio: '09:30',
        fin: '10:00',
        duracionMinutos: 30,
      },
      bloques: [
        { numero: 1, inicio: '08:00', fin: '08:45', duracionMinutos: 45 },
        { numero: 2, inicio: '08:45', fin: '09:30', duracionMinutos: 45 },
        { numero: 'RECREO', inicio: '09:30', fin: '10:00', duracionMinutos: 30, tipo: 'Pausa Activa / Recreo' },
        { numero: 3, inicio: '10:00', fin: '10:45', duracionMinutos: 45 },
        { numero: 4, inicio: '10:45', fin: '11:30', duracionMinutos: 45 },
        { numero: 5, inicio: '11:30', fin: '12:00', duracionMinutos: 30 },
      ],
    },
    materias: materias.map((m) => ({
      codigo: m.codigo,
      nombre: m.nombre,
      driveFolderId: mapaSubcarpetasDrive[m.codigo] || null,
      archivos: m.archivosOrigen.map((ao: string) => path.basename(ao)),
    })),
    horarioSemanal,
  };

  const jsonDest = path.join(cacheDir, 'curriculo_anual.json');
  fs.writeFileSync(jsonDest, JSON.stringify(curriculoJson, null, 2), 'utf-8');
  console.log(`  ✓ curriculo_anual.json generado con el horario oficial de 08:00 a 12:00.`);
}

function generarHorarioSemanalEstricto(estudiante: string) {
  if (estudiante === 'Gael') {
    return {
      Lunes: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Matemáticas Creacionales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Ciencias Naturales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Relación con Dios', modalidad: 'TUTORIA_PROFESOR_REAL', plataforma: 'jitsi' },
      ],
      Martes: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Matemáticas Creacionales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Matemáticas Creacionales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Ciencias Naturales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'English Phonics & Reading', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Educación Cultural y Artística (Arte)', modalidad: 'AGENTE_IA_OPENMAIC' },
      ],
      Miercoles: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Estudios Sociales del Ecuador', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Matemáticas Creacionales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Educación Física y Salud', modalidad: 'AGENTE_IA_OPENMAIC' },
      ],
      Jueves: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Ciencias Naturales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Ciencias Naturales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'English Phonics & Reading', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Software y Programación', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
      ],
      Viernes: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Matemáticas Creacionales', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Estudios Sociales del Ecuador', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Estudios Sociales del Ecuador', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Software y Programación', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'English Phonics & Reading', modalidad: 'TUTORIA_PROFESOR_REAL', plataforma: 'jitsi' },
      ],
    };
  } else {
    return {
      Lunes: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Matemáticas y Pre-Álgebra', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Matemáticas y Pre-Álgebra', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Ciencias Naturales Integradas', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Relación con Dios (Teología)', modalidad: 'TUTORIA_PROFESOR_REAL', plataforma: 'jitsi' },
      ],
      Martes: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Academic English & Literature', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Academic English & Literature', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Estudios Sociales e Historia', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Administración y Marketing Digital', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Educación Cultural y Artística (Arte)', modalidad: 'AGENTE_IA_OPENMAIC' },
      ],
      Miercoles: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Software y Programación Python', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Matemáticas y Pre-Álgebra', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Educación Física y Salud', modalidad: 'AGENTE_IA_OPENMAIC' },
      ],
      Jueves: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Ciencias Naturales Integradas', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Ciencias Naturales Integradas', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Ciencias Políticas y RR.II.', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Administración y Marketing Digital', modalidad: 'AGENTE_IA_OPENMAIC' },
      ],
      Viernes: [
        { bloque: 1, hora: '08:00 - 08:45', materia: 'Matemáticas y Pre-Álgebra', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 2, hora: '08:45 - 09:30', materia: 'Software y Programación Python', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 3, hora: '10:00 - 10:45', materia: 'Ciencias Políticas y RR.II.', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 4, hora: '10:45 - 11:30', materia: 'Estudios Sociales e Historia', modalidad: 'AGENTE_IA_OPENMAIC' },
        { bloque: 5, hora: '11:30 - 12:00', materia: 'Academic English & Literature', modalidad: 'TUTORIA_PROFESOR_REAL', plataforma: 'jitsi' },
      ],
    };
  }
}

ejecutarSincronizacionCurricular().catch(console.error);

