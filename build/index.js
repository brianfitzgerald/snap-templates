"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseParams = (resolverMappingParams, graphQLQueryParams) => {
    const parsedResolverParams = resolverMappingParams;
    const keys = Object.keys(resolverMappingParams);
    keys.map(key => {
        if (typeof resolverMappingParams[key] === "string") {
            parsedResolverParams[key] = replaceArgumentsInField(resolverMappingParams[key], resolverMappingParams, graphQLQueryParams);
        }
        if (typeof parsedResolverParams[key] === "object") {
            exports.parseParams(parsedResolverParams[key], graphQLQueryParams);
        }
    });
    return parsedResolverParams;
};
const replaceArgumentsInField = (paramString, resolverMappingParams, graphQLQueryParams) => {
    let parsedParamString = paramString;
    // need to generate an identity field as well
    for (var param in graphQLQueryParams) {
        if (paramString.indexOf(`$context.arguments.${param}`) !== -1) {
            parsedParamString = paramString.replace(`$context.arguments.${param}`, graphQLQueryParams[param]);
        }
    }
    return parsedParamString;
};
exports.buildResolver = (mappingTemplate, clients) => {
    const finalMapping = {};
    Object.keys(mappingTemplate).forEach(key => {
        const kind = mappingTemplate[key].kind;
        const applicableClient = clients.find(c => c.type === kind);
        if (applicableClient && applicableClient.client) {
            finalMapping[key] = applicableClient.resolver.bind(null, mappingTemplate[key], applicableClient.client);
        }
    });
    return finalMapping;
};
