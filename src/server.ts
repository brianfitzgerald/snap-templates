import * as express from "express"
import { graphql, buildSchema, GraphQLType, ExecutionResult } from "graphql"
import * as graphqlHTTP from "express-graphql"
import { config, DynamoDB, SharedIniFileCredentials } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"
import { buildResolver, MappingConfiguration } from "."

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
  type Query {
    song(id: Int): Song
    songByGenre(genre: String, table: String): Song
  }
`)

const mapping: MappingConfiguration = {
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
    rootValue: buildResolver(mapping),
    graphiql: true
  })
)

app.listen(APPLICATION_PORT, () => {
  console.log(`Server is listening on port ${APPLICATION_PORT}`)
})
