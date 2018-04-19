# Snap

![screens](https://github.com/brianfitzgerald/snap/blob/master/logo.svg)

Easily integrate the following services with GraphQL, without having to write resolvers:

* DynamoDB
* AWS Lambda
* MongoDB
* JSON

And easily add more.

## Resolver Mapping Templates

## Getting Started

`npm i snap-templates`

## Code Samples

```
const app = express()

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
}

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: buildResolver(mappingTemplate),
    graphiql: true
  })
)
```

## API Overview

`buildResolver(mappingTemplate: MappingConfiguration, clients: ClientMapping): ResolverMapping`

This is the main way you implement Snap.
It accepts an object whose keys are the mappings from your data sources to a GraphQL query.
The function returns a mapping of GraphQL resolvers, that can be consumed as the rootValue of GraphQL Express.

### Mapping Templates

Templates

```
type DynamoQueryTemplate = {
    kind: "DynamoDB"
    operation: "GetItem" | "Query"
    query: DynamoDB.Types.GetItemInput | DynamoDB.Types.QueryInput
}
```

```
type DynamoQueryTemplate = {
    kind: "Lambda"
    FunctionName: string
}
```
