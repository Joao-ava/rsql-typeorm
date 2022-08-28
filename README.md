# rsql-typeorm

Is a implementation RSQL adapter to typeorm.

## Operations

|Operation|Description|
|-|-|
|`==`|Equals operation|
|`>`|Greather than operation|
|`>=`|Greather than or equal operation|
|`<`|Less than operation|
|`<=`|Less than or equal operation|
|`!=`|Not equals operation|
|`=in=`|In list operation|
|`=out=`|Out list operation|
|`;`|And operation|
|`,`|Or operation|

## Examples

Get from expression [@rsql/builder](https://github.com/piotr-oles/rsql/tree/master/packages/builder):

```ts
import builder from '@rsql/builder';
import { adaptRsqlExpressionToQuery } from 'rsql-typeorm';

// equals
adaptRsqlExpressionToQuery(builder.eq(selector, value));
```

Get from string:

```ts
import { adaptRsqlStringToQuery } from 'rsql-typeorm';

// equals
adaptRsqlStringToQuery('name==John');

// greater than
adaptRsqlStringToQuery('createdAt>2022-02-02');

// in
adaptRsqlStringToQuery('name=in=(John,Doe)');

// like
adaptRsqlStringToQuery('name==*John*');

// complex query
adaptRsqlStringToQuery('title==foo*;(updated<-P1D,title==*bar)');
```

For more details about [FIQL read RFC about](https://datatracker.ietf.org/doc/html/draft-nottingham-atompub-fiql-00).
