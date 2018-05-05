import * as express from "express"
import { graphql, buildSchema, GraphQLType, ExecutionResult } from "graphql"
import * as graphqlHTTP from "express-graphql"
import { config, DynamoDB, SharedIniFileCredentials } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"
import { MappingConfiguration, buildResolver } from ".."
import { DynamoResolver, DynamoPutItemTemplate } from "../resolvers/DynamoDB"
import { JSONResolver } from "../resolvers/JSON"

const credentials = new SharedIniFileCredentials({ profile: "personal" })
config.credentials = credentials
config.update({ region: "us-east-1" })

const ddb = new DynamoDB()

export const APPLICATION_PORT = 3000

const app = express()

const schema = buildSchema(`
  type Song {
    id: String
    SpotifyURL: String
    Genre: String
  }
  type Bear {
    name: String
    breed: String
  }
  type Query {
    song(id: String): Song
    songByGenre(genre: String, table: String): Song
    bear(name: String): Bear
  }
  type Mutation {
    createSong(id: String, name: String, SpotifyURL: String): String
  }
`)

const mapping: MappingConfiguration = {
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
  },
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
  },
  createSong: {
    kind: "DynamoDB",
    operation: "PutItem",
    query: {
      TableName: "ambliss-songs"
    }
  },
  bear: {
    kind: "JSON",
    query: {
      name: "$context.arguments.name"
    }
  }
}

const createSong: DynamoPutItemTemplate = {
  kind: "DynamoDB",
  operation: "PutItem",
  query: {
    TableName: "ambliss-songs",
    Item: {
      id: { S: "$context.arguments.id" },
      SpotifyURL: { S: "$context.arguments.SpotifyURL" },
      Genre: { S: "$context.arguments.Genre" }
    }
  }
}

const bears = [
  {
    name: "Carl",
    breed: "black bear"
  },
  {
    name: "Steve",
    breed: "polar bear"
  }
]

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: buildResolver(mapping, [
      DynamoResolver(ddb),
      JSONResolver(bears)
    ]),
    graphiql: true
  })
)

app.listen(APPLICATION_PORT, () => {
  console.log(`Server is listening on port ${APPLICATION_PORT}`)
})
