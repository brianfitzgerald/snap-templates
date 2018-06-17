"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const Resolver = (mappingParams, Client, requestParams, response) => new Promise((resolve, reject) => {
    const parsedParams = __1.parseParams(mappingParams, requestParams);
    if (Array.isArray(Client)) {
        const item = Client.find(item => {
            let isItem = true;
            Object.keys(parsedParams.query).forEach(queryPart => {
                if (item[queryPart] !== parsedParams.query[queryPart]) {
                    isItem = false;
                }
            });
            return isItem;
        });
        resolve(item);
    }
    else {
        let item;
        Object.keys(Client).forEach(clientItem => {
            let isItem = true;
            Object.keys(parsedParams.query).forEach(queryPart => {
                if (Client[clientItem][queryPart] !== parsedParams.query[queryPart]) {
                    isItem = false;
                }
            });
            if (isItem) {
                item = Client[clientItem];
                resolve(item);
            }
        });
    }
    reject();
});
exports.JSONResolver = (client) => {
    return {
        type: "JSON",
        client,
        resolver: Resolver
    };
};
