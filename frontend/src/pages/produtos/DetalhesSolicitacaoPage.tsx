import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { hasCap } from '../../lib/capabilities';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ItemClassificationFields } from '../../components/ItemClassificationFields';
import { ItemPrimaryFields } from '../../components/ItemPrimaryFields';
import { ItemCompletionSection } from '../../components/ItemCompletionSection';
import { ItemFolderStrip } from '../../components/ItemFolderStrip';
import { PageStageHeader } from '../../components/PageStageHeader';
import { ReclassifyRequestDialog } from '../../components/ReclassifyRequestDialog';
import type { ReclassifyDirection } from '../../components/ReclassifyRequestDialog';
import {
  CloseRequestDialog,
  type CloseRequestActor,
} from '../../components/CloseRequestDialog';
import { ApproveItemsDialog } from '../../components/ApproveItemsDialog';
import { RequestDescriptionBlock } from '../../components/RequestDescriptionBlock';
import { RequestItemCompareTable } from '../../components/requests/RequestItemCompareTable';
import { RequestTimeline } from '../../components/RequestTimeline';
import { SolicitacaoPreForm } from '../../components/SolicitacaoPreForm';
import {
  classificationFromSubgroup,
  filterGroupsForSubgroup,
  findSubgroupById,
} from '../../lib/pdmCascade';
import {
  blockScopeLabel,
  isBlockRequestType,
  isExistingProductRequestType,
  requestDestinationLabel,
  requestStateLabel,
  requestTypeLabel,
} from '../../lib/requestLabels';
import { toFormUppercase } from '../../lib/formText';
import { formatNcmDisplay } from '../../lib/ncm';
import { isNcmNotFoundError, type NcmNotFoundItem } from '../../lib/api';
import { catalogApi, notificationsApi, productsApi, requestsApi } from '../../lib/resources';
import { useRequestPresence } from '../../hooks/useRequestPresence';
import { RequestViewersFlag } from '../../components/requests/RequestViewersFlag';
import type {
  CatalogGroup,
  CatalogSubgroup,
  CostCenter,
  Hotel,
  MeasureUnit,
  ProductBase,
  Request,
  RequestItem,
} from '../../lib/types';
import './produtos.css';
import '../../components/ItemFolderStrip.css';
import '../../components/FormField.css';
import '../../components/PdmClassificationFields.css';
import '../../components/SolicitacaoPreForm.css';
import '../../components/RequestDescriptionBlock.css';
import '../../components/ItemCompletionSection.css';
import '../../components/RequestTimeline.css';
import '../../components/requests/RequestItemCompareTable.css';
import '../../components/ConfirmDialog.css';
import '../../components/ReclassifyRequestDialog.css';
import '../../components/Modal.css';

type ViewItem = {
  id: string;
  productId?: string | null;
  groupId: string;
  subgroupId: string;
  descriptionShort: string;
  descriptionLong: string;
  measureUnitId: string;
  costCenterId: string;
  source: 'NATIONAL' | 'FOREIGN';
  itemValue: string;
  purchaseQtyTotal: string;
  unitQuantity: string;
  physicalLocation: string;
  assetTag: string;
  acquisitionValue: string;
  acquisitionDate: string;
  usefulLifeMonths: string;
  depreciationRate: string;
  supplierDocument: string;
  invoiceNumber: string;
  unifiedCode: string;
  legacyCode: string;
  law116: string;
  productLink: string;
  productLinks: string[];
  itemObservation: string;
  ncmSuggestions: RequestItem['ncmSuggestions'];
  ncmCode: string | null;
  ncmConfirmed: boolean;
};

/** Rótulo do cabeçalho — finalizadas como Aprovado/Reprovado. */
function stageLabel(request: Request) {
  return requestDestinationLabel(request);
}

/**
 * Detalhe da solicitação — formulário + ações por etapa + timeline.
 */
