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
| `RequestTypeInput` | `src/lib/resources.ts` | Tipos aceitos ao criar/editar solicitação |
| `isBlockRequestType` | `src/lib/requestLabels.ts` | Bloqueio (unificado + históricos parcial/total) |
| `isExistingProductRequestType` | `src/lib/requestLabels.ts` | Pedido sobre produto já cadastrado |
| `blockScopeLabel` | `src/lib/requestLabels.ts` | Rótulo do escopo: requisição, compras ou total |
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
| `DataTable` | `src/components/DataTable.tsx` | Tabela de listagens (cabeçalho ordenável opcional) |
| `PaginationBar` | `src/components/PaginationBar.tsx` | Paginação padrão |
| `Icon` | `src/components/Icon.tsx` | Ícone SVG outline |
| `ProductStatusDot` | `src/components/ProductStatusDot.tsx` | Bolinha de status do produto em listas (verde/vermelha) |
| `SimilarProductsPanel` | `src/components/SimilarProductsPanel.tsx` | Lista da base por descrição ou código, com status e seleção |
| `RequestItemCompareTable` | `src/components/requests/RequestItemCompareTable.tsx` | Comparativo base × solicitação; escopo no bloqueio |
