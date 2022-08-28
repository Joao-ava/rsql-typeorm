import { Equal, MoreThan, MoreThanOrEqual } from "typeorm"
import { adaptRsqlStringToQuery } from "../src/adapt"

describe('adapt', () => {
  const sut = (expression: string) => adaptRsqlStringToQuery<{ name: string }>(expression)

  it('should be create equals compare', () => {
    expect(sut('name==John')).toMatchSnapshot([{
      name: Equal('John')
    }])
  })

  it('should be create more than compare', () => {
    expect(sut('age>17')).toMatchSnapshot([{
      age: MoreThan('17')
    }])
  })

  it('should be create more than equal compare', () => {
    expect(sut('age>=17')).toMatchSnapshot([{
      age: MoreThanOrEqual('17')
    }])
  })
})