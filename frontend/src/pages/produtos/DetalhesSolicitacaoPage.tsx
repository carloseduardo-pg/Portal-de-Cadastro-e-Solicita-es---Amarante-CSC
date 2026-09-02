import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { RequestDescriptionBlock } from '../../components/RequestDescriptionBlock';
import { RequestItemCompareTable } from '../../components/requests/RequestItemCompareTable';
import { RequestTimeline } from '../../components/RequestTimeline';
import { SolicitacaoPreForm } from '../../components/SolicitacaoPreForm';
import { findFamilyById } from '../../lib/pdmFolders';
import {
  isExistingProductRequestType,
  requestStateLabel,
  requestTypeLabel,
} from '../../lib/requestLabels';
import { toFormUppercase } from '../../lib/formText';
import { formatNcmDisplay } from '../../lib/ncm';
import { catalogApi, productsApi, requestsApi } from '../../lib/resources';
import type {
  CatalogGroup,
  CatalogSubgroup,
  CostCenter,
  Family,
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

function stageLabel(state: string) {
  return requestStateLabel(state);
}

/**
 * Detalhe da solicitação — formulário + ações por etapa + timeline.
 */
export function DetalhesSolicitacaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<Request | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [subgroups, setSubgroups] = useState<CatalogSubgroup[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [measureUnits, setMeasureUnits] = useState<MeasureUnit[]>([]);

  const [items, setItems] = useState<ViewItem[]>([]);
  const [currentItem, setCurrentItem] = useState(0);
  const [selectedNcm, setSelectedNcm] = useState<Record<string, string>>({});
  const [customNcm, setCustomNcm] = useState<Record<string, string>>({});
  const [stageComment, setStageComment] = useState('');
  /** Triagem Imobilizado: null = ainda não respondeu. */
  const [afFlag, setAfFlag] = useState<boolean | null>(null);
  /** Com SIM: registrar na base AF na mesma aprovação (opcional). */
  const [autoRegisterAf, setAutoRegisterAf] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [baseProduct, setBaseProduct] = useState<ProductBase | null>(null);
  const [baseLoading, setBaseLoading] = useState(false);
  const [editHotelIds, setEditHotelIds] = useState<string[]>([]);
  const [editFamilyId, setEditFamilyId] = useState('');
  const [editFixedAsset, setEditFixedAsset] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmSendDirty, setConfirmSendDirty] = useState(false);
  const [reclassifyOpen, setReclassifyOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
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
    const kind = editFixedAsset ? 'FIXED_ASSET' : 'CONSUMPTION';
    void catalogApi
      .families({ pageSize: 500, itemKind: kind })
      .then((r) => {
        setFamilies(r.data);
        setEditFamilyId((prev) => (prev && r.data.some((f) => f.id === prev) ? prev : ''));
      })
      .catch(console.error);
  }, [editFixedAsset]);

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
  }, [id]);

  useEffect(() => {
    if (!request) return;
    const fam =
      findFamilyById(families, request.family?.id ?? '') ??
      (request.family
        ? ({
            id: request.family.id,
            code: request.family.code,
            name: request.family.name,
          } as Family)
        : undefined);
    void fam;

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
    setEditFamilyId(request.family?.id ?? '');
    setEditFixedAsset(Boolean(request.fixedAsset));
    setAfFlag(request.fixedAsset ? true : null);
    setAutoRegisterAf(Boolean(request.fixedAsset));
    setDirty(false);
    setCurrentItem(0);
  }, [request, families]);

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
  const selectedFamily = findFamilyById(families, editFamilyId || request?.family?.id || '');
  const familyId = editFamilyId || request?.family?.id || '';

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

  const isDraft =
    request?.state === 'RASCUNHO' ||
    request?.state === 'SOLICITANTE' ||
    request?.state === 'RETORNO_SOLICITANTE';
  const isSolicitante = request?.state === 'SOLICITANTE';
  const isReturnToRequester = request?.state === 'RETORNO_SOLICITANTE';
  const isApprover = request?.state === 'APROVADOR';
  const isImobilizado = request?.state === 'IMOBILIZADO';
  const canSendToApprover = isSolicitante || isReturnToRequester;
  const canConcludeStage = canSendToApprover || isApprover || isImobilizado;
  /** Rascunho direto, solicitante ou retorno — pode encerrar. */
  const canCloseAsSolicitante = Boolean(isDraft);
  const canCloseAsAprovador = isApprover || isImobilizado;
  const closeActor: CloseRequestActor = canCloseAsAprovador ? 'aprovador' : 'solicitante';
  const draftEditable = Boolean(isDraft);
  const fieldsEditable = draftEditable || isApprover || isImobilizado;
  const approverEditable = isApprover;
  const imobilizadoEditable = isImobilizado;
  const classificationEditable =
    imobilizadoEditable || (isApprover && Boolean(request?.classificationInvalidated));

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
    setBusy(true);
    try {
      await requestsApi.update(request.id, {
        ...(request.classificationInvalidated && editFamilyId
          ? { familyId: editFamilyId }
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

  /** Imobilizado grava família AF + grupos dos itens (limpa classificationInvalidated se válido). */
  async function saveImobilizadoChanges() {
    if (!request) return;
    if (!editFamilyId) {
      alert('Selecione a família de Ativo Fixo.');
      return;
    }
    for (const it of items) {
      if (!it.groupId || !it.subgroupId) {
        alert('Informe grupo e subgrupo de todos os itens na árvore de Ativo Fixo.');
        return;
      }
    }
    setBusy(true);
    try {
      await requestsApi.update(request.id, {
        familyId: editFamilyId,
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
    if (!editFamilyId) {
      alert('Selecione a família da solicitação.');
      return false;
    }
    for (const it of items) {
      if (!it.descriptionShort.trim()) {
        alert('Preencha a descrição de todos os itens.');
        return false;
      }
      if (!it.groupId || !it.subgroupId) {
        alert('Informe grupo e subgrupo de todos os itens.');
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
        familyId: editFamilyId,
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
    if (!stageComment.trim()) {
      alert('Escreva um comentário sobre a conclusão desta etapa antes de prosseguir.');
      return;
    }
    setBusy(true);
    try {
      await requestsApi.sendToApprover(request.id, stageComment.trim());
      alert('Solicitação enviada ao aprovador - imobilizado (triagem inicial).');
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
    if (afFlag === null) {
      alert('Responda a flag obrigatória: este item é ativo fixo? SIM ou NÃO.');
      return;
    }

    // NÃO → uso e consumo → Administrativo
    if (afFlag === false) {
      setBusy(true);
      try {
        await requestsApi.sendFromImobilizado(request.id, stageComment.trim());
        alert('Não é ativo fixo — encaminhado ao aprovador - administrativo.');
        navigate('/produtos/caixa-de-entrada');
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Falha ao encaminhar ao administrativo.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // SIM → fluxo obrigatório de ativo fixo
    const registerNow = autoRegisterAf || request.fixedAsset;

    if (!registerNow) {
      setBusy(true);
      try {
        if (!request.fixedAsset) {
          await requestsApi.markFixedAsset(request.id, stageComment.trim());
        }
        alert(
          'Classificado como ativo fixo. A solicitação permanece na caixa do aprovador - imobilizado para registro na base.',
        );
        navigate('/produtos/caixa-de-entrada');
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Falha ao classificar como ativo fixo.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // SIM + registrar agora (ou 2ª passagem já AF)
    if (!editFamilyId && !request.fixedAsset) {
      alert(
        'Para registrar agora, selecione a família de ativo fixo nos campos acima (ou desmarque o registro automático e aprove só a classificação).',
      );
      return;
    }
    if (dirty && request.fixedAsset) {
      alert('Salve as alterações da classificação antes de registrar na base de ativos fixos.');
      return;
    }
    if (request.fixedAsset && request.classificationInvalidated) {
      alert(
        'Classificação invalidada: escolha a família e os grupos de Ativo Fixo e salve antes de registrar na base.',
      );
      return;
    }

    for (const it of items) {
      if (editFixedAsset && (!it.groupId || !it.subgroupId)) {
        alert('Informe grupo e subgrupo de todos os itens na árvore de Ativo Fixo antes de registrar.');
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
      if (!request.fixedAsset) {
        await requestsApi.markFixedAsset(request.id, stageComment.trim());
        await requestsApi.update(request.id, {
          familyId: editFamilyId,
          fixedAsset: true,
          editNote: 'Classificação AF na mesma aprovação (registro automático).',
          items: buildItemsPayload(),
        });
      }
      await requestsApi.sendFromImobilizado(request.id, stageComment.trim(), itemNcms);
      alert('Item(ns) registrados na base de ativos fixos. Solicitação encerrada.');
      navigate('/produtos/base');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao registrar na base de ativos fixos.');
      await reloadRequest();
    } finally {
      setBusy(false);
    }
  }

  async function confirmReclassify(payload: {
    justification: string;
    itemIds: string[];
    returnToApprover?: boolean;
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
          returnToApprover: payload.returnToApprover,
        });
      } else {
        updated = await requestsApi.reclassifyConsumption(request.id, {
          justification: payload.justification,
          itemIds: payload.itemIds,
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

  async function finalize() {
    if (!request) return;
    if (!stageComment.trim()) {
      alert('Escreva um comentário sobre a conclusão desta etapa antes de finalizar.');
      return;
    }
    const itemNcms: { itemId: string; ncm: string }[] = [];
    for (const it of request.items) {
      const ncm = selectedNcm[it.id] || customNcm[it.id] || it.ncmCode;
      if (!ncm) {
        alert(
          'ITM-09: Nenhum NCM é gravado sem você confirmar. Selecione ou digite o NCM de cada item.',
        );
        return;
      }
      itemNcms.push({ itemId: it.id, ncm });
    }
    setBusy(true);
    try {
      await requestsApi.approve(request.id, itemNcms, stageComment.trim());
      alert('Solicitação encerrada. Os itens foram cadastrados na Base de Produtos.');
      navigate('/produtos/base');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao finalizar solicitação.');
    } finally {
      setBusy(false);
    }
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

  return (
    <section className="dados-item-page detalhes-solicitacao-page">
      <PageStageHeader
        title="Detalhes da Solicitação"
        stage={stageLabel(request.state)}
      />

      <p className="derived-field detalhes-meta">
        {requestTypeLabel(request.type)}
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
            {request.parentRequest.id.slice(0, 8)}…
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
                {c.id.slice(0, 8)}… ({c.fixedAsset ? 'AF' : 'consumo'} · {requestStateLabel(c.state)})
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
              readOnly={!isDraft}
              confirmTitle="Alterar descrição da solicitação"
              confirmMessage="Deseja alterar a descrição? Em rascunho, a mudança será registrada na timeline ao salvar."
              saveConfirmTitle="Salvar descrição"
              saveConfirmMessage="Salvar a nova descrição? A alteração será registrada na timeline deste rascunho."
              onChange={() => undefined}
              onPersist={
                isDraft
                  ? (next) => persistHeaderField('requestDescription', next)
                  : undefined
              }
            />
          </div>
          <div className="solicitacao-resumo-cell">
            <p className="solicitacao-resumo-label">Observação da solicitação</p>
            <RequestDescriptionBlock
              value={request.observation ?? ''}
              readOnly={!isDraft}
              uppercase={false}
              multiline
              emptyPlaceholder="Motivo da inclusão ou atualização deste produto"
              editAriaLabel="Alterar observação da solicitação"
              confirmTitle="Alterar observação da solicitação"
              confirmMessage="Deseja alterar a observação? Em rascunho, a mudança será registrada na timeline ao salvar."
              saveConfirmTitle="Salvar observação"
              saveConfirmMessage="Salvar a nova observação? A alteração será registrada na timeline deste rascunho."
              onChange={() => undefined}
              onPersist={
                isDraft
                  ? (next) => persistHeaderField('observation', next)
                  : undefined
              }
            />
          </div>
        </div>
      ) : null}

      <SolicitacaoPreForm
        hotels={hotels}
        families={families}
        hotelIds={editHotelIds}
        familyId={editFamilyId}
        fixedAsset={editFixedAsset}
        hideKind
        readOnly={!draftEditable && !classificationEditable}
        kindReadOnly={!draftEditable}
        hotelsReadOnly={!draftEditable}
        familyLocked={draftEditable && items.length > 0}
        onHotelChange={(ids) => {
          markDirty();
          setEditHotelIds(ids);
        }}
        onFamilyChange={(nextId) => {
          markDirty();
          setEditFamilyId(nextId);
          setItems((prev) =>
            prev.map((it) => ({
              ...it,
              groupId: '',
              subgroupId: '',
            })),
          );
        }}
        onFixedAssetChange={(v) => {
          markDirty();
          setEditFixedAsset(v);
          setEditFamilyId('');
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
        addLockedLabel={
          draftEditable
            ? 'Para incluir ou remover itens, use “Editar itens do lote”'
            : 'Visualização — use as pastas para navegar entre itens'
        }
      />

      {showCompare && requestItem ? (
        <RequestItemCompareTable
          baseProduct={baseProduct}
          item={requestItem}
          loading={baseLoading}
        />
      ) : null}

      <article className="solicitacao-form-card">
        <header className="solicitacao-form-card-header">
          <h2>Formulário de solicitação de produto</h2>
          <span className="solicitacao-form-item-badge">
            Item {currentItem + 1} de {items.length}
          </span>
        </header>

        <div className="solicitacao-form-body">
          <div className="pdm-classification">
            <p className="form-section-title">Classificação do item</p>
            <ItemPrimaryFields
              readOnly={!fieldsEditable}
              hideMeasureUnit={editFixedAsset || Boolean(request.fixedAsset)}
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

            <hr className="pdm-classification-divider" />

            <ItemClassificationFields
              hideTitle
              readOnly={!fieldsEditable}
              familyContext={selectedFamily}
              value={{
                groupId: item.groupId,
                subgroupId: item.subgroupId,
                source: item.source,
              }}
              groups={groups}
              subgroups={subgroups}
              onChange={fieldsEditable ? (patch) => patchCurrentItem(patch) : undefined}
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

          {isApprover || isImobilizado ? (
            <div className="solicitacao-form-section detalhes-ncm-block">
              <p className="form-section-title">NCM — candidatos do histórico</p>
              <div className="ncm-warning">
                Nenhum NCM é gravado sem você confirmar. (ITM-09)
              </div>
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
                        className={`ncm-option ${selectedNcm[item.id] === s.ncm ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`ncm-${item.id}`}
                          checked={selectedNcm[item.id] === s.ncm}
                          onChange={() =>
                            setSelectedNcm((prev) => ({ ...prev, [item.id]: s.ncm }))
                          }
                        />
                        <span>
                          {sample ? (
                            <>
                              <strong>{sample}</strong> ({formatNcmDisplay(s.ncm)})
                            </>
                          ) : (
                            <strong>{formatNcmDisplay(s.ncm)}</strong>
                          )}{' '}
                          — usado {s.usageCount} {s.usageCount === 1 ? 'vez' : 'vezes'} (similaridade{' '}
                          {pct}%)
                        </span>
                      </label>
                    );
                  })}
                  <label className="ncm-option">
                    <input
                      type="radio"
                      name={`ncm-${item.id}`}
                      onChange={() =>
                        setSelectedNcm((prev) => ({
                          ...prev,
                          [item.id]: customNcm[item.id] ?? '',
                        }))
                      }
                    />
                    <span>Outro: </span>
                    <input
                      value={customNcm[item.id] ?? ''}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={10}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                        const display =
                          digits.length <= 4
                            ? digits
                            : digits.length <= 6
                              ? `${digits.slice(0, 4)}.${digits.slice(4)}`
                              : `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
                        setCustomNcm((prev) => ({ ...prev, [item.id]: display }));
                        setSelectedNcm((prev) => ({ ...prev, [item.id]: digits }));
                      }}
                      placeholder="9999.99.99"
                    />
                  </label>
                </div>
              )}
            </div>
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
            <div className="af-flag-block">
              <p className="af-flag-block__label">
                É ativo fixo? <span className="required-mark">*</span>
              </p>
              <p className="af-flag-block__hint">
                Obrigatório antes de aprovar. SIM mantém o fluxo no imobilizado; NÃO encaminha ao
                administrativo (uso e consumo).
              </p>
              <div className="af-flag-segment" role="radiogroup" aria-label="É ativo fixo?">
                <button
                  type="button"
                  role="radio"
                  aria-checked={afFlag === true}
                  disabled={busy || request.fixedAsset}
                  className={`af-flag-segment__btn${afFlag === true ? ' af-flag-segment__btn--active' : ''}`}
                  onClick={() => {
                    setAfFlag(true);
                    setEditFixedAsset(true);
                  }}
                >
                  SIM
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={afFlag === false}
                  disabled={busy || request.fixedAsset}
                  className={`af-flag-segment__btn${afFlag === false ? ' af-flag-segment__btn--active' : ''}`}
                  onClick={() => {
                    setAfFlag(false);
                    setEditFixedAsset(false);
                    setAutoRegisterAf(false);
                  }}
                >
                  NÃO
                </button>
              </div>
                  {afFlag === true ? (
                <label className="af-flag-autoregister">
                  <input
                    type="checkbox"
                    checked={autoRegisterAf || request.fixedAsset}
                    disabled={busy || request.fixedAsset}
                    onChange={(e) => setAutoRegisterAf(e.target.checked)}
                  />
                  <span>
                    {request.fixedAsset
                      ? 'Registrar na base de ativos fixos ao aprovar (obrigatório nesta passagem).'
                      : 'Registrar automaticamente na base de ativos fixos ao aprovar (evita voltar à caixa de entrada). Exige família/grupo AF e NCM confirmado.'}
                  </span>
                </label>
              ) : null}
              {request.fixedAsset ? (
                <button
                  type="button"
                  className="btn btn-ghost af-flag-undo"
                  disabled={busy}
                  onClick={() => {
                    setReclassifyDirection('consumption');
                    setReclassifyOpen(true);
                  }}
                >
                  Desfazer — é uso e consumo
                </button>
              ) : null}
            </div>
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
                navigate('/produtos/dados-do-item', { state: { requestId: request.id } })
              }
            >
              Editar itens do lote
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
            Enviar ao aprovador - imobilizado
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
        {isImobilizado ? (
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
              className="btn btn-primary"
              disabled={busy || afFlag === null}
              onClick={() => void concludeImobilizado()}
            >
              {afFlag === true && (autoRegisterAf || request.fixedAsset)
                ? 'Aprovar e registrar na base de ativos fixos'
                : afFlag === true
                  ? 'Aprovar como ativo fixo'
                  : afFlag === false
                    ? 'Aprovar e encaminhar ao administrativo'
                    : 'Aprovar (responda a flag ativo fixo)'}
            </button>
          </>
        ) : null}
        {isApprover ? (
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
              onClick={() => void finalize()}
            >
              Finalizar os {request.items.length} itens
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

      <RequestTimeline stages={request.stages ?? []} />

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
    </section>
  );
}
