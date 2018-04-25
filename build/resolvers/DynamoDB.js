"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = require("aws-sdk");
const __1 = require("..");
const Resolver = (mappingParams, DynamoClient, requestParams, response) => new Promise((resolve, reject) => {
    const parsedParams = __1.parseParams(mappingParams, requestParams);
    if (mappingParams.operation === "GetItem") {
        const params = parsedParams;
        DynamoClient.getItem(params.query, (err, data) => {
            if (err) {
                reject(err);
            }
            else if (data.Item) {
                const item = aws_sdk_1.DynamoDB.Converter.unmarshall(data.Item);
                resolve(item);
            }
        });
        return;
    }
    if (mappingParams.operation === "Query") {
        const params = parsedParams;
        DynamoClient.query(params.query, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                if (data.Items) {
                    const parsedItems = data.Items.map(item => aws_sdk_1.DynamoDB.Converter.unmarshall(item));
                    resolve(parsedItems);
                }
            }
        });
    }
    if (mappingParams.operation === "Scan") {
        const params = parsedParams;
        DynamoClient.scan(params.query, (err, data) => {
            if (err) {
                console.log("Error", err);
                reject(err);
            }
            else {
                // refactor this when response templates are implemented
                if (data.Items) {
                    const parsedItems = data.Items.map(item => aws_sdk_1.DynamoDB.Converter.unmarshall(item));
                    resolve(parsedItems);
                }
            }
        });
    }
});
exports.DynamoResolver = (client) => {
    return {
        type: "DynamoDB",
        client,
        resolver: Resolver
    };
};
