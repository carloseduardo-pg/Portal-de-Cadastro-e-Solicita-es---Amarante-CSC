import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon, type IconName } from '../components/Icon';
import { BrandLogo } from '../components/BrandLogo';
import { findActiveNavChild, isNavChildActive, isNavGroupChildActive } from '../lib/navActive';
import './AppShell.css';

type NavChild = {
  to: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  alsoActive?: string[];
};

type NavItem = {
  label: string;
  icon: IconName;
  to?: string;
  end?: boolean;
  disabled?: boolean;
  tooltip?: string;
  children?: NavChild[];
};

const nav: NavItem[] = [
  { to: '/home', label: 'Home', icon: 'home', end: true },
  {
    label: 'Fornecedores',
    icon: 'users',
    children: [
      { to: '/fornecedores', label: 'Dashboard', icon: 'grid', exact: true },
      { to: '/fornecedores/nova-solicitacao', label: 'Nova Solicitação', icon: 'plus-circle' },
      { to: '/fornecedores/caixa-de-entrada', label: 'Caixa de Entrada', icon: 'inbox' },
      { to: '/fornecedores/todas-solicitacoes', label: 'Todas Solicitações', icon: 'list' },
      { to: '/fornecedores/minhas-solicitacoes', label: 'Minhas Solicitações', icon: 'user-check' },
      { to: '/fornecedores/base', label: 'Base', icon: 'database', exact: true },
      { to: '/fornecedores/inativos', label: 'Inativos', icon: 'archive', exact: true },
    ],
  },
  {
    label: 'Produtos',
    icon: 'box',
    children: [
      { to: '/produtos', label: 'Dashboard', icon: 'grid', exact: true },
      {
        to: '/produtos/nova-solicitacao',
        label: 'Nova Solicitação',
        icon: 'plus-circle',
        alsoActive: ['/produtos/dados-do-item'],
      },
      { to: '/produtos/caixa-de-entrada', label: 'Caixa de Entrada', icon: 'inbox' },
      {
        to: '/produtos/solicitacoes',
        label: 'Solicitações',
        icon: 'columns',
        alsoActive: ['/produtos/solicitacao/'],
      },
      { to: '/produtos/base', label: 'Base', icon: 'database', exact: true },
    ],
  },
  {
    label: 'Fiscal',
    icon: 'cart',
    disabled: true,
    tooltip: 'Em desenvolvimento',
    children: [
      { to: '/fiscal/centro-custo', label: 'Centro de Custo e Pagamento', icon: 'wallet' },
      { to: '/fiscal/notas-sem-cadastro', label: 'Notas sem Cadastro', icon: 'file-alert' },
      { to: '/fiscal/extemporaneas', label: 'Notas Extemporâneas', icon: 'clock' },
    ],
  },
  {
    label: 'Parametrizações',
    icon: 'settings',
    children: [
      { to: '/parametrizacoes/administrativo', label: 'Administrativo', icon: 'shield' },
      { to: '/parametrizacoes/produtos', label: 'Produtos', icon: 'sliders' },
    ],
  },
  { to: '/suporte', label: 'Suporte', icon: 'support', end: true },
  { to: '/faq', label: 'FAQ', icon: 'help', end: true },
];

function NavChildLink({
  child,
  disabled,
  collapsed,
  onNavigate,
  pathname,
}: {
  child: NavChild;
  disabled?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  pathname: string;
}) {
  const active = isNavChildActive(pathname, child);

  return (
    <NavLink
      to={disabled ? '#' : child.to}
      end={child.exact}
      className={`nav-child ${active && !disabled ? 'active' : ''} ${collapsed ? 'nav-child--flyout' : ''}`}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onNavigate?.();
      }}
      title={child.label}
    >
      <Icon name={child.icon} size={18} />
      <span>{child.label}</span>
    </NavLink>
  );
}

