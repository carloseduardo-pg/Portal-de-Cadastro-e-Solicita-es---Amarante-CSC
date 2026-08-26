# Índice de exports — frontend Portal Amarante CSC

Camada compartilhada (`lib/`, `auth/`, `components/`). Pages não entram neste índice.

## lib

| Export | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `AuthUser` | `src/lib/api.ts` | Tipo do perfil autenticado |
| `apiFetch` | `src/lib/api.ts` | HTTP com cookies; refresh automático em 401 |
| `loginRequest` | `src/lib/api.ts` | POST /auth/login |
| `logoutRequest` | `src/lib/api.ts` | POST /auth/logout |
| `meRequest` | `src/lib/api.ts` | GET /auth/me |
| `dashboardApi` | `src/lib/resources.ts` | Resumo produtos |
| `productsApi` | `src/lib/resources.ts` | Busca, base, inativos |
| `requestsApi` | `src/lib/resources.ts` | Kanban, fila, detalhe |
| `catalogApi` | `src/lib/resources.ts` | Hotéis, famílias, PDM |
| `suppliersApi` | `src/lib/resources.ts` | Fornecedores |
| `notificationsApi` | `src/lib/resources.ts` | Notificações |
| Tipos domínio | `src/lib/types.ts` | DTOs alinhados à API EN |

## auth

| Export | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `AuthProvider` | `src/auth/AuthContext.tsx` | Sessão React sem JWT no localStorage |
| `useAuth` | `src/auth/AuthContext.tsx` | Hook de sessão |
| `ProtectedRoute` | `src/auth/ProtectedRoute.tsx` | Gate de rotas autenticadas |

## components

| Export | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `AppShell` | `src/components/AppShell.tsx` | Layout sidebar colapsável + topbar |
| `BrandLogo` | `src/components/BrandLogo.tsx` | Logos vazados Amarante |
| `Modal` | `src/components/Modal.tsx` | Dialog modal |
| `FilterBar` | `src/components/FilterBar.tsx` | Toolbar Filtrar / Limpar / Novo |
| `DataTable` | `src/components/DataTable.tsx` | Tabela de listagens |
| `PaginationBar` | `src/components/PaginationBar.tsx` | Paginação padrão |
| `Icon` | `src/components/Icon.tsx` | Ícone SVG outline |
