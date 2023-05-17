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
  Not,
  And,
  FindOperator
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

const getComparisonBySelector = (
  key: string,
  expression: ExpressionNode
): ExpressionNode[] => {
  if (expression.type === 'LOGIC')
    return [
      ...getComparisonBySelector(key, expression.left),
      ...getComparisonBySelector(key, expression.right)
    ];

  if (expression.left.selector !== key) return [];
  return [expression];
};

const getSelectors = (expression: ExpressionNode): string[] => {
  if (expression.type === 'COMPARISON') return [expression.left.selector];
  return [...getSelectors(expression.left), ...getSelectors(expression.right)];
};

const handleAnd = ({
  left,
  right
}: ExpressionNode): FindOptionsWhere<unknown>[] => {
  const leftKeys = getSelectors(left as ExpressionNode);
  const rightKeys = getSelectors(right as ExpressionNode);
  const sameKeys = leftKeys.filter((key) => rightKeys.includes(key));
  return [
    mergeArray([
      ...adaptRsqlExpressionToQuery(left as ExpressionNode),
      ...adaptRsqlExpressionToQuery(right as ExpressionNode),
      ...sameKeys.map((key) => ({
        [key]: And(
          ...([
            getComparisonBySelector(key, left as ExpressionNode).map((item) =>
              adaptRsqlExpressionToQuery(item).map((result) => result[key])
            ),
            getComparisonBySelector(key, right as ExpressionNode).map((item) =>
              adaptRsqlExpressionToQuery(item).map((result) => result[key])
            )
          ].flat(2) as unknown as FindOperator<unknown>[])
        )
      }))
    ])
  ];
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
    return handleAnd(expression);
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
