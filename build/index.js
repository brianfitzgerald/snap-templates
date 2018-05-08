"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DynamoResolver = (key, client, field, table, requestParams, response) => {
    console.log("args");
    console.log(key, client, field, requestParams);
    client.getItem();
};
exports.buildResolver = (client, schema, tableMapping) => {
    const finalMapping = {};
    const schemaTypes = schema.getTypeMap();
    const queryType = schema.getQueryType();
    if (queryType) {
        const fields = queryType.getFields();
        Object.keys(fields).forEach(key => {
            finalMapping[key] = DynamoResolver.bind(null, key, client, fields[key], tableMapping[key]);
        });
    }
    console.log(finalMapping);
    return finalMapping;
};
