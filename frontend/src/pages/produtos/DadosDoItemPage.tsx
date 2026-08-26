import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SendRequestDialog } from '../../components/SendRequestDialog';
import {
  ItemClassificationFields,
  type ItemClassificationErrors,
} from '../../components/ItemClassificationFields';
import { ItemPrimaryFields } from '../../components/ItemPrimaryFields';
import { ItemCompletionSection, type ItemAttachmentDraft } from '../../components/ItemCompletionSection';
import { ItemFolderStrip } from '../../components/ItemFolderStrip';
import { PageStageHeader } from '../../components/PageStageHeader';
import { SimilarProductsPanel } from '../../components/SimilarProductsPanel';
import { RequestDescriptionBlock } from '../../components/RequestDescriptionBlock';
import { SolicitacaoPreForm } from '../../components/SolicitacaoPreForm';
import { useSimilarProducts } from '../../hooks/useSimilarProducts';
import { requiredText } from '../../lib/formValidation';
import { toFormUppercase } from '../../lib/formText';
import { findFamilyById, classificationFromFamily } from '../../lib/pdmFolders';
import { catalogApi, productsApi, requestsApi } from '../../lib/resources';
import type {
  CatalogGroup,
  CatalogSubgroup,
  CostCenter,
  Family,
  Hotel,
  MeasureUnit,
  ProductAttribute,
} from '../../lib/types';
import './produtos.css';
import '../../components/ItemFolderStrip.css';
import '../../components/SimilarProductsPanel.css';
import '../../components/FormField.css';
import '../../components/PdmClassificationFields.css';
import '../../components/SolicitacaoPreForm.css';
import '../../components/RequestDescriptionBlock.css';
import '../../components/ItemCompletionSection.css';

const DRAFT_EXPIRY_DAYS = 15;

type DadosFieldErrors = ItemClassificationErrors & {
  familyId?: string;
  hotelIds?: string;
  requestDescription?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  measureUnitId?: string;
  costCenterId?: string;
  observation?: string;
  duplicate?: string;
};

type ItemDraft = {
  productId?: string;
  groupId: string;
  subgroupId: string;
  descriptionShort: string;
  descriptionLong: string;
  measureUnitId: string;
  costCenterId: string;
  source: 'NATIONAL' | 'FOREIGN';
  itemValue: string;
  purchaseQtyTotal: string;
  unifiedCode: string;
  legacyCode: string;
  law116: string;
  productLink: string;
  itemObservation: string;
  attachments: ItemAttachmentDraft[];
};

type NavState = {
  searchQuery?: string;
  observation?: string;
  existingProductId?: string;
  hotelId?: string;
  hotelIds?: string[];
  requestId?: string;
  type?: 'INCLUSAO' | 'ALTERACAO';
};

function emptyItem(descriptionShort = ''): ItemDraft {
  return {
    groupId: '',
    subgroupId: '',
    descriptionShort,
    descriptionLong: '',
    measureUnitId: '',
    costCenterId: '',
    source: 'NATIONAL',
    itemValue: '',
    purchaseQtyTotal: '',
    unifiedCode: '',
    legacyCode: '',
    law116: '',
    productLink: '',
    itemObservation: '',
    attachments: [],
  };
}

function itemHasData(it: ItemDraft) {
  return Boolean(
    it.groupId ||
      it.subgroupId ||
      it.descriptionShort.trim() ||
      it.descriptionLong.trim() ||
      it.measureUnitId ||
      it.costCenterId ||
      it.itemValue ||
      it.purchaseQtyTotal ||
      it.unifiedCode.trim() ||
      it.legacyCode.trim() ||
      it.law116.trim() ||
      it.productLink.trim() ||
      it.itemObservation.trim() ||
      it.attachments.length,
  );
}

/**
 * Tela 2 — Dados do item (P6).
 * Pré-formulário: unidades + família (ITM-11). Itens: grupo/subgrupo por item.
 */
