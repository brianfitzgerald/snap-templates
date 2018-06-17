import * as express from "express"
import {
  graphql,
  buildSchema,
  GraphQLType,
  ExecutionResult,
  parse
} from "graphql"
import * as graphqlHTTP from "express-graphql"
import { config, DynamoDB, SharedIniFileCredentials } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"
import { MappingConfiguration, buildResolver } from ".."

const credentials = new SharedIniFileCredentials({ profile: "personal" })
config.credentials = credentials
config.update({ region: "us-east-1" })

const ddb = new DynamoDB()

export const APPLICATION_PORT = 3000

const app = express()

const schemaString = `
type Song {
  id: String
  SpotifyURL: String
  Genre: String
}
type Query {
  song(id: String): Song
  songByGenre(genre: String, table: String): Song
}
type Mutation {
  createSong(id: String, name: String, SpotifyURL: String): String
}
`

const schema = buildSchema(schemaString)

// const parsedAST = parse(schemaString)
// console.log("parsed ast", JSON.stringify(parsedAST, null, 2))

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: buildResolver(ddb, schema, { Song: "ambliss-songs" }),
    graphiql: true
  })
)

app.listen(APPLICATION_PORT, () => {
  console.log(`Server is listening on port ${APPLICATION_PORT}`)
})
