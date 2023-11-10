import { AND, ComparisonNode, EQ, ExpressionNode, GE, GT, IN, LE, LT, NEQ, OR, OUT } from '@rsql/ast';
import { parse } from '@rsql/parser';
import {
  And,
  Equal,
  FindOperator,
  FindOptionsWhere,
  ILike,
  In,
  InstanceChecker,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not
} from 'typeorm';

const mergeArray = <T extends Record<string, any>>(array: T[]): T => {
  const mergeRecursive = <T>(first: T, second: T): T => {
    const firstKeys = Object.keys(first);
    const secondKeys = Object.keys(second);
    return secondKeys.reduce(
      (acc, key) => {
        const firstHasKey = firstKeys.includes(key);
        const isObject =
          typeof second[key] === 'object' &&
          !Array.isArray(second[key]) &&
          !InstanceChecker.isFindOperator(second[key]);
        const value =
          firstHasKey && isObject
            ? mergeRecursive(first[key], second[key])
            : second[key];
        return {
          ...acc,
          [key]: value
        };
      },
      { ...first }
    );
  };

  return array.reduce((mergedObject, currentObject) => {
    return mergeRecursive(mergedObject, currentObject);
  }, {} as T);
};

const handleEqual = <T>(expression: ComparisonNode): FindOptionsWhere<T>[] => {
  const selectorKey = (expression as ComparisonNode).left.selector;
  const value = expression.right.value as string;
  const isNotLike = !value.startsWith('*') && !value.endsWith('*');
  if (isNotLike) {
    const finalValue = value === 'NULL' ? IsNull() : Equal(value);
    return [{ [selectorKey]: finalValue }] as FindOptionsWhere<T>[];
  }
  const leftValue = value.startsWith('*') ? `%${value.slice(1)}` : value;
  const finalValue = value.endsWith('*')
    ? `${leftValue.slice(0, -1)}%`
    : leftValue;
  return [{ [selectorKey]: ILike(finalValue) }] as FindOptionsWhere<T>[];
};

const handleNotEqual = <T>(
  expression: ComparisonNode
): FindOptionsWhere<T>[] => {
  const selectorKey = (expression as ComparisonNode).left.selector;
  const value = expression.right.value as string;
  const isNotLike = !value.startsWith('*') && !value.endsWith('*');
  if (isNotLike) {
    const finalValue = value === 'NULL' ? Not(IsNull()) : Not(Equal(value));
    return [{ [selectorKey]: finalValue }] as FindOptionsWhere<T>[];
  }
  const leftValue = value.startsWith('*') ? `%${value.slice(1)}` : value;
  const finalValue = value.endsWith('*')
    ? `${leftValue.slice(0, -1)}%`
    : leftValue;
  return [{ [selectorKey]: Not(ILike(finalValue)) }] as FindOptionsWhere<T>[];
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

const isDate = <T>(value: T): boolean => {
  if (typeof value !== 'string') return false;
  const dateRegex =
    /\d{4}-\d{2}-\d{2}T?(\d{2}:\d{2}:\d{2})?(\+\d{2}:\d{2}Z?)?/gm;
  return !!value.match(dateRegex)?.length;
};

const getScalarValue = <T>(value: T) => {
  return isDate(value) ? new Date(value as string) : value;
};

export const adaptRsqlExpressionToQuery = <T>(
  expression: ExpressionNode
): FindOptionsWhere<T>[] => {
  if (expression.operator == OR) {
    return [
      ...adaptRsqlExpressionToQuery(expression.left as ExpressionNode),
      ...adaptRsqlExpressionToQuery(expression.right as ExpressionNode)
    ];
  }
  if (expression.operator == AND) {
    return handleAnd(expression);
  }
  const selectorKey = (expression as ComparisonNode).left.selector;
  const isRelationField = selectorKey.includes('.');
  if (isRelationField) {
    const selectors = selectorKey.split('.');
    const lastRelations = selectors.slice(selectors.length - 2);
    const relations =
      selectors.length <= 2 ? [] : selectors.slice(0, selectors.length - 2);
    const [relation, field] = lastRelations;
    const result = relations.reduceRight(
      (acc, relation) => ({ [relation]: acc } as FindOptionsWhere<T>),
      {
        [relation]: adaptRsqlExpressionToQuery({
          ...expression,
          left: { ...expression.left, selector: field }
        } as ComparisonNode)[0]
      } as FindOptionsWhere<T>
    );
    return [result];
  }
  switch (expression.operator) {
    case EQ:
      return handleEqual(expression);
    case NEQ:
      return handleNotEqual(expression);
    case GT:
      return [
        { [selectorKey]: MoreThan(getScalarValue(expression.right.value)) }
      ] as FindOptionsWhere<T>[];
    case GE:
      return [
        {
          [selectorKey]: MoreThanOrEqual(getScalarValue(expression.right.value))
        }
      ] as FindOptionsWhere<T>[];
    case LT:
      return [
        { [selectorKey]: LessThan(getScalarValue(expression.right.value)) }
      ] as FindOptionsWhere<T>[];
    case LE:
      return [
        {
          [selectorKey]: LessThanOrEqual(getScalarValue(expression.right.value))
        }
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
