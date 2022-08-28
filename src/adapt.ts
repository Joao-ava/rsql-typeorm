import { ExpressionNode, EQ, GT, GE, LT, LE, NEQ, IN, OUT } from '@rsql/ast'
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
    default:
      throw Error()
  }
}

export const adaptRsqlStringToQuery = <T>(expression: string): FindOptionsWhere<T>[] =>
  adaptRsqlExpressionToQuery<T>(parse(expression))
