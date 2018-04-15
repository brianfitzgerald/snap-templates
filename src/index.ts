import * as express from "express"
import { graphql, buildSchema, GraphQLType, ExecutionResult } from "graphql"
import * as graphqlHTTP from "express-graphql"
import { config, DynamoDB, SharedIniFileCredentials } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"

const credentials = new SharedIniFileCredentials({ profile: "personal" })
config.credentials = credentials
config.update({ region: "us-east-1" })

const ddb = new DynamoDB()

export type MappingConfiguration = {
  [key: string]: ResolverMappingTemplate
}

type DynamoMappingTemplate = {
  [key: string]: any
  kind: "DynamoDB"
  operation: "GetItem" | "Query" | "PutItem"
  TableName: string
  KeyConditionExpression?: DynamoDB.KeyExpression
  ExpressionAttributeNames?: DynamoDB.ExpressionAttributeNameMap
  ExpressionAttributeValues?: DynamoDB.ExpressionAttributeValueMap
  key: { [key: string]: AttributeValue }
  consistentRead: boolean
}
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

// get graphql request
// send to response mapper
// response mapper send that request to a certain resolver based on a mapping object
// resolver completes request

// function that takes in the mapping and generates resolvers for em

const resolvers: Resolvers = {
  DynamoDB: (
    mappingParams: DynamoMappingTemplate,
    requestParams: any,
    response: express.Response
  ) =>
    new Promise((resolve, reject) => {
      const parsedParams = parseParams(mappingParams, requestParams)
      console.log("parsedParams", parsedParams)

      if (mappingParams.operation === "GetItem") {
        const params: DynamoDB.Types.GetItemInput = {
          TableName: mappingParams.TableName,
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
          TableName: mappingParams.TableName,
          KeyConditionExpression: mappingParams.KeyConditionExpression,
          ExpressionAttributeNames: mappingParams.ExpressionAttributeNames,
          ExpressionAttributeValues: mappingParams.ExpressionAttributeValues
        }

        console.log("query params", params)

        resolve({})

        // ddb.query(params, (err, data) => {
        //   if (err) {
        //     console.log("Error", err)
        //     reject(err)
        //   } else {
        //     console.log("Success", data)
        //     resolve(data.Items)
        //   }
        // })
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
  console.log("graphQLQueryParams", graphQLQueryParams)
  // need to generate an identity field as well
  for (var param in graphQLQueryParams) {
    if (paramString.indexOf(`$context.arguments.${param}`) !== -1) {
      parsedParamString = paramString.replace(
        `$context.arguments.${param}`,
        graphQLQueryParams[param] as string
      )
    }
  }
  console.log("parsed param string", parsedParamString)
  return parsedParamString
}

type ResolverMapping = { [key: string]: Function }

export const buildResolver = (
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
