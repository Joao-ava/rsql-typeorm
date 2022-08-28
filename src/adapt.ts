import { ExpressionNode, EQ } from '@rsql/ast'
import { parse } from '@rsql/parser';
import {
  Equal,
  FindOptionsWhere,
} from 'typeorm'

export const adaptRsqlExpressionToQuery = <T>(expression: ExpressionNode): FindOptionsWhere<T>[] => {
  switch (expression.operator) {
    case EQ:
      const value = expression.right.value as string
      return [{ [expression.left.selector]: Equal(value) }] as FindOptionsWhere<T>[]
    default:
      throw Error()
  }
}

export const adaptRsqlStringToQuery = <T>(expression: string): FindOptionsWhere<T>[] =>
  adaptRsqlExpressionToQuery<T>(parse(expression))
