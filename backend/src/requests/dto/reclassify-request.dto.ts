import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * Reclassificação Aprovador → Ativo Fixo (ou Imobilizado → Consumo).
 */
export class ReclassifyRequestDto {
  @IsString()
  @IsNotEmpty()
  justification!: string;

  /** Itens do lote a reclassificar. Seleção parcial divide o lote (filha com parent_request_id). */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  itemIds!: string[];

  /**
   * Só na direção → FIXED_ASSET.
   * true = após Imobilizado volta ao Aprovador; false = Imobilizado encerra sozinho.
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  returnToApprover?: boolean;
}
