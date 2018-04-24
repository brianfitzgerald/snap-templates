import * as express from "express"
import { config, DynamoDB, SharedIniFileCredentials, Lambda } from "aws-sdk"
import { parseParams, ClientDefinition } from ".."

export type DynamoQueryTemplate = {
  [key: string]: any
  kind: "DynamoDB"
  operation: "Query"
  query: DynamoDB.Types.QueryInput
}

export type DynamoGetItemTemplate = {
  [key: string]: any
  kind: "DynamoDB"
  operation: "GetItem"
  query: DynamoDB.Types.GetItemInput
}

export type DynamoScanTemplate = {
  [key: string]: any
  kind: "DynamoDB"
  operation: "Scan"
  query: DynamoDB.Types.ScanInput
}

export type DynamoMappingTemplate =
  | DynamoQueryTemplate
  | DynamoGetItemTemplate
  | DynamoScanTemplate

const Resolver = (
  mappingParams: DynamoMappingTemplate,
  DynamoClient: DynamoDB,
  requestParams: any,
  response: express.Response
) =>
  new Promise((resolve, reject) => {
    const parsedParams = parseParams(mappingParams, requestParams)

    if (mappingParams.operation === "GetItem") {
      const params = parsedParams as DynamoGetItemTemplate
      DynamoClient.getItem(params.query, (err, data) => {
        if (err) {
          reject(err)
        } else if (data.Item) {
          const item = DynamoDB.Converter.unmarshall(data.Item)
          resolve(item)
        }
      })
      return
    }

    if (mappingParams.operation === "Query") {
      const params = parsedParams as DynamoQueryTemplate
      DynamoClient.query(params.query, (err, data) => {
        if (err) {
          reject(err)
        } else {
          if (data.Items) {
            const parsedItems = data.Items.map(item =>
              DynamoDB.Converter.unmarshall(item)
            )
            resolve(parsedItems)
          }
        }
      })
    }

    if (mappingParams.operation === "Scan") {
      const params = parsedParams as DynamoScanTemplate
      DynamoClient.scan(params.query, (err, data) => {
        if (err) {
          console.log("Error", err)
          reject(err)
        } else {
          // refactor this when response templates are implemented
          if (data.Items) {
            const parsedItems = data.Items.map(item =>
              DynamoDB.Converter.unmarshall(item)
            )
            resolve(parsedItems)
          }
        }
      })
    }
  })

export const DynamoResolver = (client: DynamoDB): ClientDefinition => {
  return {
    type: "DynamoDB",
    client,
    resolver: Resolver
  }
}
