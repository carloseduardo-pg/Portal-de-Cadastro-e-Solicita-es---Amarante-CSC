import { ItemKind } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Payload para cadastro manual de família. */
export class CreateFamilyDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(ItemKind)
  itemKind!: ItemKind;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

/** Payload para cadastro manual de subgrupo, ligado a uma família existente. */
export class CreateSubgroupDto {
  @IsUUID()
  familyId!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

/**
 * Payload para cadastro manual de grupo.
 * `catalogCode` recebe o código real da classificação final da empresa.
 */
export class CreateGroupDto {
  @IsUUID()
  subgroupId!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(64)
  catalogCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

/** Payload para cadastro manual de centro de custo global (independente de hierarquia). */
export class CreateCostCenterDto {
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;
}

/** Atualiza dados de família. */
export class UpdateFamilyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(ItemKind)
  itemKind?: ItemKind;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

/** Atualiza dados de subgrupo. */
export class UpdateSubgroupDto {
  @IsOptional()
  @IsUUID()
  familyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

/** Atualiza dados de grupo. */
export class UpdateGroupDto {
  @IsOptional()
  @IsUUID()
  subgroupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  catalogCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

/** Atualiza centro de custo global pelo código. */
export class UpdateCostCenterDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;
}

/** Cadastro de hotel / unidade operacional. */
export class CreateHotelDto {
  @IsString()
  @MaxLength(10)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;
}

/** Atualiza hotel / unidade operacional. */
export class UpdateHotelDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

/** Cadastro de unidade de medida. */
export class CreateMeasureUnitDto {
  @IsString()
  @MaxLength(16)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;
}

/** Atualiza unidade de medida. */
export class UpdateMeasureUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
