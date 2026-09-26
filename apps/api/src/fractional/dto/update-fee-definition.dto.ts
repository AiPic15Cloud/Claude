import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFeeDefinitionDto } from './create-fee-definition.dto';

// stakeholderId n'est jamais réassigné après création — un changement de
// bénéficiaire est une nouvelle règle, pas une modification (même doctrine
// que Deal.feesRate/feesAmount : dérivé, jamais réattribué en place).
export class UpdateFeeDefinitionDto extends PartialType(OmitType(CreateFeeDefinitionDto, ['stakeholderId'] as const)) {}
