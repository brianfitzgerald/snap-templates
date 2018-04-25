# Snap

Easily integrate the following services with GraphQL, without having to write resolvers:

* DynamoDB
* AWS Lambda
* JSON
* MongoDB

And easily add more.

Still in a proof-of-concept stage, but very usable.

## Getting Started

* `npm i --save snap-templates`
* Write a mapping configuration, see _Mapping Templates_ below
* Change the root value of your GraphQL schema to use the buildResolver() method:

```typescript
rootValue: buildResolver(mapping, [/* add resolvers here */]),
```

## DynamoDB Example

```typescript
const app = express()
const ddb = new DynamoDB()

const schema = buildSchema(`
  type Song {
    id: String
    SpotifyURL: String
    Genre: String
  }
  type Query {
    song(id: Int): Song
  }
`)

const mappingTemplate: MappingConfiguration = {
  song: {
    kind: "DynamoDB",
    operation: "GetItem",
    query: {
      TableName: "ambliss-songs",
      Key: {
        id: {
          S: "$context.arguments.id"
        }
      }
    }
  }
}

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: buildResolver(mapping, [DynamoResolver(ddb)]),
    graphiql: true
  })
)
```

### JSON Example

```typescript
const schema = buildSchema(`
  type Bear {
    name: String
    breed: String
  }
  type Query {
    bear(name: String): Bear
  }
`)

const mappingTemplate: MappingConfiguration = {
  bear: {
    kind: "JSON",
    query: {
      name: "$context.arguments.name"
    }
  }
}

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: buildResolver(mapping, [JSONResolver(bears)]),
    graphiql: true
  })
)
```

### Mapping Templates

A _mapping template_ defines how Snap accepts parameters for a request coming from GraphQL, and transforms those to requests it makes to _resolver clients_, which make queries against their respective clients.

For example, a mapping template looks like this:

```typescript
songByGenre: {
  kind: "DynamoDB",
  operation: "Scan",
  query: {
    TableName: "ambliss-songs",
    FilterExpression: "genre = :genre",
    ExpressionAttributeValues: {
      ":genre": {
        S: "$context.arguments.genre"
      }
    }
  }
}
```

which takes the `genre` argument from the GraphQL query, and inserts the value of `genre` in the `ExpressionAttributeValues` value of the query that is made to DynamoDB.
You can do this for any field in the mapping template- even the operation being performed.

## Roadmap

Immediate features:

* Response mapping templates
* Client identity access within `context`
* Mutation support

If you want to add support for a kind of template that isn't shown here, you can create a new resolver type by following the format provided in `src/resolvers/basic.ts`.
I'd like to provide resolver support for any service a developer would want to interface with, so if there's a service you'd like to see, open an Issue.

Some clients I'm interested in seeing:

* MongoDB
* S3
* MySQL
* IPFS

Long term features:

* CircleCI for this repo
* Graphical playground for writing mapping templates
* A better solution for remotely loading and storing schemas, such as DynamoDB
* Simple server that can be set up without needing to write JavaScript; add a GUI for writing templates and setting up auth (a la AppSync)

## API Overview

`buildResolver(mappingTemplate: MappingConfiguration, clients: ClientMapping): ResolverMapping`

This is the main way you implement Snap.
It accepts an object whose keys are the mappings from your data sources to a GraphQL query.
The function returns a mapping of GraphQL resolvers, that can be consumed as the rootValue of GraphQL Express.

### Template Types

```typescript
type DynamoQueryTemplate = {
  kind: "DynamoDB"
  operation: "GetItem" | "Query"
  query: DynamoDB.Types.GetItemInput | DynamoDB.Types.QueryInput
}
```

```typescript
type LambdaTemplate = {
  kind: "Lambda"
  FunctionName: string
}
```

```typescript
type JSONMappingTemplate = {
  kind: "JSON"
  query: object
}
```
