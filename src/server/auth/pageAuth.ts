import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from '../config';
import { loadSessionByToken } from './sessions';
import { hasPermission, type AuthUser } from './authorization';
import {
  findResourceBySlug,
  userCanAccessResource,
  userHasAnyEducationalAccess,
} from '../domain/access';

export async function getPageUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return loadSessionByToken(token)?.user ?? null;
}

export async function requirePageUser(): Promise<AuthUser> {
  const user = await getPageUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword) redirect('/cambiar-contrasena');
  return user;
}

export async function requirePagePermission(permission: string): Promise<AuthUser> {
  const user = await requirePageUser();
  if (!hasPermission(user, permission)) redirect('/dashboard');
  return user;
}

export async function requirePageContentAccess(): Promise<AuthUser> {
  const user = await requirePageUser();
  if (!userHasAnyEducationalAccess(user)) redirect('/catalogo');
  return user;
}

export async function requirePageGlobalContent(): Promise<AuthUser> {
  const user = await requirePageUser();
  if (!user.hasGlobalContentAccess) redirect('/dashboard');
  return user;
}

export async function requirePageResource(slug: string): Promise<AuthUser> {
  const user = await requirePageUser();
  const resource = findResourceBySlug(slug);
  if (!resource || !userCanAccessResource(user, resource)) redirect('/catalogo');
  return user;
}
