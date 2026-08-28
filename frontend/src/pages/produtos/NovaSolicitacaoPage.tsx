import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../components/FormField';
import { PageStageHeader } from '../../components/PageStageHeader';
import { SimilarProductsPanel } from '../../components/SimilarProductsPanel';
import { useSimilarProducts } from '../../hooks/useSimilarProducts';
import { minLengthText, requiredText } from '../../lib/formValidation';
import {
  hasExactProductMatch,
  findExactProductMatch,
  exactDuplicateMessage,
  countExactDescriptionMatches,
} from '../../lib/productMatch';
import { isExistingProductRequestType } from '../../lib/requestLabels';
import { toFormUppercase } from '../../lib/formText';
import { productsApi } from '../../lib/resources';
import type { ProductSearchResult } from '../../lib/types';
import './produtos.css';
import '../../components/SimilarProductsPanel.css';
import '../../components/FormField.css';
import '../../components/SolicitacaoPreForm.css';

type RequestTypeChoice =
  | 'INCLUSAO'
  | 'ALTERACAO'
  | 'BLOQUEIO_PARCIAL'
  | 'BLOQUEIO_TOTAL';

/** Decisão do usuário quando há match 100% em ativo fixo. */
type AfExactChoice = 'more' | 'different' | null;

type SearchFieldErrors = {
  type?: string;
  itemKind?: string;
  query?: string;
  observation?: string;
  selectedProduct?: string;
  afExact?: string;
};

/**
 * Tela 1 — Tipo da solicitação + verificação na base unificada (P5).
 */
