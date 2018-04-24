import * as express from "express"
import { config, Lambda } from "aws-sdk"
import { parseParams, ClientDefinition, GraphQLParams } from ".."

export type LambdaMappingTemplate = {
  [key: string]: string | Lambda.Types.InvocationRequest
  kind: "Lambda"
  operation: "Invoke"
  query: Lambda.Types.InvocationRequest
}

const Resolver = (
  mappingParams: LambdaMappingTemplate,
  Client: Lambda,
  requestParams: GraphQLParams,
  response: express.Response
) =>
  new Promise((resolve, reject) => {
    const parsedParams = parseParams(mappingParams, requestParams)
    if (mappingParams.operation === "Invoke") {
      const params = parsedParams as LambdaMappingTemplate
      Client.invoke(params.query, (err, response) => {
        if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
    }
  })

export const LambdaResolver = (client: Lambda): ClientDefinition => {
  return {
    type: "Lambda",
    client,
    resolver: Resolver
  }
}
