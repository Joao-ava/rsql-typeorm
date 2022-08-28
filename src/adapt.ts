import { ExpressionNode, EQ, GT, GE, LT, LE, NEQ } from '@rsql/ast'
import { parse } from '@rsql/parser';
import {
  Equal,
  FindOptionsWhere,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
} from 'typeorm'

export const adaptRsqlExpressionToQuery = <T>(expression: ExpressionNode): FindOptionsWhere<T>[] => {
  switch (expression.operator) {
    case EQ:
      const value = expression.right.value as string
      return [{ [expression.left.selector]: Equal(value) }] as FindOptionsWhere<T>[]
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
    default:
      throw Error()
  }
}

export const adaptRsqlStringToQuery = <T>(expression: string): FindOptionsWhere<T>[] =>
  adaptRsqlExpressionToQuery<T>(parse(expression))
