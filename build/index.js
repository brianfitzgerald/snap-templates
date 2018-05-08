"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = require("aws-sdk");
const DynamoResolver = (key, client, field, table, requestParams, response) => new Promise((resolve, reject) => {
    // use projection expression
    client.getItem({
        TableName: table,
        Key: {
            id: {
                S: requestParams.id
            }
        }
    }, (err, result) => {
        if (err || !result.Item) {
            reject(err);
        }
        else {
            const item = aws_sdk_1.DynamoDB.Converter.unmarshall(result.Item);
            resolve(item);
        }
    });
});
exports.buildResolver = (client, schema, tableMapping) => {
    const finalMapping = {};
    const schemaTypes = schema.getTypeMap();
    const queryType = schema.getQueryType();
    if (queryType) {
        const fields = queryType.getFields();
        Object.keys(fields).forEach(key => {
            const tableType = fields[key].type.toString();
            finalMapping[key] = DynamoResolver.bind(null, key, client, fields[key], tableMapping[tableType]);
        });
    }
    console.log(finalMapping);
    return finalMapping;
};
