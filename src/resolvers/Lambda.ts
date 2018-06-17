const Resolver = (mappingParams, Client, requestParams, response) =>
  new Promise((resolve, reject) => {
    const parsedParams = parseParams(mappingParams, requestParams)
    if (mappingParams.operation === "Invoke") {
      const params = parsedParams
      Client.invoke(params.query, (err, response) => {
        if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
    }
  })
exports.LambdaResolver = client => {
  return {
    type: "Lambda",
    client,
    resolver: Resolver
  }
}
