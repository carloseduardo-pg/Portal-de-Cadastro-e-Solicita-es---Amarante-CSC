import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../components/FormField';
import { PageStageHeader } from '../../components/PageStageHeader';
import { SimilarProductsPanel } from '../../components/SimilarProductsPanel';
import { useSimilarProducts } from '../../hooks/useSimilarProducts';
import { minLengthText, requiredText } from '../../lib/formValidation';
import {
  findExactProductMatch,
  exactDuplicateMessage,
} from '../../lib/productMatch';
import { isExistingProductRequestType } from '../../lib/requestLabels';
import { toFormUppercase } from '../../lib/formText';
import type { ProductSearchResult } from '../../lib/types';
import './produtos.css';
import '../../components/SimilarProductsPanel.css';
import '../../components/FormField.css';
import '../../components/SolicitacaoPreForm.css';

type RequestTypeChoice = 'INCLUSAO' | 'ALTERACAO' | 'BLOQUEIO';

type SearchFieldErrors = {
  type?: string;
  query?: string;
  observation?: string;
  selectedProduct?: string;
};

/**
 * Tela 1 — Tipo da solicitação + verificação na base unificada (P5).
 * Solicitante não escolhe AF/UC — triagem no Aprovador - Imobilizado.
 */
export function NovaSolicitacaoPage() {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<RequestTypeChoice | ''>('');
  const [query, setQuery] = useState('');
  const [observation, setObservation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SearchFieldErrors>({});

  const searchEnabled = Boolean(requestType);
  const needsExistingProduct = requestType ? isExistingProductRequestType(requestType) : false;
  const isInclusao = requestType === 'INCLUSAO';
  const isBloqueio = requestType === 'BLOQUEIO';
  const itemKind = isInclusao ? ('CONSUMPTION' as const) : undefined;

  const { results, loading, searched, hasSimilar } = useSimilarProducts({
    query,
    enabled: searchEnabled,
    itemKind,
    // Bloqueio inativa o item — só faz sentido sobre produto ativo.
    activeOnly: isBloqueio,
  });

  const exactHit = isInclusao ? findExactProductMatch(results, query) : null;
  const exactMatch = Boolean(exactHit);
  const blocksOnExact = exactMatch;
  const consumptionDupMessage = exactDuplicateMessage(exactHit);

  function handleTypeChange(next: RequestTypeChoice) {
    setRequestType(next);
    setSelectedProduct(null);
    setQuery('');
    setObservation('');
    setFieldErrors({});
  }

  function validateContinue(): SearchFieldErrors {
    const errors: SearchFieldErrors = {};

    if (!requestType) {
      errors.type = 'Selecione o tipo da solicitação antes de continuar.';
      return errors;
    }

    const queryError = minLengthText(
      query,
      needsExistingProduct ? 2 : 3,
      needsExistingProduct
        ? 'Busque o produto existente pela descrição (3+ caracteres) ou por um código.'
        : 'Informe ao menos 3 caracteres para identificar o produto.',
    );
    if (queryError) errors.query = queryError;

    if (blocksOnExact) {
      errors.query = consumptionDupMessage;
    }

    if (needsExistingProduct) {
      if (!selectedProduct) {
        errors.selectedProduct =
          'Selecione na lista o produto da base vinculado a esta solicitação.';
      } else if (isBloqueio && selectedProduct.active === false) {
        errors.selectedProduct =
          'Este produto já está inativo na base — não há o que bloquear.';
      }
      // Justificativa (alteração) e motivo do bloqueio ficam no formulário do item.
      return errors;
    }

    const observationError = requiredText(
      observation,
      hasSimilar && !exactMatch
        ? 'Justifique na observação por que este produto precisa ser cadastrado mesmo com itens parecidos na base.'
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
      navigate('/produtos/produto-existente', {
        state: {
          existingProductId: selectedProduct.id,
          type: requestType,
        },
      });
      return;
    }

    navigate('/produtos/dados-do-item', {
      state: {
        searchQuery: query.trim(),
        observation: observation.trim(),
        hotelIds: [],
        type: 'INCLUSAO' as const,
        fixedAsset: false,
      },
    });
  }

  const typeOptions: { value: RequestTypeChoice; title: string; hint: string }[] = [
    {
      value: 'INCLUSAO',
      title: 'Inclusão',
      hint: 'Cadastro de item(ns) — a classificação AF/UC é feita pelo imobilizado.',
    },
    {
      value: 'ALTERACAO',
      title: 'Alteração',
      hint: 'Atualização de um produto já cadastrado (1 produto por solicitação).',
    },
    {
      value: 'BLOQUEIO',
      title: 'Bloqueio',
      hint: 'Bloqueia requisição e/ou compras de um item ativo. Parcial ou total depende das flags.',
    },
  ];

  const canShowSearch = Boolean(requestType);

  return (
    <section>
      <PageStageHeader title="Detalhes da Solicitação" stage="Busca" />

      <FormField
        label="Tipo da solicitação"
        required
        error={fieldErrors.type}
        hint="Defina o tipo antes da busca — isso muda o fluxo da solicitação."
      >
        <div
          className="request-type-choice"
          role="radiogroup"
          aria-label="Tipo da solicitação"
        >
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
        <p className="info-banner">
          A classificação final (uso e consumo ou ativo fixo) é feita pelo{' '}
          <strong>aprovador - imobilizado</strong>. Toda solicitação passa primeiro por essa etapa.
        </p>
      ) : null}

      {!requestType ? (
        <p className="info-banner">
          Selecione o tipo da solicitação para liberar a busca e continuar.
        </p>
      ) : !canShowSearch ? null : (
        <>
          <p className="info-banner">
            {needsExistingProduct ? (
              <>
                Busque na <strong>base unificada</strong> por descrição ou por{' '}
                <strong>qualquer código</strong> (unificado, legado, SAP ou NCM) e{' '}
                <strong>selecione o produto</strong>. O formulário abre com os dados já
                cadastrados.
                {isBloqueio ? (
                  <>
                    {' '}
                    A lista traz <strong>somente itens ativos</strong> — o bloqueio existe para
                    inativá-los.
                  </>
                ) : null}
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
                  ? 'Descrição (3+ caracteres) ou código (2+). Clique em uma linha para selecionar.'
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
                  if (fieldErrors.query || fieldErrors.selectedProduct) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      query: undefined,
                      selectedProduct: undefined,
                    }));
                  }
                }}
                placeholder={
                  needsExistingProduct
                    ? 'EX.: AGUA MINERAL, 2010, UC000794...'
                    : 'EX.: AGUA MINERAL, CAMISA MASC ALMO...'
                }
                autoFocus
              />
            </FormField>

            <div className="nova-solicitacao-observation-col">
              {needsExistingProduct ? (
                <p className="info-banner">
                  {requestType === 'ALTERACAO'
                    ? 'A justificativa da alteração é pedida no fim do formulário, junto com o resumo dos campos alterados.'
                    : 'O escopo (requisição/compras) e o motivo do bloqueio são definidos no formulário do item.'}
                </p>
              ) : (
                <FormField
                  label="Observação"
                  htmlFor="search-observation"
                  required
                  error={fieldErrors.observation}
                  hint={
                    blocksOnExact
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
                      hasSimilar
                        ? 'Ex.: embalagem/volume diferente do que consta na base...'
                        : 'Ex.: novo fornecedor para unidade MCZ...'
                    }
                  />
                </FormField>
              )}

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
              {consumptionDupMessage} Não é possível incluir — selecione Alteração ou Bloqueio.
            </p>
          ) : null}

          {needsExistingProduct && selectedProduct ? (
            <p className="info-banner form-success">
              Produto selecionado:{' '}
              <strong>
                {selectedProduct.legacyCode
                  ? `${selectedProduct.legacyCode} — `
                  : selectedProduct.unifiedCode
                    ? `${selectedProduct.unifiedCode} — `
                    : ''}
                {selectedProduct.descriptionShort}
              </strong>
              {selectedProduct.familyName ? ` · ${selectedProduct.familyName}` : ''}
              {selectedProduct.subgroupName ? ` / ${selectedProduct.subgroupName}` : ''}
              {selectedProduct.groupName ? ` / ${selectedProduct.groupName}` : ''}
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
