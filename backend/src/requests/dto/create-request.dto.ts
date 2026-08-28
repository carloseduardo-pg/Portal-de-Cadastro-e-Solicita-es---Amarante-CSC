import { ProductSource, RequestType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/**
 * Item de uma solicitação (rascunho ou envio).
 */
export class RequestItemInputDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  /** Folha SAP (grupo de itens) — obrigatório no envio de inclusão. */
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsString()
  @IsNotEmpty()
  descriptionShort!: string;

  @IsOptional()
  @IsString()
  descriptionLong?: string;

  @IsOptional()
  @IsUUID()
  measureUnitId?: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsEnum(ProductSource)
  source?: ProductSource;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  itemValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  purchaseQtyTotal?: number;

  /**
   * Ativo fixo: quantidade de unidades físicas a cadastrar (materializa N produtos na aprovação).
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  unitQuantity?: number;

  /** Ativo fixo: localização física (texto livre). */
  @IsOptional()
  @IsString()
  physicalLocation?: string;

  /** TODO AF5 — opcional até Amarante definir. */
  @IsOptional()
  @IsString()
  assetTag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  acquisitionValue?: number;

  @IsOptional()
  @IsString()
  acquisitionDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  usefulLifeMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  depreciationRate?: number;

  @IsOptional()
  @IsString()
  supplierDocument?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  unifiedCode?: string;

  @IsOptional()
  @IsString()
  legacyCode?: string;

  @IsOptional()
  @IsString()
  law116?: string;

  @IsOptional()
  @IsString()
  productLink?: string;

  /** URLs adicionais do produto (N:N via request_item_links). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productLinks?: string[];

  @IsOptional()
  @IsString()
  itemObservation?: string;

  /** Comentário opcional ao salvar edição (timeline). */
  @IsOptional()
  @IsString()
  editNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}

/**
 * Cria solicitação (rascunho ou envio direto).
 */
export class CreateRequestDto {
  /** @deprecated Use hotelIds — mantido para compatibilidade. */
  @IsOptional()
  @IsUUID()
  hotelId?: string;

  @ValidateIf((o: CreateRequestDto) => !o.hotelId)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  hotelIds?: string[];

  @IsUUID()
  familyId!: string;

  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  /** Flag de ativo fixo — inclui etapa Imobilizado antes do Aprovador. */
  @IsOptional()
  @IsBoolean()
  fixedAsset?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequestItemInputDto)
  items!: RequestItemInputDto[];

  /** true = legado; preferir targetStage. */
  @IsOptional()
  submit?: boolean;

  /**
   * Destino ao salvar:
   * - SOLICITANTE = “rascunho” (caixa do solicitante; ainda editável)
   * - APROVADOR = pula solicitante e vai direto à caixa do aprovador (travado)
   */
  @IsOptional()
  @IsIn(['SOLICITANTE', 'APROVADOR'])
  targetStage?: 'SOLICITANTE' | 'APROVADOR';

  /** Motivo da inclusão ou alteração (obrigatório na abertura da solicitação). */
  @IsOptional()
  @IsString()
  observation?: string;

  /** Descrição buscada na etapa inicial — o que o solicitante pretende cadastrar. */
  @IsOptional()
  @IsString()
  requestDescription?: string;
}

/**
 * Atualiza rascunho existente.
 */
export class UpdateRequestDto {
  @IsOptional()
  @IsUUID()
  hotelId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  hotelIds?: string[];

  @IsOptional()
  @IsUUID()
  familyId?: string;

  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  /** Flag de ativo fixo — só alterável nas etapas do solicitante. */
  @IsOptional()
  @IsBoolean()
  fixedAsset?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequestItemInputDto)
  items?: RequestItemInputDto[];

  /** true = legado; preferir targetStage. */
  @IsOptional()
  submit?: boolean;

  @IsOptional()
  @IsIn(['SOLICITANTE', 'APROVADOR'])
  targetStage?: 'SOLICITANTE' | 'APROVADOR';

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsString()
  requestDescription?: string;

  /** Comentário ao salvar edição (registro na timeline). */
  @IsOptional()
  @IsString()
  editNote?: string;
}
