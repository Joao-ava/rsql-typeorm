import {
  Equal,
  In,
  LessThan,
  LessThanOrEqual,
  ILike,
  MoreThan,
  MoreThanOrEqual,
  Not,
  And
} from 'typeorm';

import { adaptRsqlStringToQuery } from '../src';

describe('adapt', () => {
  const sut = (expression: string) =>
    adaptRsqlStringToQuery<{ name: string }>(expression);

  it('should be create equals compare', () => {
    expect(sut('name==John')).toMatchSnapshot([
      {
        name: Equal('John')
      }
    ]);
  });

  it('should be create more than compare', () => {
    expect(sut('age>17')).toMatchSnapshot([
      {
        age: MoreThan('17')
      }
    ]);
  });

  it('should be create more than equal compare', () => {
    expect(sut('age>=17')).toMatchSnapshot([
      {
        age: MoreThanOrEqual('17')
      }
    ]);
  });

  it('should be create less than compare', () => {
    expect(sut('age<17')).toMatchSnapshot([
      {
        age: LessThan('17')
      }
    ]);
  });

  it('should be create less than or equal compare', () => {
    expect(sut('age<=17')).toMatchSnapshot([
      {
        age: LessThanOrEqual('17')
      }
    ]);
  });

  it('should be not equal than compare', () => {
    expect(sut('age!=17')).toMatchSnapshot([
      {
        age: Not('17')
      }
    ]);
  });

  it('should be in compare', () => {
    expect(sut('name=in=(John,Doe)')).toMatchSnapshot([
      {
        name: In(['John', 'Doe'])
      }
    ]);
  });

  it('should be not in compare', () => {
    expect(sut('name=out=(John,Doe)')).toMatchSnapshot([
      {
        name: Not(In(['John', 'Doe']))
      }
    ]);
  });

  it('should be like compare', () => {
    expect(sut('name==*John')).toMatchSnapshot([
      {
        name: ILike('%John')
      }
    ]);
    expect(sut('name==John*')).toMatchSnapshot([
      {
        name: ILike('John%')
      }
    ]);
    expect(sut('name==*John*')).toMatchSnapshot([
      {
        name: ILike('%John%')
      }
    ]);
  });

  it('should be and compare', () => {
    expect(sut('name==John;age==17;id==2')).toMatchSnapshot([
      {
        age: Equal('17'),
        name: Equal('John'),
        id: Equal('2')
      }
    ]);
    expect(sut('name==John*;age<17')).toMatchSnapshot([
      {
        name: ILike('John%'),
        age: LessThan('17')
      }
    ]);
  });

  it('should be or compare', () => {
    expect(sut('name==John,age==17,id==2')).toMatchSnapshot([
      { name: Equal('John') },
      { age: Equal('17') },
      { id: Equal('2') }
    ]);
    expect(sut('name==John*,age<17')).toMatchSnapshot([
      { name: ILike('John%') },
      { age: LessThan('17') }
    ]);
  });

  it('should be can filter relation items', () => {
    expect(sut('address.state==Arizona;address.city==Phoenix')).toMatchSnapshot(
      [
        {
          address: {
            state: Equal('Arizona'),
            city: Equal('Phoenix')
          }
        }
      ]
    );
    expect(
      sut('price.amount>20;name==Product;price.currency==USD')
    ).toMatchSnapshot([
      {
        name: Equal('Product'),
        price: {
          amount: MoreThan('20'),
          currency: Equal('USD')
        }
      }
    ]);
  });

  it('should be able to perform the operation AND in the same field', () => {
    expect(sut('amount>0;amount<20')).toMatchSnapshot([
      { amount: And(MoreThan('0'), LessThan('20')) }
    ]);
  });
});
