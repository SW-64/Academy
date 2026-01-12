import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'QuestionsPointsMatch', async: false })
export class QuestionsPointsMatchConstraint
  implements ValidatorConstraintInterface
{
  validate(_: unknown, args: ValidationArguments) {
    const obj = args.object as any;

    const questions = obj.question;
    const points = obj.points;

    // 둘 다 없으면(문항/배점 입력 안 하는 정책이면) OK
    const isQuestionsEmpty = questions === undefined || questions === null;
    const isPointsEmpty = points === undefined || points === null;

    if (isQuestionsEmpty && isPointsEmpty) return true;

    // 하나만 있으면 FAIL
    if (isQuestionsEmpty !== isPointsEmpty) return false;

    // 둘 다 있어야 하고 배열이어야 함
    if (!Array.isArray(questions) || !Array.isArray(points)) return false;

    // 길이 동일해야 함
    return questions.length === points.length;
  }

  defaultMessage(args: ValidationArguments) {
    // 메시지는 decorator에서 message 주면 그걸 우선 사용함
    return `${args.property} validation failed: question and points must be provided together and have same length`;
  }
}

/**
 * question/points 길이 동일 + 둘 다 같이 존재 검증
 * - 둘 다 없으면 통과
 * - 하나만 있으면 실패
 * - 둘 다 있으면 길이 동일해야 통과
 */
export function IsQuestionsPointsMatched(
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: QuestionsPointsMatchConstraint,
    });
  };
}
