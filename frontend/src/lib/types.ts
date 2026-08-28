export type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};

export type Hotel = { id: string; code: string; name: string };

export type CostCenter = {
  id: string;
  code: string;
  name: string;
  hotel?: Hotel;
};

export type MeasureUnit = {
  id: string;
  code: string;
  name: string;
};

export type ProductSearchResult = {
  id: string;
  unifiedCode: string | null;
  descriptionShort: string;
  familyName: string;
  familyCode: string;
  similarity: number;
  hotelCodes: string[];
  similarTo: (string | null)[];
};

export type ProductBase = {
  id: string;
  unifiedCode: string | null;
  sapCode?: string | null;
  descriptionShort: string;
  descriptionLong: string | null;
  ncmCode: string | null;
  active: boolean;
  hotelCodes?: string[];
  possibleDuplicate?: boolean;
  similarTo?: string | null;
  family?: { code: string; name: string; subgroup?: { code: string; name: string; group?: { code: string; name: string } } };
  measureUnit?: { code: string; name: string };
  hotels?: { hotel: Hotel }[];
};

export type ProductBaseResult = PageResult<ProductBase> & {
  duplicateSummary?: { pairCount: number };
};

export type Family = {
  id: string;
  code: string;
  name: string;
  attributesCount?: number;
  subgroupsCount?: number;
};

export type CatalogGroup = {
  id: string;
  code: string;
  name: string;
  subgroupId?: string;
  familyId?: string;
};

export type CatalogSubgroup = {
  id: string;
  code: string;
  name: string;
  familyId?: string;
  family?: { id: string; code: string; name: string };
};

export type ProductAttribute = {
  id: string;
  name: string;
  required: boolean;
  examples: string[];
};

export type RequestItem = {
  id: string;
  descriptionShort: string;
  descriptionLong: string | null;
  ncmCode: string | null;
  ncmConfirmed: boolean;
  sortOrder: number;
  productId?: string | null;
  groupId?: string | null;
  group?: {
    id: string;
    code: string;
    name: string;
    subgroupId?: string;
    subgroup?: { id: string; code: string; name: string; familyId?: string };
  } | null;
  source?: string;
  itemValue?: number | string | null;
  purchaseQtyTotal?: number | string | null;
  unifiedCode?: string | null;
  legacyCode?: string | null;
  law116?: string | null;
  productLink?: string | null;
  links?: { id: string; url: string; sortOrder: number }[];
  itemObservation?: string | null;
  measureUnit?: { id: string; code: string; name: string };
  costCenter?: { id: string; code: string; name: string };
  ncmSuggestions?: NcmSuggestion[];
};

export type NcmSuggestion = {
  id: string;
  ncm: string;
  score: number | string;
  usageCount: number;
  rank: number;
};

export type Request = {
  id: string;
  state: string;
  type: string;
  fixedAsset?: boolean;
  observation?: string | null;
  requestDescription?: string | null;
  createdAt: string;
  submittedAt: string | null;
  expiresAt: string | null;
  closedAt?: string | null;
  requester?: { id: string; name: string; email?: string };
  /** Preenchido quando a solicitação é aprovada/finalizada. */
  approvedBy?: { id: string; name: string } | null;
  hotel?: { id: string; code: string; name: string };
  hotels?: { hotel: Hotel }[];
  family?: { id: string; code: string; name: string; subgroup?: { group?: { code: string; name: string } } };
  items: RequestItem[];
  stages?: RequestStage[];
};

export type RequestStage = {
  id: string;
  stage: string;
  startedAt: string;
  finishedAt: string | null;
  isLate: boolean;
  message: string | null;
  user?: { name: string };
};

export type Supplier = {
  id: string;
  document: string;
  corporateName: string;
  tradeName: string | null;
  originBase: string;
  active: boolean;
};

export type SupplierRequest = {
  id: string;
  document: string;
  state: string;
  createdAt: string;
  requester?: { name: string };
  supplier?: { corporateName: string; document: string };
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type DashboardProductsSummary = {
  inbox: number;
  slaOverdue: number;
  products: number;
  families: number;
  slaOverdueRatio: number;
  recent: Request[];
};

export type RegistryStageSummary = {
  solicitante: number;
  imobilizado: number;
  aprovador: number;
  encerrado: number;
};

export type QueueResult = PageResult<Request> & {
  summary?: RegistryStageSummary;
};

export type RequestTimeSummary = {
  all: number;
  novas: number;
  doDia: number;
  atrasadas: number;
  finalizadas: number;
};

export type InboxBoardResult = {
  data: Request[];
  total: number;
  role?: string;
  inboxStages?: string[];
};

export function slaBadge(isLate: boolean, days?: number) {
  if (isLate) return { className: 'badge badge--danger', label: days ? `Atrasada há ${days}d` : 'ATRASADA' };
  if (days === 0) return { className: 'badge badge--warning', label: 'Vence hoje' };
  return { className: 'badge badge--success', label: days !== undefined ? `${days}d úteis` : 'NO PRAZO' };
}
