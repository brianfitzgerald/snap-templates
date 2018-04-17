import * as express from "express"
import { graphql, buildSchema, GraphQLType, ExecutionResult } from "graphql"
import * as graphqlHTTP from "express-graphql"
import { config, DynamoDB, SharedIniFileCredentials, Lambda } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"

const credentials = new SharedIniFileCredentials({ profile: "personal" })
config.credentials = credentials
config.update({ region: "us-east-1" })

const ddb = new DynamoDB()

export type MappingConfiguration = {
  [key: string]: ResolverMappingTemplate
}

type DynamoQueryTemplate = {
  [key: string]: any
  kind: "DynamoDB"
  operation: "Query"
  query: DynamoDB.Types.QueryInput
}

type DynamoGetItemTemplate = {
  [key: string]: any
  kind: "DynamoDB"
  operation: "GetItem"
  query: DynamoDB.Types.GetItemInput
}

type DynamoScanTemplate = {
  [key: string]: any
  kind: "DynamoDB"
  operation: "Scan"
  query: DynamoDB.Types.ScanInput
}

type DynamoMappingTemplate =
  | DynamoQueryTemplate
  | DynamoGetItemTemplate
  | DynamoScanTemplate

type LambdaMappingTemplate = {
  [key: string]: string | boolean | { [key: string]: AttributeValue }
  kind: "Lambda"
}

type ResolverMappingTemplate = DynamoMappingTemplate | LambdaMappingTemplate

type Resolvers = {
  [key: string]: Function
}

type GraphQLParams = {
  [key: string]: string | boolean
}

type ClientMapping = {
  [key: string]: DynamoDB | Lambda | undefined
  DynamoDB?: DynamoDB
  Lambda?: Lambda
}

const resolvers: Resolvers = {
  DynamoDB: (
    mappingParams: DynamoMappingTemplate,
    client: DynamoDB,
    requestParams: any,
    response: express.Response
  ) =>
    new Promise((resolve, reject) => {
      const parsedParams = parseParams(mappingParams, requestParams)

      if (mappingParams.operation === "GetItem") {
        const params = parsedParams as DynamoGetItemTemplate
        ddb.getItem(params.query, (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data.Item)
          }
        })
        return
      }

      if (mappingParams.operation === "Query") {
        const params = parsedParams as DynamoQueryTemplate
        ddb.query(params.query, (err, data) => {
          if (err) {
            reject(err)
          } else {
            console.log("Success", data)
          }
        })
      }

      if (mappingParams.operation === "Scan") {
        const params = parsedParams as DynamoScanTemplate
        ddb.scan(params.query, (err, data) => {
          if (err) {
            reject(err)
          } else {
            const specificObject = data.Items
              ? {
                  id: data.Items[0].id.S,
                  genre: data.Items[0].genre.S,
                  SpotifyURL: data.Items[0].SpotifyURL.S
                }
              : {}

            resolve(specificObject)
            // resolve(data.Items)
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
    if (typeof resolverMappingParams[key] === "string") {
      parsedResolverParams[key] = replaceArgumentsInField(
        resolverMappingParams[key] as string,
        resolverMappingParams,
        graphQLQueryParams
      )
    }
    if (typeof parsedResolverParams[key] === "object") {
      parseParams(parsedResolverParams[key], graphQLQueryParams)
    }
  })

  return parsedResolverParams
}

const replaceArgumentsInField = (
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
        graphQLQueryParams[param] as string
      )
    }
  }
  return parsedParamString
}

type ResolverMapping = { [key: string]: Function }

export const buildResolver = (
  mappingTemplate: MappingConfiguration,
  clients: ClientMapping = {}
): ResolverMapping => {
  const finalMapping: ResolverMapping = {}

  Object.keys(mappingTemplate).forEach(key => {
    const kind = mappingTemplate[key].kind
    const resolver = resolvers[kind]

    if (!clients[key]) {
      console.warn(`Resolver ${key} does not have a client. It may not work.`)
    }

    finalMapping[key] = resolver.bind(null, mappingTemplate[key], clients[key])
  })

  return finalMapping
}
