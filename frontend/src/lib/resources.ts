import { apiFetch } from './api';
import type {
  CatalogGroup,
  CatalogSubgroup,
  CostCenter,
  DashboardProductsSummary,
  Family,
  Hotel,
  MeasureUnit,
  Notification,
  PageResult,
  ProductAttribute,
  ProductBase,
  ProductBaseResult,
  ProductSearchResult,
  QueueResult,
  Request,
  InboxBoardResult,
  Supplier,
  SupplierRequest,
} from './types';

function qs(params: Record<string, string | number | undefined | boolean | string[]>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === '') return;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(','));
      return;
    }
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const dashboardApi = {
  products: () => apiFetch<DashboardProductsSummary>('/dashboard/products'),
};

export const productsApi = {
  search: (opts: { q: string; hotelId?: string; page?: number; pageSize?: number }) =>
    apiFetch<PageResult<ProductSearchResult>>(
      `/products/search${qs({ q: opts.q, hotel_id: opts.hotelId, page: opts.page ?? 1, pageSize: opts.pageSize ?? 20 })}`,
    ),
  base: (opts?: {
    search?: string;
    hotel?: string;
    active?: string;
    familyId?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiFetch<ProductBaseResult>(
      `/products/base${qs({
        search: opts?.search,
        hotel: opts?.hotel,
        active: opts?.active,
        family_id: opts?.familyId,
        page: opts?.page ?? 1,
        pageSize: opts?.pageSize ?? 20,
      })}`,
    ),
  inactive: (opts?: { search?: string; page?: number; pageSize?: number }) =>
    apiFetch<PageResult<ProductBase>>(
      `/products/inactive${qs({ search: opts?.search, page: opts?.page ?? 1, pageSize: opts?.pageSize ?? 20 })}`,
    ),
  get: (id: string) => apiFetch<ProductBase>(`/products/${id}`),
};

export const requestsApi = {
  summary: () => apiFetch<Record<string, number>>('/requests/summary'),
  queue: (opts?: {
    search?: string;
    type?: string;
    itemsMode?: 'single' | 'multi';
    stage?: string;
    familyIds?: string[];
    hotelIds?: string[];
    requesterIds?: string[];
    operatorIds?: string[];
    operatorStage?: string;
    sla?: 'late' | 'on_time';
    submittedFrom?: string;
    submittedTo?: string;
    closedFrom?: string;
    closedTo?: string;
    mine?: boolean;
    bucket?: 'solicitante' | 'aprovador' | 'compliance' | 'encerrado';
    page?: number;
    pageSize?: number;
  }) =>
    apiFetch<QueueResult>(
      `/requests/queue${qs({
        search: opts?.search,
        type: opts?.type,
        items: opts?.itemsMode,
        stage: opts?.stage,
        family_ids: opts?.familyIds,
        hotel_ids: opts?.hotelIds,
        requester_ids: opts?.requesterIds,
        operator_ids: opts?.operatorIds,
        operator_stage: opts?.operatorStage,
        sla: opts?.sla,
        submitted_from: opts?.submittedFrom,
        submitted_to: opts?.submittedTo,
        closed_from: opts?.closedFrom,
        closed_to: opts?.closedTo,
        mine: opts?.mine ? 'true' : undefined,
        bucket: opts?.bucket,
        page: opts?.page ?? 1,
        pageSize: opts?.pageSize ?? 20,
      })}`,
    ),
  /** Caixa de entrada — cards por etapa (sem encerradas). */
  inbox: (opts?: {
    search?: string;
    type?: string;
    familyIds?: string[];
    hotelIds?: string[];
    requesterIds?: string[];
  }) =>
    apiFetch<InboxBoardResult>(
      `/requests/inbox${qs({
        search: opts?.search,
        type: opts?.type,
        family_ids: opts?.familyIds,
        hotel_ids: opts?.hotelIds,
        requester_ids: opts?.requesterIds,
      })}`,
    ),
  kanban: (opts?: {
    search?: string;
    mine?: boolean;
    type?: string;
    familyIds?: string[];
    hotelIds?: string[];
    requesterIds?: string[];
  }) =>
    apiFetch<{ data: Request[]; total: number }>(
      `/requests/kanban${qs({
        search: opts?.search,
        mine: opts?.mine ? 'true' : undefined,
        type: opts?.type,
        family_ids: opts?.familyIds,
        hotel_ids: opts?.hotelIds,
        requester_ids: opts?.requesterIds,
      })}`,
    ),
  list: (opts?: { state?: string; mine?: boolean; search?: string; page?: number; pageSize?: number }) =>
    apiFetch<PageResult<Request>>(
      `/requests${qs({
        state: opts?.state,
        mine: opts?.mine ? 'true' : undefined,
        search: opts?.search,
        page: opts?.page ?? 1,
        pageSize: opts?.pageSize ?? 20,
      })}`,
    ),
  get: (id: string) => apiFetch<Request>(`/requests/${id}`),
  create: (body: {
    hotelIds: string[];
    familyId: string;
    type?: 'INCLUSAO' | 'ALTERACAO';
    items: {
      productId?: string;
      descriptionShort: string;
      descriptionLong?: string;
      measureUnitId?: string;
      costCenterId?: string;
      source?: 'NATIONAL' | 'FOREIGN';
      itemValue?: number;
      purchaseQtyTotal?: number;
      unifiedCode?: string;
      legacyCode?: string;
      law116?: string;
      productLink?: string;
      itemObservation?: string;
      sortOrder?: number;
    }[];
    submit?: boolean;
    targetStage?: 'SOLICITANTE' | 'APROVADOR';
    observation?: string;
    requestDescription?: string;
  }) =>
    apiFetch<Request>('/requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: {
      hotelIds?: string[];
      familyId?: string;
      type?: 'INCLUSAO' | 'ALTERACAO';
      items?: {
        productId?: string;
        descriptionShort: string;
        descriptionLong?: string;
        measureUnitId?: string;
        costCenterId?: string;
        source?: 'NATIONAL' | 'FOREIGN';
        itemValue?: number;
        purchaseQtyTotal?: number;
        unifiedCode?: string;
        legacyCode?: string;
        law116?: string;
        productLink?: string;
        itemObservation?: string;
        sortOrder?: number;
      }[];
      submit?: boolean;
      targetStage?: 'SOLICITANTE' | 'APROVADOR';
      observation?: string;
      requestDescription?: string;
    },
  ) =>
    apiFetch<Request>(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  submit: (id: string) =>
    apiFetch<Request>(`/requests/${id}/submit`, {
      method: 'POST',
    }),
  sendToApprover: (id: string, message: string) =>
    apiFetch<Request>(`/requests/${id}/send-to-approver`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  approve: (id: string, items: { itemId: string; ncm: string }[], message: string) =>
    apiFetch<Request>(`/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ items, message }),
    }),
  confirmNcm: (itemId: string, ncm: string) =>
    apiFetch<unknown>(`/requests/items/${itemId}/ncm`, {
      method: 'PATCH',
      body: JSON.stringify({ ncm }),
    }),
};

export const catalogApi = {
  hotels: () => apiFetch<Hotel[]>('/catalog/hotels'),
  families: (opts?: { search?: string; subgroupId?: string; page?: number; pageSize?: number }) =>
    apiFetch<PageResult<Family>>(
      `/catalog/families${qs({
        search: opts?.search,
        subgroup_id: opts?.subgroupId,
        page: opts?.page ?? 1,
        pageSize: opts?.pageSize ?? 50,
      })}`,
    ),
  familyAttributes: (familyId: string) =>
    apiFetch<ProductAttribute[]>(`/catalog/families/${familyId}/attributes`),
  groups: (page = 1, pageSize = 200) =>
    apiFetch<PageResult<CatalogGroup>>(`/catalog/groups${qs({ page, pageSize })}`),
  subgroups: (opts?: { groupId?: string; page?: number; pageSize?: number }) =>
    apiFetch<PageResult<CatalogSubgroup>>(
      `/catalog/subgroups${qs({
        group_id: opts?.groupId,
        page: opts?.page ?? 1,
        pageSize: opts?.pageSize ?? 200,
      })}`,
    ),
  measureUnits: (page = 1) =>
    apiFetch<PageResult<MeasureUnit>>(`/catalog/measure-units${qs({ page })}`),
  costCenters: (hotelIds?: string[]) =>
    apiFetch<CostCenter[]>(
      `/catalog/cost-centers${qs({
        hotel_ids: hotelIds?.length ? hotelIds : undefined,
        hotel_id: hotelIds?.length === 1 ? hotelIds[0] : undefined,
      })}`,
    ),
  warehouses: (page = 1) =>
    apiFetch<PageResult<{ id: string; code: string; name: string; hotel?: Hotel }>>(`/catalog/warehouses${qs({ page })}`),
};

export const suppliersApi = {
  summary: () => apiFetch<Record<string, number>>('/suppliers/summary'),
  base: (opts?: { search?: string; page?: number; pageSize?: number }) =>
    apiFetch<PageResult<Supplier>>(
      `/suppliers/base${qs({ search: opts?.search, page: opts?.page ?? 1, pageSize: opts?.pageSize ?? 20 })}`,
    ),
  inactive: (page = 1) =>
    apiFetch<PageResult<Supplier>>(`/suppliers/inactive${qs({ page })}`),
  requests: (opts?: { mine?: boolean; page?: number; pageSize?: number }) =>
    apiFetch<PageResult<SupplierRequest>>(
      `/suppliers/requests${qs({ mine: opts?.mine ? 'true' : undefined, page: opts?.page ?? 1, pageSize: opts?.pageSize ?? 20 })}`,
    ),
  get: (id: string) => apiFetch<Supplier>(`/suppliers/${id}`),
};

export const notificationsApi = {
  list: () => apiFetch<Notification[]>('/notifications'),
  count: () => apiFetch<number>('/notifications/count'),
  markAllRead: () => apiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'PATCH' }),
  markRead: (id: string) => apiFetch<unknown>(`/notifications/${id}/read`, { method: 'PATCH' }),
};

export { usersApi } from './resources-users';