export function NovaSolicitacaoPage() {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<RequestTypeChoice | ''>('');
  const [fixedAsset, setFixedAsset] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [observation, setObservation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SearchFieldErrors>({});
  const [afExactChoice, setAfExactChoice] = useState<AfExactChoice>(null);
  const [afExactCount, setAfExactCount] = useState(0);
  const [afSampleId, setAfSampleId] = useState<string | undefined>();

  const searchEnabled = Boolean(requestType);
  const needsExistingProduct = requestType ? isExistingProductRequestType(requestType) : false;
  const isInclusao = requestType === 'INCLUSAO';
  const kindChosen = !isInclusao || fixedAsset !== null;
  const itemKind =
    isInclusao && fixedAsset === true
      ? ('FIXED_ASSET' as const)
      : isInclusao && fixedAsset === false
        ? ('CONSUMPTION' as const)
        : undefined;

  const { results, loading, searched, hasSimilar } = useSimilarProducts({
    query,
    enabled: searchEnabled && kindChosen,
    itemKind,
  });

  const exactHit = isInclusao ? findExactProductMatch(results, query) : null;
  const exactMatch = Boolean(exactHit);
  /** Consumo: match 100% bloqueia. Ativo fixo: não bloqueia — oferece atalho. */
  const blocksOnExact = exactMatch && fixedAsset !== true;
  const consumptionDupMessage = exactDuplicateMessage(exactHit);
  const showAfExactOffer = isInclusao && fixedAsset === true && exactMatch;

  useEffect(() => {
    setAfExactChoice(null);
    setAfExactCount(0);
    setAfSampleId(undefined);
    if (!showAfExactOffer || query.trim().length < 3) return;

    let cancelled = false;
    void productsApi
      .exactCount({ q: query, itemKind: 'FIXED_ASSET' })
      .then((r) => {
        if (cancelled) return;
        setAfExactCount(r.count);
        setAfSampleId(r.sample?.id);
      })
      .catch(() => {
        if (cancelled) return;
        setAfExactCount(0);
        setAfSampleId(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [showAfExactOffer, query]);

  function handleTypeChange(next: RequestTypeChoice) {
    setRequestType(next);
    setSelectedProduct(null);
    setQuery('');
    setObservation('');
    setFieldErrors({});
    setAfExactChoice(null);
    if (next !== 'INCLUSAO') {
      setFixedAsset(null);
    }
  }

  function handleKindChange(next: boolean) {
    setFixedAsset(next);
    setSelectedProduct(null);
    setQuery('');
    setObservation('');
    setAfExactChoice(null);
    setFieldErrors((prev) => ({ ...prev, itemKind: undefined, query: undefined, afExact: undefined }));
  }

  function validateContinue(): SearchFieldErrors {
    const errors: SearchFieldErrors = {};

    if (!requestType) {
      errors.type = 'Selecione o tipo da solicitação antes de continuar.';
      return errors;
    }

    if (isInclusao && fixedAsset === null) {
      errors.itemKind = 'Selecione Uso e consumo ou Ativo fixo antes de continuar.';
      return errors;
    }

    const queryError = minLengthText(
      query,
      3,
      needsExistingProduct
        ? 'Busque o produto existente com ao menos 3 caracteres.'
        : 'Informe ao menos 3 caracteres para identificar o produto.',
    );
    if (queryError) errors.query = queryError;

    if (blocksOnExact) {
      errors.query = consumptionDupMessage;
    }

    if (showAfExactOffer && !afExactChoice) {
      errors.afExact =
        'Já existem unidades deste bem. Escolha cadastrar mais unidades ou indicar que é um bem diferente.';
    }

    if (needsExistingProduct && !selectedProduct) {
      errors.selectedProduct =
        'Selecione na lista o produto da base vinculado a esta solicitação.';
    }

    const observationError = requiredText(
      observation,
      needsExistingProduct
        ? requestType === 'ALTERACAO'
          ? 'Descreva o que precisa ser atualizado neste produto.'
          : 'Descreva o motivo do bloqueio solicitado.'
        : hasSimilar && !exactMatch
          ? 'Justifique na observação por que este produto precisa ser cadastrado mesmo com itens parecidos na base.'
          : showAfExactOffer && afExactChoice === 'more'
            ? 'Descreva o motivo do cadastro de unidades adicionais deste bem.'
            : 'Descreva o motivo da inclusão deste produto.',
    );
    if (observationError) errors.observation = observationError;

    return errors;
  }

  function continuarParaFormulario() {
    const errors = validateContinue();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (needsExistingProduct && selectedProduct) {
      navigate('/produtos/dados-do-item', {
        state: {
          searchQuery: selectedProduct.descriptionShort,
          observation: observation.trim(),
          existingProductId: selectedProduct.id,
          hotelIds: [],
          type: requestType,
          fixedAsset: false,
        },
      });
      return;
    }

    const isAf = fixedAsset === true;
    navigate('/produtos/dados-do-item', {
      state: {
        searchQuery: query.trim(),
        observation: observation.trim(),
        hotelIds: [],
        type: 'INCLUSAO' as const,
        fixedAsset: isAf,
        /** Prefill a partir de um bem existente (novas unidades — ainda INCLUSAO). */
        templateProductId:
          isAf && afExactChoice === 'more' ? afSampleId ?? selectedProduct?.id : undefined,
        afExactChoice: isAf ? afExactChoice : undefined,
      },
    });
  }

  const typeOptions: { value: RequestTypeChoice; title: string; hint: string }[] = [
    {
      value: 'INCLUSAO',
      title: 'Inclusão',
      hint: 'Cadastro de item(ns) que ainda não existem na base unificada.',
    },
    {
      value: 'ALTERACAO',
      title: 'Alteração',
      hint: 'Atualização de um produto já cadastrado (1 produto por solicitação).',
    },
    {
      value: 'BLOQUEIO_PARCIAL',
      title: 'Bloqueio parcial',
      hint: 'Bloqueio parcial de um produto existente na base (1 produto por solicitação).',
    },
    {
      value: 'BLOQUEIO_TOTAL',
      title: 'Bloqueio total',
      hint: 'Bloqueio total de um produto existente na base (1 produto por solicitação).',
    },
  ];

  const canShowSearch = Boolean(requestType) && kindChosen;

  return (
    <section>
      <PageStageHeader title="Detalhes da Solicitação" stage="Busca" />

      <FormField
        label="Tipo da solicitação"
        required
        error={fieldErrors.type}
        hint="Defina o tipo antes da busca — isso muda o fluxo da solicitação."
      >
        <div className="request-type-choice request-type-choice--grid" role="radiogroup" aria-label="Tipo da solicitação">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={requestType === opt.value}
              className={`request-type-option${requestType === opt.value ? ' request-type-option--active' : ''}`}
              onClick={() => handleTypeChange(opt.value)}
            >
              <strong>{opt.title}</strong>
              <span>{opt.hint}</span>
            </button>
          ))}
        </div>
      </FormField>

      {isInclusao ? (
        <FormField
          label="Tipo de item"
          required
          error={fieldErrors.itemKind}
          hint="Uso e consumo ou ativo fixo muda o formulário e o caminho de aprovação."
        >
          <div className="item-kind-segment" role="radiogroup" aria-label="Tipo de item">
            <button
              type="button"
              role="radio"
              aria-checked={fixedAsset === false}
              className={`item-kind-segment__btn${fixedAsset === false ? ' item-kind-segment__btn--active' : ''}`}
              onClick={() => handleKindChange(false)}
            >
              Uso e consumo
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={fixedAsset === true}
              className={`item-kind-segment__btn${fixedAsset === true ? ' item-kind-segment__btn--active' : ''}`}
              onClick={() => handleKindChange(true)}
            >
              Ativo fixo
            </button>
          </div>
        </FormField>
      ) : null}

      {!requestType ? (
        <p className="info-banner">
          Selecione o tipo da solicitação para liberar a busca e continuar.
        </p>
      ) : isInclusao && fixedAsset === null ? (
        <p className="info-banner">
          Selecione <strong>Uso e consumo</strong> ou <strong>Ativo fixo</strong> para liberar a busca.
        </p>
      ) : !canShowSearch ? null : (
        <>
          <p className="info-banner">
            {needsExistingProduct ? (
              <>
                Busque na <strong>base unificada</strong> e <strong>selecione o produto</strong>{' '}
                vinculado. A solicitação ficará associada a esse item (um único item).
              </>
            ) : fixedAsset ? (
              <>
                Digite a descrição do bem. Se já existir cadastro idêntico, você poderá cadastrar mais
                unidades ou indicar que é um bem diferente — a inclusão não é bloqueada.
              </>
            ) : (
              <>
                Digite a descrição pretendida e verifique itens parecidos já cadastrados. Match 100%
                bloqueia inclusão — use Alteração ou Bloqueio para produtos existentes.
              </>
            )}
          </p>

          <div className="nova-solicitacao-fields-row">
            <FormField
              label={needsExistingProduct ? 'Buscar produto na base' : 'O que você precisa cadastrar?'}
              htmlFor="search-query"
              required
              error={fieldErrors.query}
              hint={
                needsExistingProduct
                  ? 'A partir de 3 caracteres, lista produtos da base. Clique em uma linha para selecionar.'
                  : 'Texto em caixa alta. A partir de 3 caracteres, busca ao vivo na base unificada.'
              }
            >
              <input
                id="search-query"
                className="product-search-input product-search-input--uppercase"
                value={query}
                onChange={(e) => {
                  setQuery(toFormUppercase(e.target.value));
                  setSelectedProduct(null);
                  setAfExactChoice(null);
                  if (fieldErrors.query || fieldErrors.selectedProduct || fieldErrors.afExact) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      query: undefined,
                      selectedProduct: undefined,
                      afExact: undefined,
                    }));
                  }
                }}
                placeholder={
                  needsExistingProduct
                    ? 'EX.: AGUA MINERAL, CÓDIGO UNIFICADO...'
                    : fixedAsset
                      ? 'EX.: NOTEBOOK DELL LATITUDE, AR CONDICIONADO...'
                      : 'EX.: AGUA MINERAL, CAMISA MASC ALMO...'
                }
                autoFocus
              />
            </FormField>

            <div className="nova-solicitacao-observation-col">
              <FormField
                label="Observação"
                htmlFor="search-observation"
                required
                error={fieldErrors.observation}
                hint={
                  needsExistingProduct
                    ? requestType === 'ALTERACAO'
                      ? 'Explique o que deve ser alterado (descrição, NCM, unidades, etc.).'
                      : 'Explique o motivo e o escopo do bloqueio solicitado.'
                    : blocksOnExact
                      ? 'Não é possível continuar — produto idêntico já existe na base.'
                      : hasSimilar && !exactMatch
                        ? 'Obrigatório quando há itens parecidos: explique por que este produto é diferente.'
                        : 'Descreva o motivo da inclusão deste produto.'
                }
              >
                <textarea
                  id="search-observation"
                  rows={3}
                  value={observation}
                  disabled={blocksOnExact}
                  onChange={(e) => {
                    setObservation(e.target.value);
                    if (fieldErrors.observation) {
                      setFieldErrors((prev) => ({ ...prev, observation: undefined }));
                    }
                  }}
                  placeholder={
                    needsExistingProduct
                      ? 'Ex.: corrigir descrição; bloquear compras na unidade MCZ...'
                      : hasSimilar
                        ? 'Ex.: embalagem/volume diferente do que consta na base...'
                        : 'Ex.: novo fornecedor para unidade MCZ...'
                  }
                />
              </FormField>

              <div className="search-actions nova-solicitacao-continue">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading || blocksOnExact}
                  onClick={continuarParaFormulario}
                >
                  Continuar para o formulário
                </button>
              </div>
            </div>
          </div>

          {blocksOnExact ? (
            <p className="form-field-error" role="alert">
              {consumptionDupMessage} Não é possível incluir — selecione Alteração ou Bloqueio
              parcial/total.
            </p>
          ) : null}

          {showAfExactOffer ? (
            <div className="af-exact-banner" role="status">
              <p>
                Já existem{' '}
                <strong>
                  {afExactCount > 0
                    ? afExactCount
                    : countExactDescriptionMatches(results, query) || 1}
                </strong>{' '}
                unidade
                {(afExactCount > 0
                  ? afExactCount
                  : countExactDescriptionMatches(results, query) || 1) === 1
                  ? ''
                  : 's'}{' '}
                deste bem cadastradas.
              </p>
              {fieldErrors.afExact ? (
                <p className="form-field-error" role="alert">
                  {fieldErrors.afExact}
                </p>
              ) : null}
              <div className="af-exact-banner__actions">
                <button
                  type="button"
                  className={`btn ${afExactChoice === 'more' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    setAfExactChoice('more');
                    setFieldErrors((prev) => ({ ...prev, afExact: undefined }));
                  }}
                >
                  Cadastrar mais unidades deste bem
                </button>
                <button
                  type="button"
                  className={`btn ${afExactChoice === 'different' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    setAfExactChoice('different');
                    setFieldErrors((prev) => ({ ...prev, afExact: undefined }));
                  }}
                >
                  É um bem diferente
                </button>
              </div>
            </div>
          ) : null}

          {needsExistingProduct && selectedProduct ? (
            <p className="info-banner form-success">
              Produto selecionado:{' '}
              <strong>
                {selectedProduct.unifiedCode ? `${selectedProduct.unifiedCode} — ` : ''}
                {selectedProduct.descriptionShort}
              </strong>
              {selectedProduct.familyName ? ` · ${selectedProduct.familyName}` : ''}
            </p>
          ) : null}

          {fieldErrors.selectedProduct ? (
            <p className="form-field-error" role="alert">
              {fieldErrors.selectedProduct}
            </p>
          ) : null}

          {isInclusao && hasSimilar && !exactMatch ? (
            <p className="info-banner similar-observation-hint">
              Foram encontrados itens parecidos na base. Revise a lista. Se o produto é realmente
              novo, <strong>justifique na observação</strong> e continue.
            </p>
          ) : null}

          <SimilarProductsPanel
            results={results}
            loading={loading}
            searched={searched}
            query={query}
            advisory={isInclusao && hasSimilar && !exactMatch}
            selectable={needsExistingProduct}
            selectedId={selectedProduct?.id}
            onSelect={
              needsExistingProduct
                ? (row) => {
                    setSelectedProduct(row);
                    setFieldErrors((prev) => ({ ...prev, selectedProduct: undefined }));
                  }
                : undefined
            }
            showHotelLegend
          />
        </>
      )}
    </section>
  );
}