export function DadosDoItemPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = (location.state ?? {}) as NavState;

  const [requestId, setRequestId] = useState<string | undefined>(nav.requestId);
  const [requestType, setRequestType] = useState<'INCLUSAO' | 'ALTERACAO'>(nav.type ?? 'INCLUSAO');
  const [hotelIds, setHotelIds] = useState<string[]>(
    nav.hotelIds?.length ? nav.hotelIds : nav.hotelId ? [nav.hotelId] : [],
  );
  const [familyId, setFamilyId] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [currentItem, setCurrentItem] = useState(0);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [observation, setObservation] = useState(nav.observation ?? '');
  const [requestDescription, setRequestDescription] = useState(
    nav.searchQuery?.toUpperCase() ?? '',
  );
  const [fieldErrors, setFieldErrors] = useState<DadosFieldErrors>({});

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [subgroups, setSubgroups] = useState<CatalogSubgroup[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [measureUnits, setMeasureUnits] = useState<MeasureUnit[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const item = items[currentItem] ?? items[0];
  const selectedFamily = findFamilyById(families, familyId);
  const preFormComplete = Boolean(familyId && hotelIds.length);

  const familyLocked =
    items.some(itemHasData) || items.length > 1 || requestType === 'ALTERACAO';

  const isInclusionItem = requestType === 'INCLUSAO' && !item.productId;
  const similarCheckEnabled =
    isInclusionItem && Boolean(familyId) && item.descriptionShort.trim().length >= 3;

  const {
    results: similarResults,
    loading: similarLoading,
    searched: similarSearched,
  } = useSimilarProducts({
    query: item.descriptionShort,
    enabled: similarCheckEnabled,
  });

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

  function clearFieldError(key: keyof DadosFieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  useEffect(() => {
    void Promise.all([
      catalogApi.hotels().then(setHotels),
      catalogApi.groups(1, 200).then((r) => setGroups(r.data)),
      catalogApi.subgroups({ pageSize: 500 }).then((r) =>
        setSubgroups(
          r.data.map((sg) => ({
            ...sg,
            groupId: sg.groupId ?? sg.group?.id,
          })),
        ),
      ),
      catalogApi.families({ pageSize: 500 }).then((r) => setFamilies(r.data)),
      catalogApi.measureUnits().then((r) => setMeasureUnits(r.data)),
    ]).catch(console.error);
  }, []);

  useEffect(() => {
    if (!hotelIds.length) {
      setCostCenters([]);
      return;
    }
    void catalogApi.costCenters(hotelIds).then(setCostCenters).catch(console.error);
  }, [hotelIds]);

  useEffect(() => {
    if (!familyId) {
      setAttributes([]);
      return;
    }
    void catalogApi.familyAttributes(familyId).then(setAttributes).catch(console.error);
  }, [familyId]);

  useEffect(() => {
    const fam = findFamilyById(families, familyId);
    if (!fam?.groupId) return;
    const { groupId, subgroupId } = classificationFromFamily(fam);
    setItems((prev) =>
      prev.map((it) =>
        !it.groupId && !it.subgroupId ? { ...it, groupId, subgroupId } : it,
      ),
    );
  }, [familyId, families]);

  useEffect(() => {
    if (nav.requestId) {
      void requestsApi.get(nav.requestId).then((req) => {
        setRequestId(req.id);
        setRequestType(req.type as 'INCLUSAO' | 'ALTERACAO');
        const ids = req.hotels?.map((rh) => rh.hotel.id) ?? (req.hotel?.id ? [req.hotel.id] : []);
        setHotelIds(ids);
        setFamilyId(req.family?.id ?? '');
        setObservation(req.observation ?? '');
        setRequestDescription(req.requestDescription ?? '');
        setItems(
          req.items.length
            ? req.items.map((it) => ({
                productId: it.productId ?? undefined,
                groupId: '',
                subgroupId: '',
                descriptionShort: it.descriptionShort,
                descriptionLong: it.descriptionLong ?? '',
                measureUnitId: it.measureUnit?.id ?? '',
                costCenterId: it.costCenter?.id ?? '',
                source: (it.source === 'FOREIGN' ? 'FOREIGN' : 'NATIONAL') as ItemDraft['source'],
                itemValue: it.itemValue != null ? String(it.itemValue) : '',
                purchaseQtyTotal: it.purchaseQtyTotal != null ? String(it.purchaseQtyTotal) : '',
                unifiedCode: it.unifiedCode ?? '',
                legacyCode: it.legacyCode ?? '',
                law116: it.law116 ?? '',
                productLink: it.productLink ?? '',
                itemObservation: it.itemObservation ?? '',
                attachments: [],
              }))
            : [emptyItem()],
        );
      }).catch(console.error);
      return;
    }

    if (nav.existingProductId) {
      setRequestType('ALTERACAO');
      void productsApi.get(nav.existingProductId).then(async (p) => {
        const famList = families.length ? families : (await catalogApi.families({ pageSize: 500 })).data;
        if (!families.length) setFamilies(famList);
        const fam = famList.find((f) => f.code === p.family?.code);
        if (fam) setFamilyId(fam.id);
        const muList = measureUnits.length ? measureUnits : (await catalogApi.measureUnits()).data;
        if (!measureUnits.length) setMeasureUnits(muList);
        const mu = muList.find((m) => m.code === p.measureUnit?.code);
        setItems([
          {
            ...emptyItem(),
            productId: p.id,
            groupId: fam?.groupId ?? '',
            subgroupId: fam?.subgroupId ?? '',
            descriptionShort: p.descriptionShort,
            descriptionLong: p.descriptionLong ?? '',
            measureUnitId: mu?.id ?? '',
            costCenterId: '',
            source: 'NATIONAL',
            itemValue: '',
            purchaseQtyTotal: '',
            unifiedCode: p.unifiedCode ?? '',
            legacyCode: '',
            law116: '',
            productLink: '',
            itemObservation: '',
            attachments: [],
          },
        ]);
      }).catch(console.error);
    }
  }, [nav.requestId, nav.existingProductId, families, measureUnits]);

  function handleFamilyChange(nextId: string) {
    const prevId = familyId;
    setFamilyId(nextId);
    clearFieldError('familyId');
    if (prevId && nextId !== prevId && familyLocked) {
      setItems([emptyItem()]);
      setCurrentItem(0);
      setError(null);
      setSuccess(null);
    }
  }

  function patchCurrent(patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, idx) => (idx === currentItem ? { ...it, ...patch } : it)));
  }

  function patchClassification(patch: Partial<ItemDraft>) {
    patchCurrent(patch);
    if (patch.groupId !== undefined) clearFieldError('groupId');
    if (patch.subgroupId !== undefined) clearFieldError('subgroupId');
  }

  function onPrimaryChange(patch: Partial<ItemDraft>) {
    if (patch.descriptionShort !== undefined) {
      patch.descriptionShort = toFormUppercase(patch.descriptionShort);
      clearFieldError('descriptionShort');
      clearFieldError('duplicate');
    }
    if (patch.legacyCode !== undefined) {
      patch.legacyCode = toFormUppercase(patch.legacyCode);
    }
    if (patch.costCenterId !== undefined) clearFieldError('costCenterId');
    if (patch.measureUnitId !== undefined) clearFieldError('measureUnitId');
    patchCurrent(patch);
  }

  function onCompletionChange(patch: Partial<ItemDraft>) {
    if (patch.descriptionLong !== undefined) {
      patch.descriptionLong = toFormUppercase(patch.descriptionLong);
      clearFieldError('descriptionLong');
    }
    patchCurrent(patch);
  }

  function onAttributeInput(e: ChangeEvent<HTMLInputElement>) {
    e.target.value = toFormUppercase(e.target.value);
  }

  async function findDuplicateInBase(description: string): Promise<boolean> {
    if (description.trim().length < 3) return false;
    const r = await productsApi.search({ q: description, pageSize: 1 });
    return r.data.length > 0;
  }

  function addItem() {
    if (requestType === 'ALTERACAO') {
      setError('Solicitação de alteração admite apenas um item vinculado ao produto da base.');
      return;
    }
    if (!familyId) {
      setFieldErrors((prev) => ({
        ...prev,
        familyId: 'Selecione a família do lote no pré-formulário antes de adicionar itens.',
      }));
      return;
    }
    const cur = items[currentItem];
    const fam = findFamilyById(families, familyId);
    const defaults = classificationFromFamily(fam);
    const nextIndex = items.length;
    setItems((prev) => [
      ...prev,
      {
        ...emptyItem(),
        groupId: cur?.groupId || defaults.groupId,
        subgroupId: cur?.subgroupId || defaults.subgroupId,
        source: cur?.source ?? 'NATIONAL',
      },
    ]);
    setCurrentItem(nextIndex);
    setError(null);
  }

  function confirmRemoveItem() {
    if (removeIndex === null) return;
    if (items.length <= 1) {
      setError('A solicitação precisa ter ao menos um item.');
      setRemoveIndex(null);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== removeIndex));
    setCurrentItem((cur) => {
      if (cur > removeIndex) return cur - 1;
      if (cur === removeIndex) return Math.max(0, removeIndex - 1);
      return cur;
    });
    setRemoveIndex(null);
    setError(null);
  }

  function validateForm(submit: boolean): DadosFieldErrors {
    const errors: DadosFieldErrors = {};

    if (requestType === 'INCLUSAO' || requestType === 'ALTERACAO') {
      const descErr = requiredText(
        requestDescription,
        'Informe a descrição do produto que deseja solicitar.',
      );
      if (descErr) errors.requestDescription = descErr;

      const obsErr = requiredText(
        observation,
        requestType === 'ALTERACAO'
          ? 'Descreva o que precisa ser atualizado neste produto.'
          : 'Descreva o motivo da inclusão ou atualização deste produto.',
      );
      if (obsErr) errors.observation = obsErr;
    }

    if (requestType === 'ALTERACAO' && items.length > 1) {
      errors.descriptionShort = 'Solicitação de alteração deve ter exatamente um item.';
    }

    if (!hotelIds.length) {
      errors.hotelIds = 'Selecione ao menos uma unidade (hotel).';
    }
    if (!familyId) {
      errors.familyId = 'Selecione a família desta solicitação (ITM-11: uma família por lote).';
    }
    if (!items.length) {
      errors.descriptionShort = 'Adicione ao menos um item.';
      return errors;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemErrors: DadosFieldErrors = {};

      if (!it.groupId) itemErrors.groupId = 'Campo é obrigatório';
      if (!it.subgroupId) itemErrors.subgroupId = 'Campo é obrigatório';

      if (!it.descriptionShort.trim()) {
        itemErrors.descriptionShort = 'Campo é obrigatório';
      }
      if (submit && !it.descriptionLong.trim()) {
        itemErrors.descriptionLong = `Item ${i + 1}: descrição longa é obrigatória para enviar.`;
      }
      if (!it.measureUnitId) {
        itemErrors.measureUnitId = 'Campo é obrigatório';
      }
      if (!it.costCenterId) {
        itemErrors.costCenterId = 'Campo é obrigatório';
      }

      if (Object.keys(itemErrors).length) {
        if (i !== currentItem) setCurrentItem(i);
        return { ...errors, ...itemErrors };
      }
    }

    return errors;
  }

  function buildPayload(targetStage: 'SOLICITANTE' | 'APROVADOR') {
    return {
      hotelIds,
      familyId,
      type: requestType,
      observation: observation.trim() || undefined,
      requestDescription: requestDescription.trim() || undefined,
      targetStage,
      items: items.map((it, idx) => ({
        productId: it.productId,
        descriptionShort: it.descriptionShort,
        descriptionLong: it.descriptionLong || undefined,
        measureUnitId: it.measureUnitId || undefined,
        costCenterId: it.costCenterId || undefined,
        source: it.source,
        itemValue: it.itemValue ? Number(it.itemValue) : undefined,
        purchaseQtyTotal: it.purchaseQtyTotal ? Number(it.purchaseQtyTotal) : undefined,
        unifiedCode: it.unifiedCode.trim() || undefined,
        legacyCode: it.legacyCode.trim() || undefined,
        law116: it.law116.trim() || undefined,
        productLink: it.productLink.trim() || undefined,
        itemObservation: it.itemObservation.trim() || undefined,
        sortOrder: idx,
      })),
    };
  }

  async function persist(targetStage: 'SOLICITANTE' | 'APROVADOR') {
    const strict = targetStage === 'APROVADOR';
    const errors = validateForm(strict);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError(null);
      setSendDialogOpen(false);
      return;
    }
    setFieldErrors({});

    if (requestType === 'INCLUSAO' && !observation.trim()) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.productId) continue;
        if (await findDuplicateInBase(it.descriptionShort)) {
          if (i !== currentItem) setCurrentItem(i);
          setFieldErrors({
            duplicate:
              'Já existem itens parecidos na base unificada (SAP). Ajuste a descrição deste item.',
            descriptionShort:
              'Descrição conflita com item já cadastrado na base unificada.',
          });
          setError(null);
          setSendDialogOpen(false);
          return;
        }
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = buildPayload(targetStage);
      const result = requestId
        ? await requestsApi.update(requestId, payload)
        : await requestsApi.create(payload);

      setRequestId(result.id);
      setSendDialogOpen(false);

      navigate('/produtos/caixa-de-entrada', {
        state: {
          flash:
            targetStage === 'APROVADOR'
              ? `Solicitação enviada ao aprovador — ${result.items.length} item(ns).`
              : `Rascunho na caixa do solicitante — ${result.items.length} item(ns).`,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar solicitação.');
    } finally {
      setSaving(false);
    }
  }

  const classificationErrors: ItemClassificationErrors = {
    groupId: fieldErrors.groupId,
    subgroupId: fieldErrors.subgroupId,
  };

  return (
    <section className="dados-item-page">
      <PageStageHeader title="Detalhes da Solicitação" stage="Formulário" />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="info-banner form-success">{success}</p> : null}

      {(requestDescription.trim() || observation.trim()) ? (
        <div className="solicitacao-resumo">
          <div className="solicitacao-resumo-cell">
            <p className="solicitacao-resumo-label">Descrição da solicitação</p>
            <RequestDescriptionBlock
              value={requestDescription}
              error={fieldErrors.requestDescription}
              readOnly={requestType !== 'INCLUSAO'}
              onChange={setRequestDescription}
              onClearError={() => clearFieldError('requestDescription')}
            />
          </div>
          <div className="solicitacao-resumo-cell">
            <p className="solicitacao-resumo-label">Observação da solicitação</p>
            <RequestDescriptionBlock
              value={observation}
              error={fieldErrors.observation}
              readOnly={false}
              uppercase={false}
              multiline
              emptyPlaceholder="Motivo da inclusão ou atualização deste produto"
              editAriaLabel="Alterar observação da solicitação"
              confirmTitle="Alterar observação da solicitação"
              confirmMessage="Deseja alterar a observação? Ela registra o motivo deste cadastro na etapa de busca."
              onChange={setObservation}
              onClearError={() => clearFieldError('observation')}
            />
          </div>
        </div>
      ) : null}

      <SolicitacaoPreForm
        hotels={hotels}
        families={families}
        hotelIds={hotelIds}
        familyId={familyId}
        familyLocked={familyLocked}
        hotelError={fieldErrors.hotelIds}
        familyError={fieldErrors.familyId}
        onHotelChange={setHotelIds}
        onFamilyChange={handleFamilyChange}
        onClearHotelError={() => clearFieldError('hotelIds')}
        onClearFamilyError={() => clearFieldError('familyId')}
      />

      {preFormComplete ? (
        <>
          <ItemFolderStrip
            items={folderItems}
            currentIndex={currentItem}
            groups={groups}
            subgroups={subgroups}
            onSelect={setCurrentItem}
            onAdd={addItem}
            onRemove={setRemoveIndex}
            allowAdd={requestType !== 'ALTERACAO'}
            allowRemove={requestType !== 'ALTERACAO'}
          />

          <ConfirmDialog
            open={removeIndex !== null}
            title="Remover item"
            message={
              removeIndex !== null
                ? `Deseja remover o item ${removeIndex + 1}${
                    items[removeIndex]?.descriptionShort
                      ? ` (${items[removeIndex].descriptionShort})`
                      : ''
                  }?`
                : ''
            }
            confirmLabel="Remover"
            onConfirm={confirmRemoveItem}
            onCancel={() => setRemoveIndex(null)}
          />

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
                  value={{
                    descriptionShort: item.descriptionShort,
                    costCenterId: item.costCenterId,
                    measureUnitId: item.measureUnitId,
                    itemValue: item.itemValue,
                    purchaseQtyTotal: item.purchaseQtyTotal,
                    unifiedCode: item.unifiedCode,
                    legacyCode: item.legacyCode,
                    law116: item.law116,
                  }}
                  costCenters={costCenters}
                  measureUnits={measureUnits}
                  errors={{
                    descriptionShort: fieldErrors.descriptionShort,
                    costCenterId: fieldErrors.costCenterId,
                    measureUnitId: fieldErrors.measureUnitId,
                    duplicate: fieldErrors.duplicate,
                  }}
                  similarPanel={
                    isInclusionItem && item.descriptionShort.trim().length >= 3 ? (
                      <SimilarProductsPanel
                        results={similarResults}
                        loading={similarLoading}
                        searched={similarSearched}
                        query={item.descriptionShort}
                        advisory
                        showHotelLegend
                      />
                    ) : null
                  }
                  onChange={onPrimaryChange}
                  onClearError={(key) => clearFieldError(key)}
                />

                <hr className="pdm-classification-divider" />

                <ItemClassificationFields
                  hideTitle
                  familyContext={selectedFamily}
                  value={{
                    groupId: item.groupId,
                    subgroupId: item.subgroupId,
                    source: item.source,
                  }}
                  groups={groups}
                  subgroups={subgroups}
                  errors={classificationErrors}
                  onChange={(patch) => {
                    patchClassification({
                      groupId: patch.groupId,
                      subgroupId: patch.subgroupId,
                      source: patch.source,
                    });
                  }}
                  onClearError={(key) => clearFieldError(key)}
                />
              </div>

              {item.groupId && item.subgroupId ? (
                <>
                  {attributes.length > 0 ? (
                    <div className="solicitacao-form-section">
                      <p className="form-section-title">Atributos desta família</p>
                      <div className="solicitacao-attributes-grid">
                        {attributes.map((attr) => (
                          <div className="form-field" key={attr.id}>
                            <label title={attr.examples.join(', ')}>
                              {attr.name}{attr.required ? ' *' : ''}
                            </label>
                            <input
                              placeholder={attr.examples[0] ?? ''}
                              onChange={onAttributeInput}
                              className="input-uppercase"
                            />
                            <span className="derived-field">
                              Ex.: {attr.examples.slice(0, 2).join(' · ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="info-banner" style={{ marginTop: 16 }}>
                      Sem atributos para esta família no catálogo de teste. Rode o seed ou troque a
                      família (base real Amarante substituirá depois).
                    </p>
                  )}

                  <ItemCompletionSection
                    value={{
                      productLink: item.productLink,
                      descriptionLong: item.descriptionLong,
                      itemObservation: item.itemObservation,
                      attachments: item.attachments,
                    }}
                    errors={{ descriptionLong: fieldErrors.descriptionLong }}
                    onChange={(patch) => onCompletionChange(patch)}
                    onClearError={() => clearFieldError('descriptionLong')}
                  />
                </>
              ) : (
                <p className="info-banner">
                  Selecione grupo e subgrupo deste item para continuar o cadastro.
                </p>
              )}
            </div>
          </article>

          <div className="search-actions">
            <button
              type="button"
              className="btn btn-outline"
              disabled={saving}
              onClick={() => void persist('SOLICITANTE')}
            >
              Salvar como rascunho
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => setSendDialogOpen(true)}
            >
              {saving ? 'Salvando…' : 'Enviar'}
            </button>
          </div>
        </>
      ) : (
        <p className="info-banner">
          Preencha as unidades e a família no bloco acima para exibir os itens e o formulário de cadastro.
        </p>
      )}

      <SendRequestDialog
        open={sendDialogOpen}
        title="Enviar solicitação"
        message="Tem certeza de que deseja enviar direto ao aprovador? A etapa irá para a caixa de entrada do aprovador e você não poderá mais alterar nada nesta solicitação. Se preferir revisar depois, salve como rascunho (etapa Solicitante)."
        cancelLabel="Cancelar"
        draftLabel="Salvar como rascunho"
        confirmLabel="Enviar ao aprovador"
        onCancel={() => setSendDialogOpen(false)}
        onDraft={() => void persist('SOLICITANTE')}
        onConfirm={() => void persist('APROVADOR')}
      />
    </section>
  );
}
