import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertDialog } from '../../components/AlertDialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Icon } from '../../components/Icon';
import { PageStageHeader } from '../../components/PageStageHeader';
import { ProductStatusDot } from '../../components/ProductStatusDot';
import { SendRequestDialog } from '../../components/SendRequestDialog';
import { toFormUppercase } from '../../lib/formText';
import { formatNcmDisplay } from '../../lib/ncm';
import { catalogApi, productsApi, requestsApi } from '../../lib/resources';
import type {
  CatalogGroup,
  CatalogSubgroup,
  CostCenter,
  Hotel,
  MeasureUnit,
  ProductBase,
} from '../../lib/types';
import {
  buildFieldDefs,
  diffFields,
  displayValue,
  FIELD_SECTIONS,
  valuesFromProduct,
  type ExistingItemField,
  type ExistingItemValues,
  type FieldDef,
} from './produtoExistenteFields';
import './produtos.css';
import './produtoExistente.css';
import '../../components/ProductStatusDot.css';
import '../../components/FormField.css';

type ExistingRequestType = 'ALTERACAO' | 'BLOQUEIO';

type NavState = {
  existingProductId?: string;
  type?: ExistingRequestType;
  /** Reabertura de rascunho já criado. */
  requestId?: string;
};

function fieldDomId(key: ExistingItemField) {
  return `campo-${key}`;
}

/**
 * Tela única de alteração e bloqueio: abre com o item exatamente como está
 * cadastrado na base. Alteração libera edição campo a campo (lápis) e exige
 * ao menos uma mudança; bloqueio é somente leitura e exige escopo + motivo.
 */
