import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../components/FormField';
import { PageStageHeader } from '../../components/PageStageHeader';
import { SimilarProductsPanel } from '../../components/SimilarProductsPanel';
import { useSimilarProducts } from '../../hooks/useSimilarProducts';
import { minLengthText, requiredText } from '../../lib/formValidation';
import { toFormUppercase } from '../../lib/formText';
import type { ProductSearchResult } from '../../lib/types';
import './produtos.css';
import '../../components/SimilarProductsPanel.css';
import '../../components/FormField.css';

type RequestTypeChoice = 'INCLUSAO' | 'ALTERACAO';

type SearchFieldErrors = {
  type?: string;
  query?: string;
  observation?: string;
  selectedProduct?: string;
};

/**
 * Tela 1 — Tipo da solicitação + verificação na base unificada (P5).
 * Inclusão: fluxo de cadastro novo (multi-item no formulário).
 * Alteração: seleciona 1 produto existente (1 item / 1 atualização).
 */
export function NovaSolicitacaoPage() {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<RequestTypeChoice | ''>('');
  const [query, setQuery] = useState('');
  const [observation, setObservation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SearchFieldErrors>({});

  const searchEnabled = Boolean(requestType);
  const isAlteracao = requestType === 'ALTERACAO';
  const isInclusao = requestType === 'INCLUSAO';

  const { results, loading, searched, hasSimilar } = useSimilarProducts({
    query,
    enabled: searchEnabled,
  });

  function handleTypeChange(next: RequestTypeChoice) {
    setRequestType(next);
    setSelectedProduct(null);
    setFieldErrors((prev) => ({
      ...prev,
      type: undefined,
      selectedProduct: undefined,
      query: undefined,
    }));
  }

  function validateContinue(): SearchFieldErrors {
    const errors: SearchFieldErrors = {};

    if (!requestType) {
      errors.type = 'Selecione o tipo da solicitação antes de continuar.';
      return errors;
    }

    const queryError = minLengthText(
      query,
      3,
      isAlteracao
        ? 'Busque o produto existente com ao menos 3 caracteres.'
        : 'Informe ao menos 3 caracteres para identificar o produto.',
    );
    if (queryError) errors.query = queryError;

    if (isAlteracao && !selectedProduct) {
      errors.selectedProduct =
        'Selecione na lista o produto da base que deseja atualizar.';
    }

    const observationError = requiredText(
      observation,
      isAlteracao
        ? 'Descreva o que precisa ser atualizado neste produto.'
        : hasSimilar
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

    if (isAlteracao && selectedProduct) {
      navigate('/produtos/dados-do-item', {
        state: {
          searchQuery: selectedProduct.descriptionShort,
          observation: observation.trim(),
          existingProductId: selectedProduct.id,
          hotelIds: [],
          type: 'ALTERACAO' as const,
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
      },
    });
  }

  return (
    <section>
      <PageStageHeader title="Detalhes da Solicitação" stage="Busca" />

      <FormField
        label="Tipo da solicitação"
        required
        error={fieldErrors.type}
        hint="Defina o tipo antes da busca — isso muda o fluxo da solicitação."
      >
        <div className="request-type-choice" role="radiogroup" aria-label="Tipo da solicitação">
          <button
            type="button"
            role="radio"
            aria-checked={requestType === 'INCLUSAO'}
            className={`request-type-option${isInclusao ? ' request-type-option--active' : ''}`}
            onClick={() => handleTypeChange('INCLUSAO')}
          >
            <strong>Inclusão</strong>
            <span>Cadastro de item(ns) que ainda não existem na base unificada.</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={requestType === 'ALTERACAO'}
            className={`request-type-option${isAlteracao ? ' request-type-option--active' : ''}`}
            onClick={() => handleTypeChange('ALTERACAO')}
          >
            <strong>Alteração</strong>
            <span>Atualização de um produto já cadastrado (1 produto por solicitação).</span>
          </button>
        </div>
      </FormField>

      {!requestType ? (
        <p className="info-banner">
          Selecione <strong>Inclusão</strong> ou <strong>Alteração</strong> para liberar a busca e
          continuar.
        </p>
      ) : (
        <>
          <p className="info-banner">
            {isAlteracao ? (
              <>
                Busque na <strong>base unificada</strong> e <strong>selecione o produto</strong> que
                deseja atualizar. A solicitação ficará vinculada a esse item desde o início (um único
                item).
              </>
            ) : (
              <>
                Digite a descrição pretendida e verifique itens parecidos já cadastrados. Se for
                realmente um produto novo, justifique na observação e siga para o formulário
                (vários itens no mesmo lote, se necessário).
              </>
            )}
          </p>

          <div className="nova-solicitacao-fields-row">
            <FormField
              label={isAlteracao ? 'Buscar produto na base' : 'O que você precisa cadastrar?'}
              htmlFor="search-query"
              required
              error={fieldErrors.query}
              hint={
                isAlteracao
                  ? 'A partir de 3 caracteres, lista produtos da base. Clique em uma linha para selecionar.'
                  : 'Texto em caixa alta. A partir de 3 caracteres, busca ao vivo em toda a base unificada.'
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
                  isAlteracao
                    ? 'EX.: AGUA MINERAL, CÓDIGO UNIFICADO...'
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
                  isAlteracao
                    ? 'Explique o que deve ser alterado (descrição, NCM, unidades, etc.).'
                    : hasSimilar
                      ? 'Obrigatório quando há itens parecidos: explique por que este produto é diferente ou precisa de novo cadastro.'
                      : 'Descreva o motivo da inclusão desse produto.'
                }
              >
                <textarea
                  id="search-observation"
                  rows={3}
                  value={observation}
                  onChange={(e) => {
                    setObservation(e.target.value);
                    if (fieldErrors.observation) {
                      setFieldErrors((prev) => ({ ...prev, observation: undefined }));
                    }
                  }}
                  placeholder={
                    isAlteracao
                      ? 'Ex.: corrigir descrição longa; incluir unidade MGI; atualizar NCM...'
                      : hasSimilar
                        ? 'Ex.: embalagem/volume diferente do que consta na base; fornecedor exclusivo da unidade...'
                        : 'Ex.: novo fornecedor para unidade MCZ; substituição de embalagem...'
                  }
                />
              </FormField>

              <div className="search-actions nova-solicitacao-continue">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={continuarParaFormulario}
                >
                  Continuar para o formulário
                </button>
              </div>
            </div>
          </div>

          {isAlteracao && selectedProduct ? (
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

          {isInclusao && hasSimilar ? (
            <p className="info-banner similar-observation-hint">
              Foram encontrados itens parecidos na base unificada (SAP). Revise a lista abaixo. Se o
              produto é realmente novo ou distinto, <strong>justifique na observação</strong> e
              continue — a justificativa ficará registrada na solicitação.
            </p>
          ) : null}

          <SimilarProductsPanel
            results={results}
            loading={loading}
            searched={searched}
            query={query}
            advisory={isInclusao && hasSimilar}
            selectable={isAlteracao}
            selectedId={selectedProduct?.id}
            onSelect={
              isAlteracao
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
