import {
  ExpressionNode,
  ComparisonNode,
  EQ,
  GT,
  GE,
  LT,
  LE,
  NEQ,
  IN,
  OUT,
  AND,
  OR
} from '@rsql/ast';
import { parse } from '@rsql/parser';
import {
  Equal,
  FindOptionsWhere,
  In,
  LessThan,
  LessThanOrEqual,
  ILike,
  MoreThan,
  MoreThanOrEqual,
  Not
} from 'typeorm';

const mergeArray = <T>(array: T[]) =>
  array.reduce(
    (dataAcc, option) => ({
      ...dataAcc,
      ...Object.keys(option).reduce(
        (acc, key) => ({
          ...acc,
          [key]: Array.isArray(option[key])
            ? mergeArray([
                ...option[key],
                ...(dataAcc[key] ? [dataAcc[key]] : [])
              ])
            : option[key]
        }),
        {} as FindOptionsWhere<T>
      )
    }),
    {} as FindOptionsWhere<T>
  );

const handleEqual = <T>(expression: ComparisonNode): FindOptionsWhere<T>[] => {
  const selectorKey = (expression as ComparisonNode).left.selector;
  const value = expression.right.value as string;
  const isNotLike = !value.startsWith('*') && !value.endsWith('*');
  if (isNotLike) {
    return [{ [selectorKey]: Equal(value) }] as FindOptionsWhere<T>[];
  }
  const leftValue = value.startsWith('*') ? `%${value.slice(1)}` : value;
  const finalValue = value.endsWith('*')
    ? `${leftValue.slice(0, -1)}%`
    : leftValue;
  return [{ [selectorKey]: ILike(finalValue) }] as FindOptionsWhere<T>[];
};

export const adaptRsqlExpressionToQuery = <T>(
  expression: ExpressionNode
): FindOptionsWhere<T>[] => {
  if (expression.operator == OR) {
    const data = [
      ...adaptRsqlExpressionToQuery(expression.left as ExpressionNode),
      ...adaptRsqlExpressionToQuery(expression.right as ExpressionNode)
    ];
    return data.reduce(
      (acc: FindOptionsWhere<T>[], option) => [
        ...acc,
        ...Object.keys(option).map((key) => ({
          [key]: option[key]
        }))
      ],
      [] as FindOptionsWhere<T>[]
    ) as FindOptionsWhere<T>[];
  }
  if (expression.operator == AND) {
    const data = [
      ...adaptRsqlExpressionToQuery(expression.left as ExpressionNode),
      ...adaptRsqlExpressionToQuery(expression.right as ExpressionNode)
    ];
    return [mergeArray(data)];
  }
  const selectorKey = (expression as ComparisonNode).left.selector;
  const isRelationField = selectorKey.includes('.');
  if (isRelationField) {
    const [relation, field] = selectorKey.split('.');
    return [
      {
        [relation]: adaptRsqlExpressionToQuery({
          ...expression,
          left: { ...expression.left, selector: field }
        } as ComparisonNode)
      }
    ] as FindOptionsWhere<T>[];
  }
  switch (expression.operator) {
    case EQ:
      return handleEqual(expression);
    case GT:
      return [
        { [selectorKey]: MoreThan(expression.right.value) }
      ] as FindOptionsWhere<T>[];
    case GE:
      return [
        { [selectorKey]: MoreThanOrEqual(expression.right.value) }
      ] as FindOptionsWhere<T>[];
    case LT:
      return [
        { [selectorKey]: LessThan(expression.right.value) }
      ] as FindOptionsWhere<T>[];
    case LE:
      return [
        { [selectorKey]: LessThanOrEqual(expression.right.value) }
      ] as FindOptionsWhere<T>[];
    case NEQ:
      return [
        { [selectorKey]: Not(expression.right.value) }
      ] as FindOptionsWhere<T>[];
    case IN:
      return [
        { [selectorKey]: In(expression.right.value as string[]) }
      ] as FindOptionsWhere<T>[];
    case OUT:
      return [
        { [selectorKey]: Not(In(expression.right.value as string[])) }
      ] as FindOptionsWhere<T>[];
  }
};

export const adaptRsqlStringToQuery = <T>(
  expression: string
): FindOptionsWhere<T>[] => adaptRsqlExpressionToQuery<T>(parse(expression));
