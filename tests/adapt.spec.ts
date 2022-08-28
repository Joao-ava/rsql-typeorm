import { Equal, In, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not } from "typeorm"
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

  it('should be create less than compare', () => {
    expect(sut('age<17')).toMatchSnapshot([{
      age: LessThan('17')
    }])
  })

  it('should be create less than or equal compare', () => {
    expect(sut('age<=17')).toMatchSnapshot([{
      age: LessThanOrEqual('17')
    }])
  })

  it('should be not equal than compare', () => {
    expect(sut('age!=17')).toMatchSnapshot([{
      age: Not('17')
    }])
  })

  it('should be in compare', () => {
    expect(sut('name=in=(John,Doe)')).toMatchSnapshot([{
      name: In(['John', 'Doe'])
    }])
  })
  
  it('should be not in compare', () => {
    expect(sut('name=out=(John,Doe)')).toMatchSnapshot([{
      name: Not(In(['John', 'Doe']))
    }])
  })
  
  it('should be like compare', () => {
    expect(sut('name==*John')).toMatchSnapshot([{
      name: Like('%John')
    }])
    expect(sut('name==John*')).toMatchSnapshot([{
      name: Like('John%')
    }])
    expect(sut('name==*John*')).toMatchSnapshot([{
      name: Like('%John%')
    }])
  })

  it('should be and compare', () => {
    expect(sut('name==John;age==17;id==2')).toMatchSnapshot([{
      age: Equal('17'),
      name: Equal('John'),
      id: Equal('2')
    }])
    expect(sut('name==John*;age<17')).toMatchSnapshot([{
      name: Like('John%'),
      age: LessThan('17')
    }])
  })
})