export function DetalhesSolicitacaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canActSolicitante = hasCap(user, 'products.request.create');
  const canApproveAdmin = hasCap(user, 'products.request.approve.admin');
  const canApproveImob = hasCap(user, 'products.request.approve.imobilizado');
  const [request, setRequest] = useState<Request | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { viewers: liveViewers, editor: liveEditor } = useRequestPresence(id);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [subgroups, setSubgroups] = useState<CatalogSubgroup[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [measureUnits, setMeasureUnits] = useState<MeasureUnit[]>([]);

  const [items, setItems] = useState<ViewItem[]>([]);
  const [currentItem, setCurrentItem] = useState(0);
  const [selectedNcm, setSelectedNcm] = useState<Record<string, string>>({});
  const [customNcm, setCustomNcm] = useState<Record<string, string>>({});
  const [stageComment, setStageComment] = useState('');
  /** Subgrupos para transferência entre aprovadores (exige subgrupo do destino). */
  const [afSubgroups, setAfSubgroups] = useState<CatalogSubgroup[]>([]);
  const [ucSubgroups, setUcSubgroups] = useState<CatalogSubgroup[]>([]);
  const [editNote, setEditNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [baseProduct, setBaseProduct] = useState<ProductBase | null>(null);
  const [baseLoading, setBaseLoading] = useState(false);
  const [editHotelIds, setEditHotelIds] = useState<string[]>([]);
  const [editSubgroupId, setEditSubgroupId] = useState('');
  const [editFixedAsset, setEditFixedAsset] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmSendDirty, setConfirmSendDirty] = useState(false);
  const [reclassifyOpen, setReclassifyOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  /** Itens cujo NCM não existe em `ncm_codes` (erro `NCM_NOT_FOUND` na aprovação). */
  const [ncmNotFoundItems, setNcmNotFoundItems] = useState<NcmNotFoundItem[]>([]);
  const [reclassifyDirection, setReclassifyDirection] =
    useState<ReclassifyDirection>('fixed-asset');

  useEffect(() => {
    void Promise.all([
      catalogApi.hotels().then(setHotels),
      catalogApi.groups({ pageSize: 500 }).then((r) => setGroups(r.data)),
      catalogApi.subgroups({ pageSize: 500 }).then((r) => setSubgroups(r.data)),
      catalogApi.measureUnits().then((r) => setMeasureUnits(r.data)),
    ]).catch(console.error);
  }, []);

  useEffect(() => {
    if (!id) return;
    void requestsApi
      .get(id)
      .then((r) => {
        setRequest(r);
        setLoadError(null);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : 'Falha ao carregar solicitação.');
      });
    void notificationsApi.markRequestRead(id).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (!request) return;

    setItems(
      request.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        groupId: it.groupId ?? it.group?.id ?? '',
        subgroupId: it.group?.subgroupId ?? it.group?.subgroup?.id ?? '',
        descriptionShort: it.descriptionShort,
        descriptionLong: it.descriptionLong ?? '',
        measureUnitId: it.measureUnit?.id ?? '',
        costCenterId: it.costCenter?.id ?? '',
        source: (it.source === 'FOREIGN' ? 'FOREIGN' : 'NATIONAL') as ViewItem['source'],
        itemValue: it.itemValue != null ? String(it.itemValue) : '',
        purchaseQtyTotal: it.purchaseQtyTotal != null ? String(it.purchaseQtyTotal) : '',
        unitQuantity: it.unitQuantity != null ? String(it.unitQuantity) : '1',
        physicalLocation: it.physicalLocation ?? '',
        assetTag: it.assetTag ?? '',
        acquisitionValue: it.acquisitionValue != null ? String(it.acquisitionValue) : '',
        acquisitionDate: it.acquisitionDate ? String(it.acquisitionDate).slice(0, 10) : '',
        usefulLifeMonths: it.usefulLifeMonths != null ? String(it.usefulLifeMonths) : '',
        depreciationRate: it.depreciationRate != null ? String(it.depreciationRate) : '',
        supplierDocument: it.supplierDocument ?? '',
        invoiceNumber: it.invoiceNumber ?? '',
        unifiedCode: it.unifiedCode ?? '',
        legacyCode: it.legacyCode ?? '',
        law116: it.law116 ?? '',
        productLink: it.productLink ?? it.links?.[0]?.url ?? '',
        productLinks: it.links?.map((l) => l.url) ?? (it.productLink ? [it.productLink] : []),
        itemObservation: it.itemObservation ?? '',
        ncmSuggestions: it.ncmSuggestions,
        ncmCode: it.ncmCode,
        ncmConfirmed: it.ncmConfirmed,
      })),
    );
    const ids =
      request.hotels?.map((rh) => rh.hotel.id) ??
      (request.hotel?.id ? [request.hotel.id] : []);
    setEditHotelIds(ids);
    setEditSubgroupId(
      request.subgroupId ??
        request.subgroup?.id ??
        request.items[0]?.group?.subgroupId ??
        request.items[0]?.group?.subgroup?.id ??
        '',
    );
    setEditFixedAsset(Boolean(request.fixedAsset));
    setDirty(false);
    setCurrentItem(0);
  }, [request]);

  useEffect(() => {
    if (request?.state !== 'IMOBILIZADO' && request?.state !== 'APROVADOR') return;
    void Promise.all([
      catalogApi.subgroups({ pageSize: 500, itemKind: 'FIXED_ASSET' }).then((r) => setAfSubgroups(r.data)),
      catalogApi.subgroups({ pageSize: 500, itemKind: 'CONSUMPTION' }).then((r) => setUcSubgroups(r.data)),
    ]).catch(console.error);
  }, [request?.state]);

  const hotelIds = editHotelIds;

  useEffect(() => {
    if (!hotelIds.length) {
      setCostCenters([]);
      return;
    }
    void catalogApi.costCenters(hotelIds).then(setCostCenters).catch(console.error);
  }, [hotelIds]);

  const item = items[currentItem] ?? items[0];
  const requestItem = request?.items[currentItem] ?? request?.items[0];
  const selectedSubgroup = findSubgroupById(subgroups, editSubgroupId);
  const familyId =
    selectedSubgroup?.familyId ??
    selectedSubgroup?.family?.id ??
    request?.family?.id ??
    '';
  const lotSubgroupId = editSubgroupId;

  const folderItems = useMemo(
    () =>
      items.map((it) => ({
        descriptionShort: it.descriptionShort,
        groupId: it.groupId,
        subgroupId: it.subgroupId,
        familyId,
      })),
    [items, familyId],
  );

  const approveDialogItems = useMemo(() => {
    if (!request?.items) return [];
    return request.items.map((it) => ({
      id: it.id,
      descriptionShort: it.descriptionShort,
      ncmCode: it.ncmCode,
      resolvedNcm: selectedNcm[it.id] || customNcm[it.id] || it.ncmCode,
    }));
  }, [request?.items, selectedNcm, customNcm]);

  const ncmErrorIndexes = useMemo(() => {
    if (!ncmNotFoundItems.length) return [];
    const failed = new Set(ncmNotFoundItems.map((x) => x.id));
    return items
      .map((it, idx) => (failed.has(it.id) ? idx : -1))
      .filter((idx) => idx >= 0);
  }, [items, ncmNotFoundItems]);

  const ncmErrorIdSet = useMemo(
    () => new Set(ncmNotFoundItems.map((x) => x.id)),
    [ncmNotFoundItems],
  );

  const currentItemNcmError = item ? ncmErrorIdSet.has(item.id) : false;

  const isDraft =
    canActSolicitante &&
    (request?.state === 'RASCUNHO' ||
      request?.state === 'SOLICITANTE' ||
      request?.state === 'RETORNO_SOLICITANTE');
  const isSolicitante = canActSolicitante && request?.state === 'SOLICITANTE';
  const isReturnToRequester =
    canActSolicitante && request?.state === 'RETORNO_SOLICITANTE';
  const isApprover = canApproveAdmin && request?.state === 'APROVADOR';
  const isImobilizado = canApproveImob && request?.state === 'IMOBILIZADO';
  const presenceEditor = liveEditor ?? request?.editor ?? null;
  const presenceViewers = liveViewers.length
    ? liveViewers
    : (request?.viewers ?? []);
  /** Outro usuário chegou antes e ainda analisa — formulário somente leitura. */
  const presenceLocked = Boolean(
    presenceEditor && user?.id && presenceEditor.id !== user.id,
  );
  const canSendToApprover = !presenceLocked && (isSolicitante || isReturnToRequester);
  const canConcludeStage =
    !presenceLocked && (canSendToApprover || isApprover || isImobilizado);
  /** Rascunho direto, solicitante ou retorno — pode encerrar. */
  const canCloseAsSolicitante = !presenceLocked && Boolean(isDraft);
  const canCloseAsAprovador = !presenceLocked && (isApprover || isImobilizado);
  const closeActor: CloseRequestActor = canCloseAsAprovador ? 'aprovador' : 'solicitante';
  const draftEditable = !presenceLocked && Boolean(isDraft);
  const fieldsEditable =
    !presenceLocked && (draftEditable || isApprover || isImobilizado);
  const approverEditable = !presenceLocked && isApprover;
  const imobilizadoEditable = !presenceLocked && isImobilizado;
  const classificationEditable =
    imobilizadoEditable ||
    (!presenceLocked && isApprover && Boolean(request?.classificationInvalidated));

  useEffect(() => {
    // Em edição (rascunho/retorno ou reclassificação), lista todos os subgrupos.
    // Em só leitura, filtra pelo kind atual.
    if (isDraft || classificationEditable) {
      void catalogApi
        .subgroups({ pageSize: 500 })
        .then((r) => setSubgroups(r.data))
        .catch(console.error);
      return;
    }
    const kind = editFixedAsset ? 'FIXED_ASSET' : 'CONSUMPTION';
    void catalogApi
      .subgroups({ pageSize: 500, itemKind: kind })
      .then((r) => {
        setSubgroups(r.data);
        setEditSubgroupId((prev) =>
          prev && r.data.some((sg) => sg.id === prev) ? prev : '',
        );
      })
      .catch(console.error);
  }, [editFixedAsset, isDraft, classificationEditable]);

  /**
   * Troca de subgrupo atualiza o modo UC/AF do formulário (campos UM × patrimoniais).
   */
  useEffect(() => {
    if (!editSubgroupId || subgroups.length === 0) return;
    if (!isDraft && !classificationEditable && !fieldsEditable) return;
    const selected = findSubgroupById(subgroups, editSubgroupId);
    const kind = selected?.itemKind ?? selected?.family?.itemKind;
    if (!kind) return;
    const nextAf = kind === 'FIXED_ASSET';
    setEditFixedAsset((prev) => {
      if (prev === nextAf) return prev;
      setItems((itemsPrev) =>
        itemsPrev.map((it) =>
          nextAf
            ? {
                ...it,
                measureUnitId: '',
                purchaseQtyTotal: '',
                law116: '',
                unitQuantity: it.unitQuantity?.trim() ? it.unitQuantity : '1',
              }
            : {
                ...it,
                physicalLocation: '',
                assetTag: '',
                acquisitionValue: '',
                acquisitionDate: '',
                usefulLifeMonths: '',
                depreciationRate: '',
                supplierDocument: '',
                invoiceNumber: '',
                unitQuantity: '1',
              },
        ),
      );
      return nextAf;
    });
  }, [editSubgroupId, subgroups, isDraft, classificationEditable, fieldsEditable]);

  useEffect(() => {
    const productId = requestItem?.productId;
    if (!productId || !isApprover) {
      setBaseProduct(null);
      return;
    }
    setBaseLoading(true);
    void productsApi
      .get(productId)
      .then(setBaseProduct)
      .catch(() => setBaseProduct(null))
      .finally(() => setBaseLoading(false));
  }, [requestItem?.productId, isApprover]);

  function markDirty() {
    if (draftEditable || isApprover || isImobilizado) setDirty(true);
  }

  /** Remove destaque de erro NCM quando o usuário altera o código daquele item. */
  function clearNcmErrorForItem(itemId: string) {
    setNcmNotFoundItems((prev) => prev.filter((x) => x.id !== itemId));
  }

  function selectItemNcm(itemId: string, ncm: string) {
    clearNcmErrorForItem(itemId);
    setSelectedNcm((prev) => ({ ...prev, [itemId]: ncm }));
  }

  function patchCurrentItem(patch: Partial<ViewItem>) {
    markDirty();
    setItems((prev) =>
      prev.map((it, idx) => (idx === currentItem ? { ...it, ...patch } : it)),
    );
  }

  function buildItemsPayload() {
    return items.map((it, idx) => ({
      productId: it.productId ?? undefined,
      groupId: it.groupId || undefined,
      descriptionShort: it.descriptionShort,
      descriptionLong: it.descriptionLong || undefined,
      measureUnitId: editFixedAsset ? undefined : it.measureUnitId || undefined,
      costCenterId: it.costCenterId || undefined,
      source: it.source,
      itemValue: it.itemValue ? Number(it.itemValue) : undefined,
      purchaseQtyTotal: editFixedAsset
        ? undefined
        : it.purchaseQtyTotal
          ? Number(it.purchaseQtyTotal)
          : undefined,
      unitQuantity: editFixedAsset
        ? Math.max(1, Math.floor(Number(it.unitQuantity) || 1))
        : undefined,
      physicalLocation: editFixedAsset ? it.physicalLocation.trim() || undefined : undefined,
      assetTag: editFixedAsset ? it.assetTag.trim() || undefined : undefined,
      acquisitionValue:
        editFixedAsset && it.acquisitionValue ? Number(it.acquisitionValue) : undefined,
      acquisitionDate: editFixedAsset ? it.acquisitionDate || undefined : undefined,
      usefulLifeMonths:
        editFixedAsset && it.usefulLifeMonths
          ? Math.floor(Number(it.usefulLifeMonths))
          : undefined,
      depreciationRate:
        editFixedAsset && it.depreciationRate ? Number(it.depreciationRate) : undefined,
      supplierDocument: editFixedAsset ? it.supplierDocument.trim() || undefined : undefined,
      invoiceNumber: editFixedAsset ? it.invoiceNumber.trim() || undefined : undefined,
      unifiedCode: it.unifiedCode.trim() || undefined,
      legacyCode: it.legacyCode.trim() || undefined,
      law116: editFixedAsset ? undefined : it.law116.trim() || undefined,
      productLink: it.productLink.trim() || it.productLinks[0]?.trim() || undefined,
      productLinks: it.productLinks.map((l) => l.trim()).filter(Boolean),
      itemObservation: it.itemObservation.trim() || undefined,
      sortOrder: idx,
    }));
  }

  async function reloadRequest() {
    if (!id) return;
    const r = await requestsApi.get(id);
    setRequest(r);
  }

  /** Persiste descrição/observação do rascunho e registra na timeline. */
  async function persistHeaderField(
    field: 'requestDescription' | 'observation',
    nextValue: string,
  ) {
    if (!request) return;
    const trimmed = nextValue.trim();
    if (!trimmed) {
      throw new Error(
        field === 'requestDescription'
          ? 'A descrição da solicitação não pode ficar vazia.'
          : isBlockRequestType(request.type)
            ? 'Informe o motivo do bloqueio.'
            : 'A observação da solicitação não pode ficar vazia.',
      );
    }

    const prev =
      field === 'requestDescription'
        ? (request.requestDescription ?? '').trim()
        : (request.observation ?? '').trim();

    const editNote =
      field === 'requestDescription'
        ? prev
          ? `Descrição da solicitação alterada de "${prev}" para "${trimmed}".`
          : `Descrição da solicitação definida: "${trimmed}".`
        : prev
          ? `Observação da solicitação alterada.`
          : `Observação da solicitação definida.`;

    try {
      await requestsApi.update(request.id, {
        [field]: trimmed,
        editNote,
        targetStage: 'SOLICITANTE',
      });
      await reloadRequest();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao salvar alteração.');
      throw e;
    }
  }

  async function saveApproverChanges() {
    if (!request) return;
    for (const it of items) {
      if ((!editFixedAsset && !it.measureUnitId) || !it.costCenterId) {
        alert(
          editFixedAsset
            ? 'Informe o centro de custo de todos os itens.'
            : 'Informe unidade de medida e centro de custo de todos os itens.',
        );
        return;
      }
    }
    setBusy(true);
    try {
      await requestsApi.update(request.id, {
        ...(request.classificationInvalidated && editSubgroupId
          ? { subgroupId: editSubgroupId, fixedAsset: editFixedAsset }
          : {}),
        editNote: editNote.trim() || 'Aprovador - Administrativo alterou campos da solicitação.',
        items: buildItemsPayload(),
      });
      setEditNote('');
      setDirty(false);
      await reloadRequest();
      alert('Alterações salvas e registradas na timeline.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao salvar alterações.');
    } finally {
      setBusy(false);
    }
  }

  /** Imobilizado grava subgrupo AF + grupos dos itens (limpa classificationInvalidated se válido). */
  async function saveImobilizadoChanges() {
    if (!request) return;
    if (!editSubgroupId) {
      alert('Selecione o subgrupo de Ativo Fixo.');
      return;
    }
    for (const it of items) {
      if (!it.groupId || !(it.subgroupId || editSubgroupId)) {
        alert('Informe o grupo de itens de todos os itens na árvore de Ativo Fixo.');
        return;
      }
    }
    setBusy(true);
    try {
      await requestsApi.update(request.id, {
        subgroupId: editSubgroupId,
        fixedAsset: true,
        editNote:
          editNote.trim() ||
            'Aprovador - Imobilizado atualizou a classificação (árvore de ativo fixo).',
        items: buildItemsPayload(),
      });
      setEditNote('');
      setDirty(false);
      await reloadRequest();
      alert('Classificação salva. A invalidação é removida quando a árvore AF estiver completa.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao salvar classificação.');
    } finally {
      setBusy(false);
    }
  }

  /** Persiste edições do rascunho (solicitante) na API + timeline. */
  async function persistDraftEdits(): Promise<boolean> {
    if (!request) return false;
    if (!editHotelIds.length) {
      alert('Selecione ao menos uma unidade (hotel).');
      return false;
    }
    if (!editSubgroupId) {
      alert('Selecione o subgrupo da solicitação.');
      return false;
    }
    for (const it of items) {
      if (!it.descriptionShort.trim()) {
        alert('Preencha a descrição de todos os itens.');
        return false;
      }
      if (!it.groupId || !(it.subgroupId || editSubgroupId)) {
        alert('Informe o grupo de itens de todos os itens.');
        return false;
      }
      if ((!editFixedAsset && !it.measureUnitId) || !it.costCenterId) {
        alert(
          editFixedAsset
            ? 'Informe o centro de custo de todos os itens.'
            : 'Informe unidade de medida e centro de custo de todos os itens.',
        );
        return false;
      }
    }

    setBusy(true);
    try {
      await requestsApi.update(request.id, {
        hotelIds: editHotelIds,
        subgroupId: editSubgroupId,
        fixedAsset: editFixedAsset,
        items: buildItemsPayload(),
        targetStage: 'SOLICITANTE',
        editNote: editNote.trim() || 'Solicitante atualizou o rascunho da solicitação.',
      });
      setEditNote('');
      setDirty(false);
      await reloadRequest();
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao salvar o rascunho.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  function discardDraftEdits() {
    if (!request) return;
    // Recarrega do servidor — o effect de `request` restaura itens / hotéis.
    setDirty(false);
    setConfirmDiscardOpen(false);
    void reloadRequest();
  }

  async function confirmSaveDraft() {
    setConfirmSaveOpen(false);
    const ok = await persistDraftEdits();
    if (ok) alert('Rascunho salvo e alteração registrada na timeline.');
  }

  async function doSendToApprover() {
    if (!request) return;
    if (
      isBlockRequestType(request.type) &&
      !(request.observation ?? '').trim()
    ) {
      alert('Informe o motivo do bloqueio.');
      return;
    }
    if (!stageComment.trim()) {
      alert('Escreva um comentário sobre a conclusão desta etapa antes de prosseguir.');
      return;
    }
    const toAf = editFixedAsset;
    setBusy(true);
    try {
      await requestsApi.sendToApprover(request.id, stageComment.trim());
      alert(
        toAf
          ? 'Solicitação enviada ao aprovador de ativo fixo.'
          : 'Solicitação enviada ao aprovador.',
      );
      navigate('/produtos/caixa-de-entrada');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao enviar ao aprovador.');
    } finally {
      setBusy(false);
    }
  }

  function requestSendToApprover() {
    if (!request) return;
    if (!stageComment.trim()) {
      alert('Escreva um comentário sobre a conclusão desta etapa antes de prosseguir.');
      return;
    }
    if (dirty) {
      setConfirmSendDirty(true);
      return;
    }
    void doSendToApprover();
  }

  async function sendDirtySaveThenSend() {
    setConfirmSendDirty(false);
    const ok = await persistDraftEdits();
    if (ok) await doSendToApprover();
  }

  async function sendDirtyDiscardThenSend() {
    setConfirmSendDirty(false);
    setDirty(false);
    // Envia a versão já gravada no servidor (descarta edições locais).
    await doSendToApprover();
  }

  async function sendToApprover() {
    requestSendToApprover();
  }

  async function concludeImobilizado() {
    if (!request) return;
    if (!stageComment.trim()) {
      alert('Escreva um comentário sobre a conclusão da etapa Aprovador - Imobilizado.');
      return;
    }
    if (!request.fixedAsset) {
      alert(
        'Esta solicitação não está em família de ativo fixo. Encaminhe ao Administrativo selecionando o subgrupo de uso e consumo.',
      );
      return;
    }
    if (dirty) {
      alert('Salve as alterações da classificação antes de registrar na base de ativos fixos.');
      return;
    }
    if (request.classificationInvalidated) {
      alert(
        'Classificação invalidada: escolha o subgrupo e os grupos de Ativo Fixo e salve antes de registrar na base.',
      );
      return;
    }

    for (const it of items) {
      if (!it.groupId || !(it.subgroupId || editSubgroupId)) {
        alert('Informe o grupo de itens de todos os itens na árvore de Ativo Fixo antes de registrar.');
        return;
      }
    }

    const itemNcms: { itemId: string; ncm: string }[] = [];
    for (const it of request.items) {
      const ncm = selectedNcm[it.id] || customNcm[it.id] || it.ncmCode;
      if (!ncm) {
        alert('ITM-09: confirme o NCM de todos os itens antes de registrar na base de ativos fixos.');
        return;
      }
      itemNcms.push({ itemId: it.id, ncm });
    }

    setBusy(true);
    try {
      await requestsApi.sendFromImobilizado(request.id, stageComment.trim(), itemNcms);
      alert('Item(ns) registrados na base de ativos fixos. Solicitação encerrada.');
      setNcmNotFoundItems([]);
      navigate('/produtos/base');
    } catch (e) {
      if (isNcmNotFoundError(e)) {
        const failed = e.body.items ?? [];
        setNcmNotFoundItems(failed);
        const firstId = failed[0]?.id;
        if (firstId) {
          const idx = items.findIndex((it) => it.id === firstId);
          if (idx >= 0) setCurrentItem(idx);
        }
        return;
      }
      alert(e instanceof Error ? e.message : 'Falha ao registrar na base de ativos fixos.');
      await reloadRequest();
    } finally {
      setBusy(false);
    }
  }

  async function confirmReclassify(payload: {
    justification: string;
    itemIds: string[];
    targetSubgroupId: string;
  }) {
    if (!request) return;
    setBusy(true);
    try {
      const beforeChildren = request.childRequests?.length ?? 0;
      let updated: typeof request;
      if (reclassifyDirection === 'fixed-asset') {
        updated = await requestsApi.reclassifyFixedAsset(request.id, {
          justification: payload.justification,
          itemIds: payload.itemIds,
          targetSubgroupId: payload.targetSubgroupId,
        });
      } else {
        updated = await requestsApi.reclassifyConsumption(request.id, {
          justification: payload.justification,
          itemIds: payload.itemIds,
          targetSubgroupId: payload.targetSubgroupId,
        });
      }
      setReclassifyOpen(false);
      const newChild = (updated.childRequests ?? []).find(
        (c) => !(request.childRequests ?? []).some((old) => old.id === c.id),
      );
      const split = Boolean(newChild) || (updated.childRequests?.length ?? 0) > beforeChildren;
      if (split && newChild) {
        alert(
          `Lote dividido.\n\n` +
            `• Esta solicitação permanece com os itens que não foram reclassificados.\n` +
            `• Nova solicitação ${newChild.id.slice(0, 8)}… criada para os itens reclassificados ` +
            `(${newChild.fixedAsset ? 'Ativo Fixo / Aprovador - Imobilizado' : 'Uso e Consumo / Aprovador - Administrativo'}).`,
        );
        await reloadRequest();
      } else if (reclassifyDirection === 'fixed-asset') {
        alert(
          'Solicitação reclassificada como Ativo Fixo e enviada ao Aprovador - Imobilizado.',
        );
        navigate('/produtos/caixa-de-entrada');
      } else {
        alert(
          'Solicitação reclassificada como Uso e Consumo e enviada ao Aprovador - Administrativo.',
        );
        navigate('/produtos/caixa-de-entrada');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha na reclassificação.');
    } finally {
      setBusy(false);
    }
  }

  async function returnToRequester() {
    if (!request) return;
    if (!stageComment.trim()) {
      alert('Informe um comentário ao devolver a solicitação ao solicitante.');
      return;
    }
    setBusy(true);
    try {
      await requestsApi.returnToRequester(request.id, stageComment.trim());
      alert('Solicitação devolvida ao solicitante. O prazo SLA foi reiniciado.');
      navigate('/produtos/caixa-de-entrada');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao devolver solicitação.');
    } finally {
      setBusy(false);
    }
  }

  async function closeRequest(payload: { reasonCode: string; observation: string }) {
    if (!request) return;
    setBusy(true);
    try {
      await requestsApi.close(request.id, {
        reasonCode: payload.reasonCode || undefined,
        observation: payload.observation || undefined,
      });
      setCloseOpen(false);
      alert(
        'Solicitação encerrada. Ela não pode ser reaberta — se ainda precisar, abra uma nova.',
      );
      navigate('/produtos/solicitacoes');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao encerrar solicitação.');
    } finally {
      setBusy(false);
    }
  }

  async function finalize(
    approvedItemIds?: string[],
    returnRejectedItemIds?: string[],
  ) {
    if (!request) return;
    if (!stageComment.trim()) {
      alert('Escreva um comentário sobre a conclusão desta etapa antes de finalizar.');
      return;
    }

    const idsToApprove =
      approvedItemIds?.length
        ? approvedItemIds
        : request.items.map((it) => it.id);

    const itemNcms: { itemId: string; ncm: string }[] = [];
    if (!isBlockRequestType(request.type)) {
      for (const id of idsToApprove) {
        const it = request.items.find((x) => x.id === id);
        if (!it) continue;
        const ncm = selectedNcm[it.id] || customNcm[it.id] || it.ncmCode;
        if (!ncm) {
          alert(
            `ITM-09: confirme o NCM do item "${it.descriptionShort}" antes de finalizar.`,
          );
          return;
        }
        itemNcms.push({ itemId: it.id, ncm });
      }
    }

    const isPartial = idsToApprove.length < request.items.length;
    setBusy(true);
    try {
      const result = await requestsApi.approve(
        request.id,
        itemNcms,
        stageComment.trim(),
        approvedItemIds,
        returnRejectedItemIds,
      );
      setApproveOpen(false);
      const draftCode =
        result.stages
          ?.map((s) => s.outcomeDetail?.returnedDraftRequestCode)
          .filter((c): c is string => Boolean(c))
          .at(-1) ?? result.childRequests?.at(-1)?.code;
      if (isPartial) {
        const rejected = request.items.length - idsToApprove.length;
        alert(
          draftCode
            ? `Aprovação parcial: ${idsToApprove.length} item(ns) na base; ${rejected} rejeitado(s). Nova solicitação ${draftCode} criada para o solicitante. Solicitação encerrada.`
            : `Aprovação parcial: ${idsToApprove.length} item(ns) na base; ${rejected} rejeitado(s). Solicitação encerrada.`,
        );
      } else {
        alert(
          isBlockRequestType(request.type)
            ? 'Bloqueio aprovado. O produto foi atualizado na base. Solicitação encerrada.'
            : 'Aprovação total. Os itens foram cadastrados na Base de Produtos. Solicitação encerrada.',
        );
      }
      setNcmNotFoundItems([]);
      navigate('/produtos/base');
    } catch (e) {
      if (isNcmNotFoundError(e)) {
        const failed = e.body.items ?? [];
        setNcmNotFoundItems(failed);
        const firstId = failed[0]?.id;
        if (firstId) {
          const idx = items.findIndex((it) => it.id === firstId);
          if (idx >= 0) setCurrentItem(idx);
        }
        return;
      }
      alert(e instanceof Error ? e.message : 'Falha ao finalizar solicitação.');
    } finally {
      setBusy(false);
    }
  }

  function requestFinalize() {
    if (!request) return;
    if (!stageComment.trim()) {
      alert('Escreva um comentário sobre a conclusão desta etapa antes de finalizar.');
      return;
    }
    const needsPicker =
      request.type === 'INCLUSAO' && request.items.length > 1;
    if (needsPicker) {
      setApproveOpen(true);
      return;
    }
    void finalize();
  }

  if (loadError) {
    return (
      <section>
        <p className="form-error">{loadError}</p>
      </section>
    );
  }

  if (!request || !item) {
    return <p>Carregando…</p>;
  }

  const showCompare =
    isApprover &&
    isExistingProductRequestType(request.type) &&
    Boolean(requestItem?.productId);

  function focusTimelineItem(itemId: string) {
    if (!request) return;
    const idx = request.items.findIndex((it) => it.id === itemId);
    if (idx < 0) return;
    setCurrentItem(idx);
    requestAnimationFrame(() => {
      document
        .getElementById('request-item-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <section
      className={`dados-item-page detalhes-solicitacao-page${presenceLocked ? ' detalhes-solicitacao-page--presence-locked' : ''}`}
    >
      <PageStageHeader
        title={request.code ? `Solicitação ${request.code}` : 'Detalhes da Solicitação'}
        stage={stageLabel(request)}
      />

      <RequestViewersFlag
        viewers={presenceViewers}
        currentUserId={user?.id}
        editor={presenceEditor}
        locked={presenceLocked}
      />

      <p className="derived-field detalhes-meta">
        {request.code ? `${request.code} · ` : ''}
        {requestTypeLabel(request.type)}
        {isBlockRequestType(request.type) ? ` · ${blockScopeLabel(request)}` : ''}
        {request.fixedAsset ? ' · Ativo fixo' : ''}
        {request.family ? ` · ${request.family.code} — ${request.family.name}` : ''}
        {` · ${request.items.length} item(ns)`}
        {request.requester?.name ? ` · ${request.requester.name}` : ''}
        {request.hotels?.length
          ? ` · Unidades: ${request.hotels.map((h) => h.hotel.code).join(', ')}`
          : request.hotel
            ? ` · ${request.hotel.code}`
            : ''}
      </p>

      {request.classificationInvalidated ? (
        <p className="ncm-warning" role="status">
          {isImobilizado
            ? 'Classificação merceológica invalidada por reclassificação. Escolha a família e os grupos da árvore de Ativo Fixo e salve antes de encaminhar ou encerrar.'
            : 'Classificação merceológica invalidada por reclassificação. Reatribua a família e os grupos dos itens (árvore correta) antes de finalizar.'}
        </p>
      ) : null}

      {request.parentRequest ? (
        <p className="info-banner" role="status">
          Esta solicitação foi gerada por divisão de lote a partir de{' '}
          <button
            type="button"
            className="btn-link"
            onClick={() => navigate(`/produtos/solicitacao/${request.parentRequest!.id}`)}
          >
            {request.parentRequest.code ?? request.parentRequest.id.slice(0, 8)}
          </button>
          {request.parentRequest.fixedAsset ? ' (ativo fixo)' : ' (uso e consumo)'}.
        </p>
      ) : null}

      {request.childRequests?.length ? (
        <p className="info-banner" role="status">
          Solicitações geradas por divisão deste lote:{' '}
          {request.childRequests.map((c, idx) => (
            <span key={c.id}>
              {idx > 0 ? ', ' : null}
              <button
                type="button"
                className="btn-link"
                onClick={() => navigate(`/produtos/solicitacao/${c.id}`)}
              >
                {c.code ?? c.id.slice(0, 8)} ({c.fixedAsset ? 'AF' : 'consumo'} · {requestStateLabel(c.state)})
              </button>
            </span>
          ))}
        </p>
      ) : null}

      {(request.requestDescription?.trim() ||
        request.observation?.trim() ||
        isDraft) ? (
        <div className="solicitacao-resumo">
          <div className="solicitacao-resumo-cell">
            <p className="solicitacao-resumo-label">Descrição da solicitação</p>
            <RequestDescriptionBlock
              value={request.requestDescription ?? ''}
              readOnly={!draftEditable}
              confirmTitle="Alterar descrição da solicitação"
              confirmMessage="Deseja alterar a descrição? Em rascunho, a mudança será registrada na timeline ao salvar."
              saveConfirmTitle="Salvar descrição"
              saveConfirmMessage="Salvar a nova descrição? A alteração será registrada na timeline deste rascunho."
              onChange={() => undefined}
              onPersist={
                draftEditable
                  ? (next) => persistHeaderField('requestDescription', next)
                  : undefined
              }
            />
          </div>
          <div className="solicitacao-resumo-cell">
            <p className="solicitacao-resumo-label">
              {isBlockRequestType(request.type)
                ? 'Motivo do bloqueio'
                : 'Observação da solicitação'}
            </p>
            <RequestDescriptionBlock
              value={request.observation ?? ''}
              readOnly={!draftEditable}
              uppercase={false}
              multiline
              emptyPlaceholder={
                isBlockRequestType(request.type)
                  ? 'Informe o motivo do bloqueio'
                  : 'Motivo da inclusão ou atualização deste produto'
              }
              editAriaLabel="Alterar observação da solicitação"
              confirmTitle="Alterar observação da solicitação"
              confirmMessage="Deseja alterar a observação? Em rascunho, a mudança será registrada na timeline ao salvar."
              saveConfirmTitle="Salvar observação"
              saveConfirmMessage="Salvar a nova observação? A alteração será registrada na timeline deste rascunho."
              onChange={() => undefined}
              onPersist={
                draftEditable
                  ? (next) => persistHeaderField('observation', next)
                  : undefined
              }
            />
          </div>
        </div>
      ) : null}

      <SolicitacaoPreForm
        hotels={hotels}
        subgroups={subgroups}
        hotelIds={editHotelIds}
        subgroupId={editSubgroupId}
        fixedAsset={editFixedAsset}
        hideKind
        readOnly={!draftEditable && !classificationEditable}
        kindReadOnly={!draftEditable}
        hotelsReadOnly={!draftEditable}
        subgroupLocked={draftEditable && items.length > 0}
        onHotelChange={(ids) => {
          markDirty();
          setEditHotelIds(ids);
        }}
        onSubgroupChange={(nextId) => {
          markDirty();
          const selected = findSubgroupById(subgroups, nextId);
          const kind = selected?.itemKind ?? selected?.family?.itemKind;
          const nextAf = kind === 'FIXED_ASSET';
          const kindChanged = kind != null && nextAf !== editFixedAsset;
          if (kindChanged) {
            setEditFixedAsset(nextAf);
          }
          setEditSubgroupId(nextId);
          const defaults = classificationFromSubgroup(nextId, groups);
          setItems((prev) =>
            prev.map((it) => {
              const under = filterGroupsForSubgroup(groups, nextId);
              const keepGroup = under.some((g) => g.id === it.groupId);
              return {
                ...it,
                subgroupId: nextId,
                groupId: keepGroup ? it.groupId : defaults.groupId,
                ...(kindChanged
                  ? nextAf
                    ? {
                        measureUnitId: '',
                        purchaseQtyTotal: '',
                        law116: '',
                        unitQuantity: it.unitQuantity?.trim() ? it.unitQuantity : '1',
                      }
                    : {
                        physicalLocation: '',
                        assetTag: '',
                        acquisitionValue: '',
                        acquisitionDate: '',
                        usefulLifeMonths: '',
                        depreciationRate: '',
                        supplierDocument: '',
                        invoiceNumber: '',
                        unitQuantity: '1',
                      }
                  : {}),
              };
            }),
          );
        }}
        onFixedAssetChange={(v) => {
          markDirty();
          setEditFixedAsset(v);
          setEditSubgroupId('');
        }}
      />

      {isImobilizado && request.fixedAsset ? (
        <p className="info-banner">
          Classificada como <strong>ativo fixo</strong> — permanece no aprovador - imobilizado até o
          registro na base (não passa pelo administrativo).
        </p>
      ) : null}

      <ItemFolderStrip
        items={folderItems}
        currentIndex={currentItem}
        groups={groups}
        subgroups={subgroups}
        onSelect={setCurrentItem}
        onAdd={() => undefined}
        onRemove={() => undefined}
        allowAdd={false}
        allowRemove={false}
        errorIndexes={ncmErrorIndexes}
        addLockedLabel={
          draftEditable
            ? 'Para incluir ou remover itens, use “Editar itens do lote”'
            : 'Visualização — use as pastas para navegar entre itens'
        }
      />

      {ncmNotFoundItems.length ? (
        <p className="ncm-not-found-banner" role="alert">
          NCM não localizado na base de NCMs do portal em{' '}
          <strong>
            {ncmNotFoundItems.length} item
            {ncmNotFoundItems.length === 1 ? '' : 's'}
          </strong>
          . Corrija o(s) NCM destacado(s) e tente finalizar de novo.
          {ncmNotFoundItems.length <= 5 ? (
            <>
              {' '}
              (
              {ncmNotFoundItems
                .map((x) => `${x.description} → ${x.ncm}`)
                .join('; ')}
              )
            </>
          ) : null}
        </p>
      ) : null}

      {showCompare && requestItem ? (
        <RequestItemCompareTable
          baseProduct={baseProduct}
          item={requestItem}
          loading={baseLoading}
          request={request}
          isBlockRequest={isBlockRequestType(request.type)}
        />
      ) : null}

      <article id="request-item-form" className="solicitacao-form-card">
        <header className="solicitacao-form-card-header">
          <h2>Formulário de solicitação de produto</h2>
          <span className="solicitacao-form-item-badge">
            Item {currentItem + 1} de {items.length}
          </span>
        </header>

        <div className="solicitacao-form-body">
          <div className="pdm-classification">
            <p className="form-section-title">Classificação SAP do item</p>
            <ItemClassificationFields
              hideTitle
              readOnly={!fieldsEditable}
              lotSubgroupId={lotSubgroupId}
              value={{
                groupId: item.groupId,
                subgroupId: item.subgroupId || lotSubgroupId,
                source: item.source,
              }}
              groups={groups}
              onChange={fieldsEditable ? (patch) => patchCurrentItem(patch) : undefined}
            />
          </div>

          <div className="pdm-classification">
            <p className="form-section-title">Classificação do item</p>
            <ItemPrimaryFields
              readOnly={!fieldsEditable}
              hideMeasureUnit={editFixedAsset}
              value={{
                descriptionShort: item.descriptionShort,
                costCenterId: item.costCenterId,
                measureUnitId: item.measureUnitId,
                itemValue: item.itemValue,
                purchaseQtyTotal: item.purchaseQtyTotal,
                unifiedCode: item.unifiedCode,
                legacyCode: item.legacyCode,
                law116: item.law116,
                unitQuantity: item.unitQuantity,
                physicalLocation: item.physicalLocation,
                assetTag: item.assetTag,
                acquisitionValue: item.acquisitionValue,
                acquisitionDate: item.acquisitionDate,
                usefulLifeMonths: item.usefulLifeMonths,
                depreciationRate: item.depreciationRate,
                supplierDocument: item.supplierDocument,
                invoiceNumber: item.invoiceNumber,
              }}
              costCenters={costCenters}
              measureUnits={measureUnits}
              onChange={
                fieldsEditable
                  ? (patch) => {
                      if (patch.descriptionShort !== undefined) {
                        patch.descriptionShort = toFormUppercase(patch.descriptionShort);
                      }
                      if (patch.legacyCode !== undefined) {
                        patch.legacyCode = toFormUppercase(patch.legacyCode);
                      }
                      if (patch.physicalLocation !== undefined) {
                        patch.physicalLocation = toFormUppercase(patch.physicalLocation);
                      }
                      if (patch.assetTag !== undefined) {
                        patch.assetTag = toFormUppercase(patch.assetTag);
                      }
                      if (patch.invoiceNumber !== undefined) {
                        patch.invoiceNumber = toFormUppercase(patch.invoiceNumber);
                      }
                      patchCurrentItem(patch);
                    }
                  : undefined
              }
            />
          </div>

          <ItemCompletionSection
            readOnly={!fieldsEditable}
            value={{
              productLink: item.productLink,
              productLinks: item.productLinks.length
                ? item.productLinks
                : item.productLink
                  ? [item.productLink]
                  : [],
              descriptionLong: item.descriptionLong,
              itemObservation: item.itemObservation,
              attachments: [],
            }}
            onChange={
              fieldsEditable
                ? (patch) => {
                    const next: Partial<ViewItem> = { ...patch };
                    if (patch.descriptionLong !== undefined) {
                      next.descriptionLong = toFormUppercase(patch.descriptionLong);
                    }
                    if (patch.productLinks !== undefined) {
                      next.productLink = patch.productLinks[0] ?? '';
                    }
                    patchCurrentItem(next);
                  }
                : undefined
            }
          />

          {isApprover || (isImobilizado && request.fixedAsset) ? (
            isBlockRequestType(request.type) ? (
              <div className="solicitacao-form-section detalhes-ncm-block">
                <p className="form-section-title">NCM do cadastro</p>
                <p className="info-banner">
                  {baseLoading ? (
                    'Carregando NCM do produto…'
                  ) : (
                    <>
                      NCM cadastrado na base (somente leitura)
                      {baseProduct?.ncmCode || item.ncmCode ? (
                        <>
                          :{' '}
                          <strong>
                            {formatNcmDisplay(
                              baseProduct?.ncmCode || item.ncmCode || null,
                            )}
                          </strong>
                        </>
                      ) : (
                        <>
                          : <strong>não informado no cadastro</strong>
                        </>
                      )}
                      . Em bloqueio o aprovador não confirma nem altera NCM.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div
                className={`solicitacao-form-section detalhes-ncm-block${currentItemNcmError ? ' detalhes-ncm-block--error' : ''}`}
              >
                <p className="form-section-title">NCM — candidatos do histórico</p>
                {currentItemNcmError ? (
                  <div className="ncm-warning ncm-warning--error" role="alert">
                    NCM não localizado na base de NCMs do portal
                    {ncmNotFoundItems.find((x) => x.id === item.id)?.ncm
                      ? ` (${ncmNotFoundItems.find((x) => x.id === item.id)?.ncm})`
                      : ''}
                    . Escolha outro código cadastrado ou corrija o valor.
                  </div>
                ) : (
                  <div className="ncm-warning">
                    Nenhum NCM é gravado sem você confirmar. (ITM-09)
                  </div>
                )}
                {item.ncmConfirmed && item.ncmCode ? (
                  <p className="info-banner form-success">
                    NCM confirmado: <strong>{formatNcmDisplay(item.ncmCode)}</strong>
                  </p>
                ) : (
                  <div className="ncm-list">
                    {(item.ncmSuggestions ?? []).map((s) => {
                      const pct = Math.round(Number(s.score) * 100);
                      const sample = s.sampleDescription?.trim();
                      return (
                        <label
                          key={s.id}
                          className={`ncm-option ${selectedNcm[item.id] === s.ncm ? 'selected' : ''}${presenceLocked ? ' ncm-option--readonly' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`ncm-${item.id}`}
                            checked={selectedNcm[item.id] === s.ncm}
                            disabled={presenceLocked}
                            onChange={() => selectItemNcm(item.id, s.ncm)}
                          />
                          <span>
                            {sample ? (
                              <>
                                <strong>{sample}</strong> ({formatNcmDisplay(s.ncm)})
                              </>
                            ) : (
                              <strong>{formatNcmDisplay(s.ncm)}</strong>
                            )}{' '}
                            — usado {s.usageCount} {s.usageCount === 1 ? 'vez' : 'vezes'}{' '}
                            (similaridade {pct}%)
                          </span>
                        </label>
                      );
                    })}
                    <label
                      className={`ncm-option${presenceLocked ? ' ncm-option--readonly' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`ncm-${item.id}`}
                        disabled={presenceLocked}
                        onChange={() =>
                          selectItemNcm(item.id, customNcm[item.id] ?? '')
                        }
                      />
                      <span>Outro: </span>
                      <input
                        value={customNcm[item.id] ?? ''}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={10}
                        disabled={presenceLocked}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                          const display =
                            digits.length <= 4
                              ? digits
                              : digits.length <= 6
                                ? `${digits.slice(0, 4)}.${digits.slice(4)}`
                                : `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
                          clearNcmErrorForItem(item.id);
                          setCustomNcm((prev) => ({ ...prev, [item.id]: display }));
                          setSelectedNcm((prev) => ({ ...prev, [item.id]: digits }));
                        }}
                        placeholder="9999.99.99"
                      />
                    </label>
                  </div>
                )}
              </div>
            )
          ) : item.ncmCode ? (
            <p className="info-banner" style={{ marginTop: 16 }}>
              NCM: <strong>{formatNcmDisplay(item.ncmCode)}</strong>
              {item.ncmConfirmed ? ' (confirmado)' : ''}
            </p>
          ) : null}
        </div>
      </article>

      {draftEditable && dirty ? (
        <p className="info-banner" role="status">
          Há alterações não salvas neste rascunho. Salve para registrar na timeline ou descarte para
          voltar à última versão gravada.
        </p>
      ) : null}

      {draftEditable ? (
        <div className="stage-conclude-block">
          <label className="form-field">
            <span>Nota da edição (timeline)</span>
            <textarea
              rows={2}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Opcional — descreva o que foi alterado (registrado na timeline ao salvar)"
            />
          </label>
        </div>
      ) : null}

      {approverEditable ? (
        <div className="stage-conclude-block">
          <label className="form-field">
            <span>Nota da edição (timeline)</span>
            <textarea
              rows={2}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Opcional — descreva o que foi alterado (registrado na timeline ao salvar)"
            />
          </label>
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy || !dirty}
            onClick={() => void saveApproverChanges()}
          >
            Salvar alterações do aprovador - administrativo
          </button>
        </div>
      ) : null}

      {imobilizadoEditable ? (
        <div className="stage-conclude-block">
          <label className="form-field">
            <span>Nota da edição (timeline)</span>
            <textarea
              rows={2}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Opcional — descreva a reclassificação na árvore AF"
            />
          </label>
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy || !dirty}
            onClick={() => void saveImobilizadoChanges()}
          >
            Salvar classificação do aprovador - imobilizado
          </button>
        </div>
      ) : null}

      {canConcludeStage ? (
        <div className="stage-conclude-block">
          {isImobilizado ? (
            <p className="info-banner">
              O tipo (uso e consumo ou ativo fixo) vem da <strong>família</strong> do lote.
              Se chegou no setor errado, encaminhe ao Administrativo escolhendo a família de
              uso e consumo.
            </p>
          ) : null}
          <label className="form-field">
            <span>Observação da etapa</span>
            <textarea
              rows={3}
              value={stageComment}
              onChange={(e) => setStageComment(e.target.value)}
              placeholder="Escreva uma observação sobre a conclusão dessa etapa antes de prosseguir"
            />
          </label>
        </div>
      ) : null}

      <div className="search-actions">
        {draftEditable ? (
          <>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy || !dirty}
              onClick={() => setConfirmSaveOpen(true)}
            >
              Salvar alterações
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy || !dirty}
              onClick={() => setConfirmDiscardOpen(true)}
            >
              Descartar alterações
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() =>
                // Alteração/bloqueio usam o formulário pré-preenchido do item existente.
                isExistingProductRequestType(request.type)
                  ? navigate('/produtos/produto-existente', {
                      state: {
                        requestId: request.id,
                        type: isBlockRequestType(request.type)
                          ? 'BLOQUEIO'
                          : 'ALTERACAO',
                      },
                    })
                  : navigate('/produtos/dados-do-item', {
                      state: { requestId: request.id },
                    })
              }
            >
              {isExistingProductRequestType(request.type)
                ? 'Editar solicitação'
                : 'Editar itens do lote'}
            </button>
          </>
        ) : null}
        {canSendToApprover ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void sendToApprover()}
          >
            Enviar ao aprovador
          </button>
        ) : null}
        {canCloseAsSolicitante ? (
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={() => setCloseOpen(true)}
          >
            Encerrar solicitação
          </button>
        ) : null}
        {imobilizadoEditable ? (
          <>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => void returnToRequester()}
            >
              Devolver ao solicitante
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setCloseOpen(true)}
            >
              Encerrar solicitação
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => {
                setReclassifyDirection('consumption');
                setReclassifyOpen(true);
              }}
            >
              Encaminhar ao Administrativo
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !request.fixedAsset}
              onClick={() => void concludeImobilizado()}
            >
              Aprovar e registrar na base de ativos fixos
            </button>
          </>
        ) : null}
        {approverEditable ? (
          <>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => void returnToRequester()}
            >
              Devolver ao solicitante
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setCloseOpen(true)}
            >
              Encerrar solicitação
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => {
                setReclassifyDirection('fixed-asset');
                setReclassifyOpen(true);
              }}
            >
              Reclassificar como Ativo Fixo
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void requestFinalize()}
            >
              {request.type === 'INCLUSAO' && request.items.length > 1
                ? `Finalizar (${request.items.length} itens)`
                : `Finalizar os ${request.items.length} itens`}
            </button>
          </>
        ) : null}
        {!isDraft && !canSendToApprover && !isApprover && !isImobilizado ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/produtos/solicitacoes')}
          >
            Voltar às solicitações
          </button>
        ) : null}
      </div>

      <RequestTimeline stages={request.stages ?? []} onItemClick={focusTimelineItem} />

      <ConfirmDialog
        open={confirmSaveOpen}
        title="Salvar alterações do rascunho"
        message="Deseja salvar as alterações? Elas serão registradas na timeline e o rascunho continuará na etapa Solicitante."
        confirmLabel="Salvar"
        cancelLabel="Continuar editando"
        onConfirm={() => void confirmSaveDraft()}
        onCancel={() => setConfirmSaveOpen(false)}
      />

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Descartar alterações"
        message="Deseja descartar as alterações não salvas e voltar à última versão gravada?"
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={discardDraftEdits}
        onCancel={() => setConfirmDiscardOpen(false)}
      />

      {confirmSendDirty ? (
        <div className="confirm-overlay" style={{ zIndex: 1001 }} role="presentation">
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="confirm-title">Alterações não salvas</h2>
            <p className="confirm-message">
              Há alterações neste rascunho que ainda não foram salvas. Escolha como deseja
              prosseguir com o envio:
            </p>
            <div className="confirm-actions confirm-actions--triple">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmSendDirty(false)}
              >
                Voltar à edição
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={() => void sendDirtyDiscardThenSend()}
              >
                Descartar e enviar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void sendDirtySaveThenSend()}
              >
                Salvar e enviar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ReclassifyRequestDialog
        open={reclassifyOpen}
        direction={reclassifyDirection}
        items={request.items}
        subgroups={reclassifyDirection === 'fixed-asset' ? afSubgroups : ucSubgroups}
        busy={busy}
        onClose={() => setReclassifyOpen(false)}
        onConfirm={(payload) => void confirmReclassify(payload)}
      />

      <CloseRequestDialog
        open={closeOpen}
        actor={closeActor}
        busy={busy}
        onClose={() => setCloseOpen(false)}
        onConfirm={(payload) => void closeRequest(payload)}
      />

      <ApproveItemsDialog
        open={approveOpen}
        busy={busy}
        stageComment={stageComment}
        items={approveDialogItems}
        skipNcmConfirmation={isBlockRequestType(request.type)}
        ncmErrorItems={ncmNotFoundItems}
        onClose={() => setApproveOpen(false)}
        onConfirm={({ approvedItemIds, returnRejectedItemIds }) =>
          void finalize(approvedItemIds, returnRejectedItemIds)
        }
      />
    </section>
  );
}
