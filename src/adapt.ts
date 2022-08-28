import { ExpressionNode, EQ, GT, GE, LT, LE, NEQ, IN, OUT, AND, OR } from '@rsql/ast'
import { parse } from '@rsql/parser';
import {
  Equal,
  FindOptionsWhere,
  In,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
} from 'typeorm'

export const adaptRsqlExpressionToQuery = <T>(expression: ExpressionNode): FindOptionsWhere<T>[] => {
  if (expression.operator == OR) {
    const data = [
      ...adaptRsqlExpressionToQuery(expression.left as ExpressionNode),
      ...adaptRsqlExpressionToQuery(expression.right as ExpressionNode)
    ]
    return data.reduce((acc: FindOptionsWhere<T>[], option) => [
        ...acc,
        ...Object.keys(option).map((key) => ({
          [key]: option[key]
        }))
      ], [] as FindOptionsWhere<T>[]) as FindOptionsWhere<T>[]
  }
  if (expression.operator == AND) {
    const data = [
      ...adaptRsqlExpressionToQuery(expression.left as ExpressionNode),
      ...adaptRsqlExpressionToQuery(expression.right as ExpressionNode)
    ]
    return [
      data.reduce((acc, option) => ({
        ...acc,
        ...Object.keys(option).reduce((acc, key) => ({
          ...acc,
          [key]: option[key]
        }), {} as FindOptionsWhere<T>)
      }), {} as FindOptionsWhere<T>)
    ]
  }
  switch (expression.operator) {
    case EQ:
      const value = expression.right.value as string
      const isNotLike = !value.startsWith('*') && !value.endsWith('*')
      if (isNotLike) {
        return [{ [expression.left.selector]: Equal(value) }] as FindOptionsWhere<T>[]
      }
      const leftValue = value.startsWith('*') ? `%${value.slice(1)}` : value
      const finalValue = value.endsWith('*') ? `${leftValue.slice(0, -1)}%` : leftValue
      return [{ [expression.left.selector]: Like(finalValue) }] as FindOptionsWhere<T>[]
    case GT:
      return [{ [expression.left.selector]: MoreThan(expression.right.value) }] as FindOptionsWhere<T>[]
    case GE:
      return [{ [expression.left.selector]: MoreThanOrEqual(expression.right.value) }] as FindOptionsWhere<T>[]
    case LT:
      return [{ [expression.left.selector]: LessThan(expression.right.value) }] as FindOptionsWhere<T>[]
    case LE:
      return [{ [expression.left.selector]: LessThanOrEqual(expression.right.value) }] as FindOptionsWhere<T>[]
    case NEQ:
      return [{ [expression.left.selector]: Not(expression.right.value) }] as FindOptionsWhere<T>[]
    case IN:
      return [{ [expression.left.selector]: In(expression.right.value as string[]) }] as FindOptionsWhere<T>[]
    case OUT:
      return [{ [expression.left.selector]: Not(In(expression.right.value as string[])) }] as FindOptionsWhere<T>[]
  }
}

export const adaptRsqlStringToQuery = <T>(expression: string): FindOptionsWhere<T>[] =>
  adaptRsqlExpressionToQuery<T>(parse(expression))
