import * as express from "express"
import { graphql, buildSchema, GraphQLType, ExecutionResult } from "graphql"
import * as graphqlHTTP from "express-graphql"
import { config, DynamoDB, SharedIniFileCredentials, Lambda } from "aws-sdk"
import { AttributeValue } from "aws-sdk/clients/dynamodb"
import { DynamoMappingTemplate } from "./resolvers/DynamoDB"

export type MappingConfiguration = {
  [key: string]: ResolverMappingTemplate
}

type ResolverMappingTemplate = {
  [key: string]: any
  kind: string
}

type Resolvers = {
  [key: string]: Function
}

type AvailableClient = Function | DynamoDB | Lambda | undefined

// TODO: type the params of these functions
export type ClientDefinition = {
  client: AvailableClient
  type: string
  resolver: Function
}

// needed to add the index signature to dynamically access methods
export interface GraphQLParams {
  [index: string]: string | null | undefined | { [name: string]: any } | boolean
  query: string | null | undefined
  variables: { [name: string]: any } | null | undefined
  operationName: string | null | undefined
  raw: boolean | null | undefined
}

export const parseParams = (
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
  clients: ClientDefinition[]
): ResolverMapping => {
  const finalMapping: ResolverMapping = {}

  Object.keys(mappingTemplate).forEach(key => {
    const kind = mappingTemplate[key].kind
    const applicableClient = clients.find(c => c.type === kind)

    if (applicableClient && applicableClient.client) {
      finalMapping[key] = applicableClient.resolver.bind(
        null,
        mappingTemplate[key],
        applicableClient.client
      )
    }
  })

  return finalMapping
}
