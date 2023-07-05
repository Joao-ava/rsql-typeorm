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
    expect(sut('name==John')).toMatchObject([
      {
        name: Equal('John')
      }
    ]);
  });

  it('should be create more than compare', () => {
    expect(sut('age>17')).toMatchObject([
      {
        age: MoreThan('17')
      }
    ]);
  });

  it('should be create more than equal compare', () => {
    expect(sut('age>=17')).toMatchObject([
      {
        age: MoreThanOrEqual('17')
      }
    ]);
  });

  it('should be create less than compare', () => {
    expect(sut('age<17')).toMatchObject([
      {
        age: LessThan('17')
      }
    ]);
  });

  it('should be create less than or equal compare', () => {
    expect(sut('age<=17')).toMatchObject([
      {
        age: LessThanOrEqual('17')
      }
    ]);
  });

  it('should be not equal than compare', () => {
    expect(sut('age!=17')).toMatchObject([
      {
        age: Not('17')
      }
    ]);
  });

  it('should be in compare', () => {
    expect(sut('name=in=(John,Doe)')).toMatchObject([
      {
        name: In(['John', 'Doe'])
      }
    ]);
  });

  it('should be not in compare', () => {
    expect(sut('name=out=(John,Doe)')).toMatchObject([
      {
        name: Not(In(['John', 'Doe']))
      }
    ]);
  });

  it('should be like compare', () => {
    expect(sut('name==*John')).toMatchObject([
      {
        name: ILike('%John')
      }
    ]);
    expect(sut('name==John*')).toMatchObject([
      {
        name: ILike('John%')
      }
    ]);
    expect(sut('name==*John*')).toMatchObject([
      {
        name: ILike('%John%')
      }
    ]);
  });

  it('should be and compare', () => {
    expect(sut('name==John;age==17;id==2')).toMatchObject([
      {
        age: Equal('17'),
        name: Equal('John'),
        id: Equal('2')
      }
    ]);
    expect(sut('name==John*;age<17')).toMatchObject([
      {
        name: ILike('John%'),
        age: LessThan('17')
      }
    ]);
  });

  it('should be or compare', () => {
    expect(sut('name==John,age==17,id==2')).toMatchObject([
      { name: Equal('John') },
      { age: Equal('17') },
      { id: Equal('2') }
    ]);
    expect(sut('name==John*,age<17')).toMatchObject([
      { name: ILike('John%') },
      { age: LessThan('17') }
    ]);
  });

  it('should be can filter relation items', () => {
    expect(sut('address.state==Arizona;address.city==Phoenix')).toMatchObject([
      {
        address: {
          state: Equal('Arizona'),
          city: Equal('Phoenix')
        }
      }
    ]);
    expect(
      sut('price.amount>20;name==Product;price.currency==USD')
    ).toMatchObject([
      {
        name: Equal('Product'),
        price: {
          amount: MoreThan('20'),
          currency: Equal('USD')
        }
      }
    ]);
    expect(
      sut('roles.name==Admin;roles.permission.name==Create')
    ).toMatchObject([
      {
        roles: {
          name: Equal('Admin'),
          permission: {
            name: Equal('Create')
          }
        }
      }
    ]);
  });

  it('should be able to perform the operation AND in the same field', () => {
    expect(sut('amount>0;amount<20')).toMatchObject([
      { amount: And(MoreThan('0'), LessThan('20')) }
    ]);
  });
});
