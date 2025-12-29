import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match', async: false })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [property] = args.constraints;
    const obj = args.object as Record<string, any>;
    return value === obj[property];
  }

  defaultMessage(args: ValidationArguments) {
    const [property] = args.constraints;
    return `${args.property} must match ${property}`;
  }
}

/**
 * 특정 필드가 다른 필드와 동일한지 검사
 * 사용 예: @Match('newPassword', { message: '비밀번호가 일치하지 않습니다.' })
 */
export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}
