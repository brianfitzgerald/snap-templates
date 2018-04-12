import * as express from "express"
import { graphql, buildSchema, GraphQLType, ExecutionResult } from "graphql"
import * as graphqlHTTP from "express-graphql"
import { config, DynamoDB, SharedIniFileCredentials } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"

const credentials = new SharedIniFileCredentials({ profile: "personal" })
config.credentials = credentials
config.update({ region: "us-east-1" })

const ddb = new DynamoDB()

type MappingConfiguration = {
  [key: string]: ResolverMappingTemplate
}

type DynamoMappingTemplate = {
  [key: string]: any
  kind: "DynamoDB"
  operation: "GetItem" | "Query" | "PutItem"
  table: string
  key: { [key: string]: AttributeValue }
  consistentRead: boolean
}
type LambdaMappingTemplate = {
  [key: string]: string | boolean | { [key: string]: AttributeValue }
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
  type Song {
    id: Int
    SpotifyURL: String
    Genre: String
  }
  type Query {
    song(id: Int): Song
    songByGenre(genre: String): Song
  }
`)

const mapping: MappingConfiguration = {
  song: {
    kind: "DynamoDB",
    operation: "GetItem",
    table: "ambliss-songs",
    consistentRead: false,
    key: {
      id: {
        S: "c35b214b-50c3-4581-a0c5-08c1fa7bb010"
      }
    }
  },
  songByGenre: {
    kind: "DynamoDB",
    operation: "Query",
    table: "$context.arguments.table",
    consistentRead: false,
    key: {
      genre: {
        S: "$context.arguments.genre"
      }
    }
  }
}

type Resolvers = {
  [key: string]: Function
}

type GraphQLParams = {
  [key: string]: string | boolean
}

const resolvers: Resolvers = {
  DynamoDB: (
    mappingParams: DynamoMappingTemplate,
    requestParams: any,
    response: express.Response
  ) =>
    new Promise((resolve, reject) => {
      if (mappingParams.operation === "GetItem") {
        const parsedParams = parseParams(mappingParams, requestParams)

        const params: DynamoDB.Types.GetItemInput = {
          TableName: mappingParams.table,
          Key: mappingParams.key,
          ConsistentRead: mappingParams.consistentRead
        }

        ddb.getItem(params, (err, data) => {
          if (err) {
            console.log("Error", err)
            reject(err)
          } else {
            console.log("Success", data)
            resolve(data.Item)
          }
        })
        return
      }

      if (mappingParams.operation === "Query") {
        const params: DynamoDB.Types.QueryInput = {
          TableName: "Movies",
          KeyConditionExpression: "#yr = :yyyy",
          ExpressionAttributeNames: {
            "#yr": "year"
          },
          ExpressionAttributeValues: {
            ":yyyy": {
              N: "1985"
            }
          }
        }

        ddb.query(params, (err, data) => {
          if (err) {
            console.log("Error", err)
            reject(err)
          } else {
            console.log("Success", data)
            resolve(data.Items)
          }
        })
      }
    })
}

const parseParams = (
  resolverMappingParams: ResolverMappingTemplate,
  graphQLQueryParams: GraphQLParams
): ResolverMappingTemplate => {
  const parsedResolverParams = resolverMappingParams
  const keys = Object.keys(resolverMappingParams)
  keys.map(key => {
    console.log()

    if (typeof resolverMappingParams[key] === "string") {
      parsedResolverParams[key] = parseForContextArguments(
        resolverMappingParams[key] as string,
        resolverMappingParams,
        graphQLQueryParams
      )
    }
    if (typeof parsedResolverParams[key] === "object") {
      const childKeys = Object.keys(resolverMappingParams[key])
      if (childKeys.length > 0) {
        console.log("object has keys ", key)
        childKeys.map(childKey => {
          if (typeof resolverMappingParams[key][childKey] === "string") {
            parsedResolverParams[key][childKey] = parseForContextArguments(
              resolverMappingParams[key] as string,
              resolverMappingParams,
              graphQLQueryParams
            )
          }
        })
      }
    }
  })

  return parsedResolverParams
}

const parseForContextArguments = (
  paramString: string,
  resolverMappingParams: ResolverMappingTemplate,
  graphQLQueryParams: GraphQLParams
): string => {
  let parsedParamString = paramString
  // need to generate an identity field as well
  for (var param in graphQLQueryParams) {
    if (paramString.indexOf(`$context.arguments.${param}`) !== -1) {
      parsedParamString = paramString.replace(
        `$context.arguments.${param}`,
        param
      )
    }
  }
  return parsedParamString
}

type ResolverMapping = { [key: string]: Function }

const buildResolver = (
  mappingTemplate: MappingConfiguration
): ResolverMapping => {
  const finalMapping: ResolverMapping = {}

  Object.keys(mappingTemplate).forEach(key => {
    const kind = mappingTemplate[key].kind
    const resolver = resolvers[kind]

    finalMapping[key] = resolver.bind(null, mappingTemplate[key])
  })

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
