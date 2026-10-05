import {
  AND,
  ComparisonNode,
  EQ,
  ExpressionNode,
  GE,
  GT,
  IN,
  LE,
  LT,
  NEQ,
  OR,
  OUT
} from '@rsql/ast';
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

const getAndOperands = (
  operator: FindOperator<unknown>
): FindOperator<unknown>[] => {
  if (operator.type === 'and') return (operator.value as unknown as FindOperator<unknown>[])
  return [operator];
}

const combineOperators = (
  first: FindOperator<unknown>,
  second: FindOperator<unknown>
): FindOperator<unknown> =>
  And(...getAndOperands(first), ...getAndOperands(second));

// Merges two conjunctions (AND), combining operators on the same field with And()
const mergeConjunctions = <T extends Record<string, any>>(
  first: T,
  second: T
): T =>
  Object.keys(second).reduce(
    (acc, key) => {
      if (!(key in acc)) return { ...acc, [key]: second[key] };
      const bothOperators =
        InstanceChecker.isFindOperator(acc[key]) &&
        InstanceChecker.isFindOperator(second[key]);
      const value = bothOperators
        ? combineOperators(acc[key], second[key])
        : mergeConjunctions(acc[key], second[key]);
      return { ...acc, [key]: value };
    },
    { ...first }
  );

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

// TypeORM `where` arrays are an OR of AND objects (disjunctive normal form),
// so AND distributes over OR: (a,b);(c,d) => a;c , a;d , b;c , b;d
const handleAnd = <T>({
  left,
  right
}: ExpressionNode): FindOptionsWhere<T>[] => {
  const leftConjunctions = adaptRsqlExpressionToQuery<T>(left as ExpressionNode);
  const rightConjunctions = adaptRsqlExpressionToQuery<T>(
    right as ExpressionNode
  );
  return leftConjunctions.flatMap((leftConjunction) =>
    rightConjunctions.map((rightConjunction) =>
      mergeConjunctions(leftConjunction, rightConjunction)
    )
  );
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
    return handleAnd<T>(expression);
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
