import * as express from "express"
import { graphql, buildSchema, GraphQLType, ExecutionResult } from "graphql"
import * as graphqlHTTP from "express-graphql"
import { DynamoDB } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"

type DynamoMappingTemplate = {
  operation: "GetItem" | "PutItem"
  table: string
  key: { [key: string]: AttributeValue }
  consistentRead: boolean
}
type LambdaMappingTemplate = {}

type ResolverMappingTemplate = DynamoMappingTemplate | LambdaMappingTemplate

export const APPLICATION_PORT = 3000

const app = express()

const resolvers = {
  dynamo: {
    getItem: (request: DynamoMappingTemplate, response: express.Response) => {
      const params: DynamoDB.Types.GetItemInput = {
        TableName: request.table,
        Key: request.key
      }
      const dynamo = new DynamoDB().getItem(params, (err, data) => {
        response.json(data)
      })
    }
  }
}

const schema = buildSchema(`
  type Person {
    id: Int
    firstName: String
  }
  type Query {
    person(id: Int): Person
  }
`)

const persons = [
  {
    id: 1,
    firstName: "Brian"
  },
  {
    id: 2,
    firstName: "John"
  },
  {
    id: 3,
    firstName: "Conner"
  }
]

const rootResolver = {
  person: ({ id }: { id: number }) => {
    const person = persons.filter(p => p.id === id)[0]
    return persons.filter(p => p.id === id)[0]
  }
}

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: rootResolver,
    graphiql: true
  })
)

app.listen(APPLICATION_PORT, () => {
  console.log(`Server is listening on port ${APPLICATION_PORT}`)
})