export function ProdutoExistentePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = (location.state ?? {}) as NavState;

  const requestType: ExistingRequestType = nav.type ?? 'ALTERACAO';
  const isBloqueio = requestType === 'BLOQUEIO';

  const [product, setProduct] = useState<ProductBase | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | undefined>(nav.requestId);
  const [requestCode, setRequestCode] = useState<string | undefined>();

  const [baseline, setBaseline] = useState<ExistingItemValues | null>(null);
  const [values, setValues] = useState<ExistingItemValues | null>(null);
  const [editing, setEditing] = useState<Set<ExistingItemField>>(new Set());

  const [observation, setObservation] = useState('');
  const [blockRequisition, setBlockRequisition] = useState(false);
  const [blockPurchase, setBlockPurchase] = useState(false);

  const [subgroups, setSubgroups] = useState<CatalogSubgroup[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [measureUnits, setMeasureUnits] = useState<MeasureUnit[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);

  const [saving, setSaving] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [discardField, setDiscardField] = useState<FieldDef | null>(null);

  const fixedAsset =
    product?.itemKind === 'FIXED_ASSET' || Boolean(product?.fixedAsset);
  // ITM-11: o lote segue a família do próprio item; trocar de família não é
  // alteração, é outra solicitação.
  const familyId =
    product?.group?.subgroup?.familyId ?? product?.family?.id ?? '';
  const productHotelIds = useMemo(
    () => product?.hotels?.map((ph) => ph.hotel.id) ?? [],
    [product],
  );
  // A base SAP quase nunca traz vínculo de unidade; sem isso a solicitação
  // abrange todas as unidades ativas (a aprovação não grava esse vínculo).
  const allHotelsFallback = Boolean(product) && productHotelIds.length === 0;
  const hotelIds = useMemo(
    () => (allHotelsFallback ? hotels.map((h) => h.id) : productHotelIds),
    [allHotelsFallback, hotels, productHotelIds],
  );

  useEffect(() => {
    void Promise.all([
      catalogApi.subgroups({ pageSize: 500 }).then((r) => setSubgroups(r.data)),
      catalogApi.groups({ pageSize: 500 }).then((r) => setGroups(r.data)),
      catalogApi.measureUnits().then((r) => setMeasureUnits(r.data)),
      catalogApi.hotels({ status: 'active' }).then(setHotels),
    ]).catch(console.error);
  }, []);

  useEffect(() => {
    if (!hotelIds.length) {
      setCostCenters([]);
      return;
    }
    void catalogApi.costCenters(hotelIds).then(setCostCenters).catch(console.error);
  }, [hotelIds]);

  // Rascunho reaberto: recupera o que já havia sido pedido sobre o mesmo produto.
  useEffect(() => {
    if (!nav.requestId) return;
    void requestsApi
      .get(nav.requestId)
      .then(async (req) => {
        setRequestId(req.id);
        setRequestCode(req.code);
        setObservation(req.observation ?? '');
        setBlockRequisition(Boolean(req.blockRequisition));
        setBlockPurchase(Boolean(req.blockPurchase));
        const item = req.items[0];
        if (!item?.productId) {
          setLoadError('Este rascunho não está vinculado a um produto da base.');
          return;
        }
        const p = await productsApi.get(item.productId);
        setProduct(p);
        const base = valuesFromProduct(p);
        setBaseline(base);
        setValues({
          ...base,
          descriptionShort: item.descriptionShort || base.descriptionShort,
          descriptionLong: item.descriptionLong ?? base.descriptionLong,
          unifiedCode: item.unifiedCode ?? base.unifiedCode,
          legacyCode: item.legacyCode ?? base.legacyCode,
          ncmCode: item.ncmCode?.trim() ?? base.ncmCode,
          subgroupId:
            item.group?.subgroupId ?? item.group?.subgroup?.id ?? base.subgroupId,
          groupId: item.groupId ?? item.group?.id ?? base.groupId,
          source: item.source ?? base.source,
          measureUnitId: item.measureUnit?.id ?? base.measureUnitId,
          costCenterId: item.costCenter?.id ?? base.costCenterId,
          law116: item.law116 ?? base.law116,
          productLink: item.productLink ?? base.productLink,
          itemObservation: item.itemObservation ?? base.itemObservation,
          physicalLocation: item.physicalLocation ?? base.physicalLocation,
          assetTag: item.assetTag ?? base.assetTag,
        });
      })
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : 'Falha ao abrir o rascunho.'),
      );
  }, [nav.requestId]);

  useEffect(() => {
    if (nav.requestId || !nav.existingProductId) return;
    void productsApi
      .get(nav.existingProductId)
      .then((p) => {
        setProduct(p);
        const base = valuesFromProduct(p);
        setBaseline(base);
        setValues(base);
      })
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : 'Falha ao carregar o produto.'),
      );
  }, [nav.existingProductId, nav.requestId]);

  const fieldDefs = useMemo(
    () =>
      buildFieldDefs({
        fixedAsset,
        subgroups,
        groups,
        measureUnits,
        costCenters,
        subgroupId: values?.subgroupId ?? '',
        familyId,
      }),
    [
      fixedAsset,
      subgroups,
      groups,
      measureUnits,
      costCenters,
      values?.subgroupId,
      familyId,
    ],
  );

  const changes = useMemo(
    () => (baseline && values ? diffFields(fieldDefs, baseline, values) : []),
    [fieldDefs, baseline, values],
  );

  if (loadError) {
    return (
      <section>
        <PageStageHeader title="Detalhes da Solicitação" stage="Formulário" />
        <p className="form-error">{loadError}</p>
      </section>
    );
  }

  if (!product || !values || !baseline) {
    return (
      <section>
        <PageStageHeader title="Detalhes da Solicitação" stage="Formulário" />
        <p className="info-banner">Carregando o cadastro do item…</p>
      </section>
    );
  }

  function patch(key: ExistingItemField, raw: string, def: FieldDef) {
    const next = def.uppercase ? toFormUppercase(raw) : raw;
    setValues((prev) => {
      if (!prev) return prev;
      // Trocar de subgrupo invalida a folha SAP escolhida.
      if (key === 'subgroupId' && next !== prev.subgroupId) {
        return { ...prev, subgroupId: next, groupId: '' };
      }
      return { ...prev, [key]: next };
    });
  }

  function toggleEdit(key: ExistingItemField, on: boolean) {
    setEditing((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function revertField(def: FieldDef) {
    setValues((prev) =>
      prev && baseline ? { ...prev, [def.key]: baseline[def.key] } : prev,
    );
    toggleEdit(def.key, false);
    setDiscardField(null);
  }

  /** Sobe até o campo no formulário e abre a edição (ação "editar" do resumo). */
  function focusField(def: FieldDef) {
    toggleEdit(def.key, true);
    window.requestAnimationFrame(() => {
      const el = document.getElementById(fieldDomId(def.key));
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    });
  }

  function setBlockScope(scope: 'REQUISITION' | 'PURCHASE' | 'BOTH') {
    if (scope === 'BOTH') {
      const both = !(blockRequisition && blockPurchase);
      setBlockRequisition(both);
      setBlockPurchase(both);
      return;
    }
    if (scope === 'REQUISITION') setBlockRequisition((v) => !v);
    else setBlockPurchase((v) => !v);
  }

  function validate(): string | null {
    if (isBloqueio) {
      if (!blockRequisition && !blockPurchase) {
        return 'Marque ao menos um escopo do bloqueio: requisição, compras ou ambos.';
      }
      if (!observation.trim()) {
        return 'Informe o motivo do bloqueio.';
      }
      return null;
    }
    if (!changes.length) {
      return 'Nenhum campo foi alterado. Edite ao menos um dado do item para pedir a alteração.';
    }
    if (!observation.trim()) {
      return 'Justifique a alteração na observação.';
    }
    if (!values?.groupId) {
      return 'Selecione o grupo de itens (folha SAP).';
    }
    return null;
  }

  function buildPayload(targetStage: 'SOLICITANTE' | 'APROVADOR') {
    const v = values as ExistingItemValues;
    const p = product as ProductBase;
    return {
      hotelIds,
      familyId,
      type: requestType,
      fixedAsset,
      blockRequisition: isBloqueio ? blockRequisition : false,
      blockPurchase: isBloqueio ? blockPurchase : false,
      observation: observation.trim(),
      requestDescription: v.descriptionShort,
      targetStage,
      items: [
        {
          productId: p.id,
          groupId: v.groupId || undefined,
          descriptionShort: v.descriptionShort,
          descriptionLong: v.descriptionLong || undefined,
          measureUnitId: fixedAsset ? undefined : v.measureUnitId || undefined,
          costCenterId: v.costCenterId || undefined,
          source: (v.source === 'FOREIGN' ? 'FOREIGN' : 'NATIONAL') as
            | 'NATIONAL'
            | 'FOREIGN',
          unitQuantity: fixedAsset ? 1 : undefined,
          physicalLocation: fixedAsset ? v.physicalLocation || undefined : undefined,
          assetTag: fixedAsset ? v.assetTag || undefined : undefined,
          acquisitionValue:
            fixedAsset && v.acquisitionValue ? Number(v.acquisitionValue) : undefined,
          acquisitionDate: fixedAsset ? v.acquisitionDate || undefined : undefined,
          usefulLifeMonths:
            fixedAsset && v.usefulLifeMonths
              ? Math.floor(Number(v.usefulLifeMonths))
              : undefined,
          depreciationRate:
            fixedAsset && v.depreciationRate ? Number(v.depreciationRate) : undefined,
          supplierDocument: fixedAsset ? v.supplierDocument || undefined : undefined,
          invoiceNumber: fixedAsset ? v.invoiceNumber || undefined : undefined,
          unifiedCode: v.unifiedCode || undefined,
          legacyCode: v.legacyCode || undefined,
          law116: fixedAsset ? undefined : v.law116 || undefined,
          productLink: v.productLink || undefined,
          productLinks: v.productLink ? [v.productLink] : [],
          itemObservation: v.itemObservation || undefined,
          ncmCode: v.ncmCode || undefined,
          sortOrder: 0,
        },
      ],
    };
  }

  async function persist(targetStage: 'SOLICITANTE' | 'APROVADOR') {
    const problem = validate();
    if (problem) {
      setSendDialogOpen(false);
      setAlert(problem);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(targetStage);
      const result = requestId
        ? await requestsApi.update(requestId, payload)
        : await requestsApi.create(payload);
      setRequestId(result.id);
      setRequestCode(result.code);
      setSendDialogOpen(false);
      const codeLabel = result.code ? ` ${result.code}` : '';
      navigate('/produtos/caixa-de-entrada', {
        state: {
          flash:
            targetStage === 'APROVADOR'
              ? `Solicitação${codeLabel} de ${isBloqueio ? 'bloqueio' : 'alteração'} enviada ao aprovador.`
              : `Rascunho${codeLabel} de ${isBloqueio ? 'bloqueio' : 'alteração'} salvo na caixa do solicitante.`,
        },
      });
    } catch (e) {
      setSendDialogOpen(false);
      setAlert(e instanceof Error ? e.message : 'Falha ao salvar a solicitação.');
    } finally {
      setSaving(false);
    }
  }

  const bothChecked = blockRequisition && blockPurchase;
  const scopeLabel = bothChecked
    ? 'Bloqueio total — requisição e compras'
    : blockRequisition
      ? 'Bloqueio parcial — requisição'
      : blockPurchase
        ? 'Bloqueio parcial — compras'
        : 'Escopo ainda não definido';

  return (
    <section className="produto-existente-page">
      <PageStageHeader
        title={requestCode ? `Solicitação ${requestCode}` : 'Detalhes da Solicitação'}
        stage={isBloqueio ? 'Bloqueio' : 'Alteração'}
      />

      <article className="produto-existente-identity">
        <p className="produto-existente-identity-title">
          <ProductStatusDot active={product.active} blockState={product.blockState} />
          {product.descriptionShort}
        </p>
        <dl className="produto-existente-identity-grid">
          <div>
            <dt>Código legado</dt>
            <dd>{product.legacyCode || '—'}</dd>
          </div>
          <div>
            <dt>Código unificado</dt>
            <dd>{product.unifiedCode || '—'}</dd>
          </div>
          <div>
            <dt>Código SAP</dt>
            <dd>{product.sapCode || '—'}</dd>
          </div>
          <div>
            <dt>NCM cadastrado</dt>
            <dd>{formatNcmDisplay(product.ncmCode) || '—'}</dd>
          </div>
          <div>
            <dt>Família</dt>
            <dd>{product.family?.name || '—'}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{fixedAsset ? 'Ativo fixo' : 'Uso e consumo'}</dd>
          </div>
          <div>
            <dt>Unidades</dt>
            <dd>
              {allHotelsFallback
                ? 'Todas as unidades'
                : (product.hotels ?? [])
                    .map((ph) => ph.hotel.code || ph.hotel.name)
                    .join(', ') || '—'}
            </dd>
          </div>
        </dl>
      </article>

      <p className="info-banner">
        {isBloqueio ? (
          <>
            Formulário <strong>somente leitura</strong>: o bloqueio não altera o cadastro.
            Marque o escopo e informe o motivo para continuar.
          </>
        ) : (
          <>
            O formulário abre com o item <strong>como está cadastrado</strong>. Use o lápis
            para editar o que precisa mudar — pelo menos um campo deve ser alterado.
          </>
        )}
      </p>

      {isBloqueio ? (
        <fieldset className="bloqueio-scope">
          <legend>Escopo do bloqueio *</legend>
          <p className="bloqueio-scope-hint">
            Uma flag = bloqueio parcial. As duas = bloqueio total (o item fica inativo na
            base).
          </p>
          <div className="bloqueio-scope-options">
            <label>
              <input
                type="checkbox"
                checked={blockRequisition}
                onChange={() => setBlockScope('REQUISITION')}
              />
              Requisição
            </label>
            <label>
              <input
                type="checkbox"
                checked={blockPurchase}
                onChange={() => setBlockScope('PURCHASE')}
              />
              Compras
            </label>
            <label>
              <input
                type="checkbox"
                checked={bothChecked}
                onChange={() => setBlockScope('BOTH')}
              />
              Ambos
            </label>
          </div>
          <p
            className={`bloqueio-scope-summary${
              bothChecked ? ' bloqueio-scope-summary--total' : ''
            }`}
          >
            {scopeLabel}
          </p>
        </fieldset>
      ) : null}

      {FIELD_SECTIONS.map((section) => {
        const sectionFields = fieldDefs.filter((f) => f.section === section.id);
        if (!sectionFields.length) return null;
        return (
          <article className="produto-existente-card" key={section.id}>
            <header className="produto-existente-card-header">
              <h2>{section.title}</h2>
            </header>
            <div className="produto-existente-fields">
              {sectionFields.map((def) => {
                const changed = changes.some((c) => c.key === def.key);
                const isEditing = editing.has(def.key);
                const value = values[def.key];
                return (
                  <div
                    key={def.key}
                    id={fieldDomId(def.key)}
                    className={`produto-existente-field${
                      changed ? ' produto-existente-field--changed' : ''
                    }`}
                  >
                    <div className="produto-existente-field-head">
                      <span className="produto-existente-field-label">{def.label}</span>
                      {!isBloqueio ? (
                        isEditing ? (
                          <button
                            type="button"
                            className="produto-existente-icon-btn"
                            aria-label={`Concluir edição de ${def.label}`}
                            onClick={() => toggleEdit(def.key, false)}
                          >
                            <Icon name="check" size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="produto-existente-icon-btn"
                            aria-label={`Editar ${def.label}`}
                            onClick={() => focusField(def)}
                          >
                            <Icon name="pencil" size={16} />
                          </button>
                        )
                      ) : null}
                    </div>

                    {isEditing && !isBloqueio ? (
                      def.kind === 'select' ? (
                        <select
                          value={value}
                          onChange={(e) => patch(def.key, e.target.value, def)}
                        >
                          <option value="">Selecione…</option>
                          {def.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : def.kind === 'textarea' ? (
                        <textarea
                          rows={3}
                          className={def.uppercase ? 'input-uppercase' : undefined}
                          value={value}
                          onChange={(e) => patch(def.key, e.target.value, def)}
                        />
                      ) : (
                        <input
                          type={
                            def.kind === 'number'
                              ? 'number'
                              : def.kind === 'date'
                                ? 'date'
                                : 'text'
                          }
                          className={def.uppercase ? 'input-uppercase' : undefined}
                          value={value}
                          onChange={(e) => patch(def.key, e.target.value, def)}
                        />
                      )
                    ) : (
                      <p className="produto-existente-field-value">
                        {displayValue(def, value)}
                      </p>
                    )}

                    {changed ? (
                      <p className="produto-existente-field-origin">
                        Cadastro atual: {displayValue(def, baseline[def.key])}
                      </p>
                    ) : null}
                    {def.hint ? (
                      <p className="produto-existente-field-hint">{def.hint}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}

      {!isBloqueio ? (
        <article className="produto-existente-card produto-existente-summary">
          <header className="produto-existente-card-header">
            <h2>Resumo da alteração</h2>
            <span className="produto-existente-summary-count">
              {changes.length} campo(s) alterado(s)
            </span>
          </header>
          {changes.length ? (
            <ul className="produto-existente-summary-list">
              {changes.map((def) => (
                <li key={def.key}>
                  <div className="produto-existente-summary-text">
                    <strong>{def.label}</strong>
                    <span>
                      <span className="produto-existente-summary-before">
                        {displayValue(def, baseline[def.key])}
                      </span>
                      {' → '}
                      <span className="produto-existente-summary-after">
                        {displayValue(def, values[def.key])}
                      </span>
                    </span>
                  </div>
                  <div className="produto-existente-summary-actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => focusField(def)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="produto-existente-icon-btn produto-existente-icon-btn--danger"
                      aria-label={`Descartar alteração de ${def.label}`}
                      onClick={() => setDiscardField(def)}
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="info-banner">
              Nenhum campo alterado ainda. Use o lápis no formulário acima — a alteração só
              pode ser enviada com ao menos uma mudança.
            </p>
          )}
        </article>
      ) : null}

      <article className="produto-existente-card">
        <header className="produto-existente-card-header">
          <h2>{isBloqueio ? 'Motivo do bloqueio' : 'Justificativa da alteração'}</h2>
        </header>
        <div className="produto-existente-observation">
          <label htmlFor="observacao-solicitacao">
            {isBloqueio
              ? 'Por que este item deve ser bloqueado? *'
              : 'Por que estas alterações são necessárias? *'}
          </label>
          <textarea
            id="observacao-solicitacao"
            rows={4}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder={
              isBloqueio
                ? 'Ex.: item descontinuado pelo fornecedor; substituído pelo código 2015.'
                : 'Ex.: descrição divergente da nota fiscal; unidade de medida errada.'
            }
          />
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

      <SendRequestDialog
        open={sendDialogOpen}
        title={isBloqueio ? 'Enviar bloqueio' : 'Enviar alteração'}
        message={
          isBloqueio
            ? `Escopo: ${scopeLabel}. Enviar ao aprovador para análise?`
            : `${changes.length} campo(s) alterado(s). Enviar ao aprovador para análise?`
        }
        cancelLabel="Cancelar"
        draftLabel="Salvar como rascunho"
        confirmLabel="Enviar ao aprovador"
        onCancel={() => setSendDialogOpen(false)}
        onDraft={() => void persist('SOLICITANTE')}
        onConfirm={() => void persist('APROVADOR')}
      />

      <ConfirmDialog
        open={discardField !== null}
        title="Descartar alteração"
        message={
          discardField
            ? `Deseja descartar a alteração de "${discardField.label}" e voltar ao valor cadastrado na base?`
            : ''
        }
        confirmLabel="Descartar"
        onConfirm={() => discardField && revertField(discardField)}
        onCancel={() => setDiscardField(null)}
      />

      <AlertDialog
        open={Boolean(alert)}
        title="Não foi possível continuar"
        message={alert ?? ''}
        onClose={() => setAlert(null)}
      />
    </section>
  );
}
