import * as express from "express"
import { graphql, buildSchema, GraphQLType, ExecutionResult } from "graphql"
import * as graphqlHTTP from "express-graphql"
import { DynamoDB } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"

type MappingConfiguration = {
  [key: string]: ResolverMappingTemplate
}

type DynamoMappingTemplate = {
  kind: "DynamoDB"
  operation: "GetItem" | "PutItem"
  table: string
  key: { [key: string]: AttributeValue }
  consistentRead: boolean
}
type LambdaMappingTemplate = {
  kind: "Lambda"
}

type ResolverMappingTemplate = DynamoMappingTemplate | LambdaMappingTemplate

export const APPLICATION_PORT = 3000

const app = express()

// get graphql request
// send to response mapper
// response mapper send that request to a certain resolver based on a mapping object
// resolver completes request

// function that takes in the mapping and generates resolvers for em

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

const mapping: MappingConfiguration = {
  person: {
    kind: "DynamoDB",
    operation: "GetItem",
    table: "ambliss-songs",
    consistentRead: false,
    key: {
      id: {
        S: "$context.arguments.id"
      }
    }
  }
}

type Resolvers = {
  [key: string]: Function
}

const resolvers: Resolvers = {
  DynamoDB: (
    mappingParams: DynamoMappingTemplate,
    requestParams: any,
    response: express.Response
  ) => {
    console.log("hit resolver")
    console.log(mappingParams)
    console.log(requestParams)

    if (mappingParams.operation === "GetItem") {
      const params: DynamoDB.Types.GetItemInput = {
        TableName: mappingParams.table,
        Key: mappingParams.key,
        ConsistentRead: mappingParams.consistentRead
      }
      const dynamo = new DynamoDB().getItem(params, (err, data) => {
        console.log(err, data)
      })
    }
  }
}

const buildResolver = (mappingTemplate: MappingConfiguration) => {
  const finalMapping: { [key: string]: Function } = {}

  Object.keys(mappingTemplate).forEach(key => {
    const kind = mappingTemplate[key].kind
    const resolver = resolvers[kind]

    finalMapping[key] = resolver.bind(null, mappingTemplate[key])
  })

  console.log("finalMapping")
  console.log(finalMapping)

  return finalMapping
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
