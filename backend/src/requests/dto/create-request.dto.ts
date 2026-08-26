import { ProductSource, RequestType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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

  @IsOptional()
  @IsString()
  itemObservation?: string;

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
}
