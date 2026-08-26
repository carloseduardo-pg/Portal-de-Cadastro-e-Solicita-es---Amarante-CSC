export type NavMatchChild = {
  to: string;
  label: string;
  exact?: boolean;
  /** Prefixos adicionais que também marcam este item como ativo. */
  alsoActive?: string[];
};

/** Determina se um subitem do menu está ativo (evita Dashboard ativo em rotas filhas). */
export function isNavChildActive(pathname: string, child: NavMatchChild): boolean {
  const path = pathname.replace(/\/$/, '') || '/';

  if (child.alsoActive?.some((prefix) => path.startsWith(prefix.replace(/\/$/, '')))) {
    return true;
  }

  const to = child.to.replace(/\/$/, '') || '/';

  if (child.exact) {
    return path === to;
  }

  return path === to || path.startsWith(`${to}/`);
}

/** Encontra o subitem ativo para breadcrumb. */
export function findActiveNavChild(
  pathname: string,
  children: NavMatchChild[],
): NavMatchChild | undefined {
  return children.find((c) => isNavChildActive(pathname, c));
}

export function isNavGroupChildActive(pathname: string, children?: NavMatchChild[]): boolean {
  return Boolean(children?.some((c) => isNavChildActive(pathname, c)));
}
