import { roleNames } from './atlas';

export function pointLabel(name: string, roles: string[]) {
  const ordered = roleNames.filter((role) => roles.includes(role));
  if (roles.includes('大络')) ordered.push('大络');
  return ordered.length ? `${name}（${ordered.join('、')}）` : name;
}