function NavGroup({
  item,
  collapsed,
  flyoutOpen,
  onToggleFlyout,
  onCloseFlyout,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  flyoutOpen: boolean;
  onToggleFlyout: () => void;
  onCloseFlyout: () => void;
  pathname: string;
}) {
  const childActive = isNavGroupChildActive(pathname, item.children);
  const [open, setOpen] = useState(Boolean(childActive));
  const btnRef = useRef<HTMLButtonElement>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  useEffect(() => {
    if (collapsed && flyoutOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setFlyoutTop(rect.top);
    }
  }, [collapsed, flyoutOpen]);

  if (item.to) {
    return (
      <NavLink
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'nav-item--collapsed' : ''}`
        }
        title={item.label}
      >
        <span className="nav-icon-wrap">
          <Icon name={item.icon} size={22} />
        </span>
        {!collapsed ? <span className="nav-label">{item.label}</span> : null}
      </NavLink>
    );
  }

  if (collapsed) {
    return (
      <div className="nav-group nav-group--collapsed">
        <button
          ref={btnRef}
          type="button"
          className={`nav-item nav-group-toggle nav-item--collapsed ${childActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''} ${flyoutOpen ? 'flyout-open' : ''}`}
          onClick={() => !item.disabled && onToggleFlyout()}
          title={item.tooltip ?? item.label}
          disabled={item.disabled}
          aria-expanded={flyoutOpen}
        >
          <span className="nav-icon-wrap">
            <Icon name={item.icon} size={22} />
          </span>
        </button>
        {flyoutOpen && item.children ? (
          <div className="nav-flyout" role="menu" style={{ top: flyoutTop }}>
            <p className="nav-flyout-title">{item.label}</p>
            {item.children.map((child) => (
              <NavChildLink
                key={child.to}
                child={child}
                disabled={item.disabled}
                collapsed
                pathname={pathname}
                onNavigate={onCloseFlyout}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="nav-group">
      <button
        type="button"
        className={`nav-item nav-group-toggle ${childActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
        onClick={() => !item.disabled && setOpen((v) => !v)}
        title={item.tooltip}
        disabled={item.disabled}
        aria-expanded={open}
      >
        <span className="nav-icon-wrap">
          <Icon name={item.icon} size={22} />
        </span>
        <span className="nav-label">{item.label}</span>
        <span className="nav-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && item.children ? (
        <div className="nav-children">
          {item.children.map((child) => (
            <NavChildLink key={child.to} child={child} disabled={item.disabled} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Layout autenticado Amarante: sidebar colapsável + topbar verde. */
export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const firstName = user?.name?.split(' ')[0] ?? 'Usuário';
  const [collapsed, setCollapsed] = useState(false);
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);

  const breadcrumb = useMemo(() => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    const pageOverrides: Record<string, string> = {
      '/produtos/dados-do-item': 'Dados do Item',
    };

    for (const item of nav) {
      if (item.to && isNavChildActive(path, { to: item.to, label: item.label, exact: item.end })) {
        return { module: null as string | null, page: pageOverrides[path] ?? item.label };
      }
      if (item.children) {
        const active = findActiveNavChild(path, item.children);
        if (active) {
          return {
            module: item.label,
            page: pageOverrides[path] ?? active.label,
          };
        }
      }
    }
    return { module: null, page: null };
  }, [location.pathname]);

  useEffect(() => {
    if (!collapsed) setOpenFlyout(null);
  }, [collapsed]);

  useEffect(() => {
    setOpenFlyout(null);
  }, [location.pathname]);

  return (
    <div className={`shell ${collapsed ? 'shell--collapsed' : ''}`}>
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${openFlyout ? 'sidebar--flyout-open' : ''}`}>
        <div className="sidebar-brand">
          <BrandLogo
            variant={collapsed ? 'compact' : 'full'}
            className={collapsed ? 'sidebar-logo sidebar-logo--compact' : 'sidebar-logo'}
          />
        </div>
        {!collapsed ? <p className="sidebar-greeting">Olá, {firstName}</p> : null}
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavGroup
              key={item.label}
              item={item}
              collapsed={collapsed}
              pathname={location.pathname}
              flyoutOpen={openFlyout === item.label}
              onToggleFlyout={() =>
                setOpenFlyout((current) => (current === item.label ? null : item.label))
              }
              onCloseFlyout={() => setOpenFlyout(null)}
            />
          ))}
        </nav>
        <footer className={`sidebar-footer ${collapsed ? 'sidebar-footer--collapsed' : ''}`}>
          {!collapsed ? <span className="sidebar-footer-label">Desenvolvido por</span> : null}
          <img
            src="/marca/logo_prottus.png"
            alt="Prottus"
            className="sidebar-footer-logo"
          />
        </footer>
      </aside>

      {openFlyout ? (
        <button
          type="button"
          className="nav-flyout-backdrop"
          aria-label="Fechar menu"
          onClick={() => setOpenFlyout(null)}
        />
      ) : null}

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-menu-btn"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-pressed={collapsed}
            >
              <Icon name="menu" size={22} />
            </button>
            <div className="topbar-breadcrumb">
              <span className="topbar-breadcrumb-root">Portal de Cadastro & Solicitação</span>
              {breadcrumb.page ? (
                <>
                  <span className="topbar-breadcrumb-sep">›</span>
                  {breadcrumb.module ? (
                    <>
                      <span className="topbar-breadcrumb-module">{breadcrumb.module}</span>
                      <span className="topbar-breadcrumb-sep">›</span>
                    </>
                  ) : null}
                  <span className="topbar-breadcrumb-page">{breadcrumb.page}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="topbar-user">
            <NavLink to="/notificacoes" className="topbar-notifications" title="Notificações">
              <Icon name="bell" size={20} />
            </NavLink>
            <span className="topbar-user-name">{user?.name}</span>
            <button type="button" className="btn-ghost topbar-logout" onClick={() => logout()}>
              <Icon name="logout" size={18} />
              Sair
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
