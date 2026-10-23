import {
  getDb,
  prepare,
  setDatabaseInitializer,
  withTransaction,
} from './sqlite';
import { seedFoundation } from './seed';

setDatabaseInitializer(seedFoundation);

/**
 * Devuelve la conexión inicializada. La siembra de roles, permisos y catálogo
 * se ejecuta dentro de `getDb()` antes de abrir transacciones de la aplicación.
 */
export function db() {
  return getDb();
}

export { prepare, withTransaction };
export { nowIso, closeDb, resetDbForTests, getDatabasePath, openRawDatabase } from './sqlite';
