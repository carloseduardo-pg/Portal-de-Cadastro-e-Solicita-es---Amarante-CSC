import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ItemClassificationFields } from '../../components/ItemClassificationFields';
import { ItemPrimaryFields } from '../../components/ItemPrimaryFields';
import { ItemCompletionSection } from '../../components/ItemCompletionSection';
import { ItemFolderStrip } from '../../components/ItemFolderStrip';
import { PageStageHeader } from '../../components/PageStageHeader';
import { RequestDescriptionBlock } from '../../components/RequestDescriptionBlock';
import { RequestItemCompareTable } from '../../components/requests/RequestItemCompareTable';
import { RequestTimeline } from '../../components/RequestTimeline';
import { SolicitacaoPreForm } from '../../components/SolicitacaoPreForm';
import { findFamilyById, classificationFromFamily } from '../../lib/pdmFolders';
import {
  isExistingProductRequestType,
  requestStateLabel,
  requestTypeLabel,
} from '../../lib/requestLabels';
import { toFormUppercase } from '../../lib/formText';
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
  const [editNote, setEditNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [baseProduct, setBaseProduct] = useState<ProductBase | null>(null);
  const [baseLoading, setBaseLoading] = useState(false);

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
            groupId: '',
            subgroupId: '',
          } as Family)
        : undefined);
    const { groupId, subgroupId } = classificationFromFamily(
      fam && fam.groupId
        ? fam
        : families.find((f) => f.id === request.family?.id),
    );

    const resolved = families.find((f) => f.id === request.family?.id);
    const gId = resolved?.groupId ?? groupId;
    const sgId = resolved?.subgroupId ?? subgroupId;

    setItems(
      request.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        groupId: gId,
        subgroupId: sgId,
        descriptionShort: it.descriptionShort,
        descriptionLong: it.descriptionLong ?? '',
        measureUnitId: it.measureUnit?.id ?? '',
        costCenterId: it.costCenter?.id ?? '',
        source: (it.source === 'FOREIGN' ? 'FOREIGN' : 'NATIONAL') as ViewItem['source'],
        itemValue: it.itemValue != null ? String(it.itemValue) : '',
        purchaseQtyTotal: it.purchaseQtyTotal != null ? String(it.purchaseQtyTotal) : '',
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
    setCurrentItem(0);
  }, [request, families]);

  const hotelIds = useMemo(() => {
    if (!request) return [];
    if (request.hotels?.length) return request.hotels.map((rh) => rh.hotel.id);
    return request.hotel?.id ? [request.hotel.id] : [];
  }, [request]);

  useEffect(() => {
    if (!hotelIds.length) {
      setCostCenters([]);
      return;
    }
    void catalogApi.costCenters(hotelIds).then(setCostCenters).catch(console.error);
  }, [hotelIds]);

  const item = items[currentItem] ?? items[0];
  const requestItem = request?.items[currentItem] ?? request?.items[0];
  const selectedFamily = findFamilyById(families, request?.family?.id ?? '');
  const familyId = request?.family?.id ?? '';

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
  const canSendToApprover = isSolicitante || isReturnToRequester;
  const canConcludeStage = canSendToApprover || isApprover;
  const approverEditable = isApprover;

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

  function patchCurrentItem(patch: Partial<ViewItem>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === currentItem ? { ...it, ...patch } : it)),
    );
  }

  async function reloadRequest() {
    if (!id) return;
    const r = await requestsApi.get(id);
    setRequest(r);
  }

  async function saveApproverChanges() {
    if (!request) return;
    setBusy(true);
    try {
      await requestsApi.update(request.id, {
        editNote: editNote.trim() || 'Aprovador alterou campos da solicitação.',
        items: items.map((it, idx) => ({
          productId: it.productId ?? undefined,
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
          productLink: it.productLink.trim() || it.productLinks[0]?.trim() || undefined,
          productLinks: it.productLinks.map((l) => l.trim()).filter(Boolean),
          itemObservation: it.itemObservation.trim() || undefined,
          sortOrder: idx,
        })),
      });
      setEditNote('');
      await reloadRequest();
      alert('Alterações salvas e registradas na timeline.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao salvar alterações.');
    } finally {
      setBusy(false);
    }
  }

  async function sendToApprover() {
    if (!request) return;
    if (!stageComment.trim()) {
      alert('Escreva um comentário sobre a conclusão desta etapa antes de prosseguir.');
      return;
    }
    setBusy(true);
    try {
      await requestsApi.sendToApprover(request.id, stageComment.trim());
      alert('Solicitação enviada ao aprovador.');
      navigate('/produtos/caixa-de-entrada');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao enviar ao aprovador.');
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
        {request.family ? ` · ${request.family.code} — ${request.family.name}` : ''}
        {` · ${request.items.length} item(ns)`}
        {request.requester?.name ? ` · ${request.requester.name}` : ''}
        {request.hotels?.length
          ? ` · Unidades: ${request.hotels.map((h) => h.hotel.code).join(', ')}`
          : request.hotel
            ? ` · ${request.hotel.code}`
            : ''}
      </p>

      {(request.requestDescription?.trim() || request.observation?.trim()) ? (
        <div className="solicitacao-resumo">
          <div className="solicitacao-resumo-cell">
            <p className="solicitacao-resumo-label">Descrição da solicitação</p>
            <RequestDescriptionBlock
              value={request.requestDescription ?? ''}
              readOnly
              onChange={() => undefined}
            />
          </div>
          <div className="solicitacao-resumo-cell">
            <p className="solicitacao-resumo-label">Observação da solicitação</p>
            <RequestDescriptionBlock
              value={request.observation ?? ''}
              readOnly
              uppercase={false}
              multiline
              onChange={() => undefined}
            />
          </div>
        </div>
      ) : null}

      <SolicitacaoPreForm
        hotels={hotels}
        families={families}
        hotelIds={hotelIds}
        familyId={familyId}
        readOnly
        onHotelChange={() => undefined}
        onFamilyChange={() => undefined}
      />

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
        addLockedLabel="Visualização — use as pastas para navegar entre itens"
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
              readOnly={!approverEditable}
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
              onChange={
                approverEditable
                  ? (patch) => {
                      if (patch.descriptionShort !== undefined) {
                        patch.descriptionShort = toFormUppercase(patch.descriptionShort);
                      }
                      if (patch.legacyCode !== undefined) {
                        patch.legacyCode = toFormUppercase(patch.legacyCode);
                      }
                      patchCurrentItem(patch);
                    }
                  : undefined
              }
            />

            <hr className="pdm-classification-divider" />

            <ItemClassificationFields
              hideTitle
              readOnly={!approverEditable}
              familyContext={selectedFamily}
              value={{
                groupId: item.groupId,
                subgroupId: item.subgroupId,
                source: item.source,
              }}
              groups={groups}
              subgroups={subgroups}
              onChange={approverEditable ? (patch) => patchCurrentItem(patch) : undefined}
            />
          </div>

          <ItemCompletionSection
            readOnly={!approverEditable}
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
              approverEditable
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

          {isApprover ? (
            <div className="solicitacao-form-section detalhes-ncm-block">
              <p className="form-section-title">NCM — candidatos do histórico</p>
              <div className="ncm-warning">
                Nenhum NCM é gravado sem você confirmar. (ITM-09)
              </div>
              {item.ncmConfirmed && item.ncmCode ? (
                <p className="info-banner form-success">
                  NCM confirmado: <strong>{item.ncmCode}</strong>
                </p>
              ) : (
                <div className="ncm-list">
                  {(item.ncmSuggestions ?? []).map((s) => (
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
                        <strong>{s.ncm}</strong> — usado {s.usageCount} vezes (score{' '}
                        {Number(s.score).toFixed(2)})
                      </span>
                    </label>
                  ))}
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
                      onChange={(e) => {
                        setCustomNcm((prev) => ({ ...prev, [item.id]: e.target.value }));
                        setSelectedNcm((prev) => ({ ...prev, [item.id]: e.target.value }));
                      }}
                      placeholder="Digite o NCM"
                    />
                  </label>
                </div>
              )}
            </div>
          ) : item.ncmCode ? (
            <p className="info-banner" style={{ marginTop: 16 }}>
              NCM: <strong>{item.ncmCode}</strong>
              {item.ncmConfirmed ? ' (confirmado)' : ''}
            </p>
          ) : null}
        </div>
      </article>

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
            disabled={busy}
            onClick={() => void saveApproverChanges()}
          >
            Salvar alterações do aprovador
          </button>
        </div>
      ) : null}

      {canConcludeStage ? (
        <div className="stage-conclude-block">
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
        {isDraft ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              navigate('/produtos/dados-do-item', { state: { requestId: request.id } })
            }
          >
            Continuar edição
          </button>
        ) : null}
        {canSendToApprover ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void sendToApprover()}
          >
            Enviar formulário para aprovador
          </button>
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
            <button type="button" className="btn btn-outline" disabled>
              Recusar solicitação
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
        {!isDraft && !canSendToApprover && !isApprover ? (
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
    </section>
  );
}
