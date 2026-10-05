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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { adaptRsqlStringToQuery } from '../src';

describe('adapt', () => {
  const sut = (expression: string) =>
    adaptRsqlStringToQuery<{ name: string }>(expression);

  it('should be create equals compare', () => {
    assert.deepStrictEqual(sut('name==John'), [
      {
        name: Equal('John')
      }
    ]);
  });

  it('should be create more than compare', () => {
    assert.deepStrictEqual(sut('age>17'), [
      {
        age: MoreThan('17')
      }
    ]);
  });

  it('should be create more than equal compare', () => {
    assert.deepStrictEqual(sut('age>=17'), [
      {
        age: MoreThanOrEqual('17')
      }
    ]);
    assert.deepStrictEqual(sut('createdAt>=2023-07-07T03:00:00.000Z'), [
      {
        createdAt: MoreThanOrEqual(new Date('2023-07-07T03:00:00.000Z'))
      }
    ]);
  });

  it('should be create less than compare', () => {
    assert.deepStrictEqual(sut('age<17'), [
      {
        age: LessThan('17')
      }
    ]);
  });

  it('should be create less than or equal compare', () => {
    assert.deepStrictEqual(sut('age<=17'), [
      {
        age: LessThanOrEqual('17')
      }
    ]);
  });

  it('should create not equal comparison', () => {
    assert.deepStrictEqual(sut('age!=17'), [
      {
        age: Not(Equal('17'))
      }
    ]);
  });

  it('should create not like comparison', () => {
    assert.deepStrictEqual(sut('age!=*17*'), [
      {
        age: Not(ILike('%17%'))
      }
    ]);
  });

  it('should be in compare', () => {
    assert.deepStrictEqual(sut('name=in=(John,Doe)'), [
      {
        name: In(['John', 'Doe'])
      }
    ]);
  });

  it('should be not in compare', () => {
    assert.deepStrictEqual(sut('name=out=(John,Doe)'), [
      {
        name: Not(In(['John', 'Doe']))
      }
    ]);
  });

  it('should be like compare', () => {
    assert.deepStrictEqual(sut('name==*John'), [
      {
        name: ILike('%John')
      }
    ]);
    assert.deepStrictEqual(sut('name==John*'), [
      {
        name: ILike('John%')
      }
    ]);
    assert.deepStrictEqual(sut('name==*John*'), [
      {
        name: ILike('%John%')
      }
    ]);
  });

  it('should be and compare', () => {
    assert.deepStrictEqual(sut('name==John;age==17;id==2'), [
      {
        age: Equal('17'),
        name: Equal('John'),
        id: Equal('2')
      }
    ]);
    assert.deepStrictEqual(sut('name==John*;age<17'), [
      {
        name: ILike('John%'),
        age: LessThan('17')
      }
    ]);
  });

  it('should be or compare', () => {
    assert.deepStrictEqual(sut('name==John,age==17,id==2'), [
      { name: Equal('John') },
      { age: Equal('17') },
      { id: Equal('2') }
    ]);
    assert.deepStrictEqual(sut('name==John*,age<17'), [
      { name: ILike('John%') },
      { age: LessThan('17') }
    ]);
  });

  it('should be able to perform the operation AND inside operation OR', () => {
    assert.deepStrictEqual(
      sut(
        'franchiseId==8e0ebd11-ad1e-4177-9917-3be0041daa65;type==franchise_employee,franchiseId==8e0ebd11-ad1e-4177-9917-3be0041daa65;type==franchise_owner'
      ),
      [
        {
          franchiseId: Equal('8e0ebd11-ad1e-4177-9917-3be0041daa65'),
          type: Equal('franchise_employee')
        },
        {
          franchiseId: Equal('8e0ebd11-ad1e-4177-9917-3be0041daa65'),
          type: Equal('franchise_owner')
        }
      ]
    );
  });

  it('should be can filter relation items', () => {
    assert.deepStrictEqual(sut('address.state==Arizona;address.city==Phoenix'), [
      {
        address: {
          state: Equal('Arizona'),
          city: Equal('Phoenix')
        }
      }
    ]);
    assert.deepStrictEqual(
      sut('price.amount>20;name==Product;price.currency==USD'),
      [
        {
          name: Equal('Product'),
          price: {
            amount: MoreThan('20'),
            currency: Equal('USD')
          }
        }
      ]
    );
    assert.deepStrictEqual(
      sut('roles.name==Admin;roles.permission.name==Create'),
      [
        {
          roles: {
            name: Equal('Admin'),
            permission: {
              name: Equal('Create')
            }
          }
        }
      ]
    );
  });

  it('should be able to perform the operation AND in the same field', () => {
    assert.deepStrictEqual(sut('amount>0;amount<20'), [
      { amount: And(MoreThan('0'), LessThan('20')) }
    ]);
  });

  it('should flatten AND operations in the same field', () => {
    assert.deepStrictEqual(sut('amount>0;amount<20;amount!=10'), [
      { amount: And(MoreThan('0'), LessThan('20'), Not(Equal('10'))) }
    ]);
  });

  it('should respect AND precedence over OR without parentheses', () => {
    assert.deepStrictEqual(sut('a==1;b==2,c==3;d==4'), [
      { a: Equal('1'), b: Equal('2') },
      { c: Equal('3'), d: Equal('4') }
    ]);
    assert.deepStrictEqual(sut('a==1,b==2;c==3'), [
      { a: Equal('1') },
      { b: Equal('2'), c: Equal('3') }
    ]);
  });

  it('should distribute AND over OR inside parentheses', () => {
    assert.deepStrictEqual(sut('(a==1,b==2);c==3'), [
      { a: Equal('1'), c: Equal('3') },
      { b: Equal('2'), c: Equal('3') }
    ]);
    assert.deepStrictEqual(sut('c==3;(a==1,b==2)'), [
      { c: Equal('3'), a: Equal('1') },
      { c: Equal('3'), b: Equal('2') }
    ]);
  });

  it('should distribute AND between two OR groups', () => {
    assert.deepStrictEqual(sut('(a==1,b==2);(c==3,d==4)'), [
      { a: Equal('1'), c: Equal('3') },
      { a: Equal('1'), d: Equal('4') },
      { b: Equal('2'), c: Equal('3') },
      { b: Equal('2'), d: Equal('4') }
    ]);
  });

  it('should combine the same field in each OR branch', () => {
    assert.deepStrictEqual(sut('amount>0;(amount<20,amount>100)'), [
      { amount: And(MoreThan('0'), LessThan('20')) },
      { amount: And(MoreThan('0'), MoreThan('100')) }
    ]);
  });

  it('should handle deeply nested AND and OR operations', () => {
    assert.deepStrictEqual(
      sut('status==active;((type==a;age>18),(type==b;(age<10,vip==true)))'),
      [
        { status: Equal('active'), type: Equal('a'), age: MoreThan('18') },
        { status: Equal('active'), type: Equal('b'), age: LessThan('10') },
        { status: Equal('active'), type: Equal('b'), vip: Equal('true') }
      ]
    );
  });

  it('should distribute AND over OR with relation fields', () => {
    assert.deepStrictEqual(
      sut('address.state==Arizona;(address.city==Phoenix,address.city==Tucson)'),
      [
        { address: { state: Equal('Arizona'), city: Equal('Phoenix') } },
        { address: { state: Equal('Arizona'), city: Equal('Tucson') } }
      ]
    );
    assert.deepStrictEqual(
      sut('name==Product;(price.amount>20,price.currency==USD)'),
      [
        { name: Equal('Product'), price: { amount: MoreThan('20') } },
        { name: Equal('Product'), price: { currency: Equal('USD') } }
      ]
    );
  });

  it('should combine the same relation field with And', () => {
    assert.deepStrictEqual(sut('price.amount>20;price.amount<50'), [
      { price: { amount: And(MoreThan('20'), LessThan('50')) } }
    ]);
  });
});
