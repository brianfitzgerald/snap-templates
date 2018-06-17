"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const graphql_1 = require("graphql");
const graphqlHTTP = require("express-graphql");
const aws_sdk_1 = require("aws-sdk");
const _1 = require(".");
const credentials = new aws_sdk_1.SharedIniFileCredentials({ profile: "personal" });
aws_sdk_1.config.credentials = credentials;
aws_sdk_1.config.update({ region: "us-east-1" });
const ddb = new aws_sdk_1.DynamoDB();
exports.APPLICATION_PORT = 3000;
const app = express();
const schema = graphql_1.buildSchema(`
  type Song {
    id: String
    SpotifyURL: String
    Genre: String
  }
  type Query {
    song(id: Int): Song
    songByGenre(genre: String, table: String): Song
  }
`);
const mapping = {
    song: {
        kind: "DynamoDB",
        operation: "GetItem",
        query: {
            TableName: "ambliss-songs",
            Key: {
                id: {
                    S: "c35b214b-50c3-4581-a0c5-08c1fa7bb010"
                }
            }
        }
    },
    songByGenre: {
        kind: "DynamoDB",
        operation: "Scan",
        query: {
            TableName: "ambliss-songs",
            FilterExpression: "genre = :genre",
            ExpressionAttributeValues: {
                ":genre": {
                    S: "$context.arguments.genre"
                }
            }
        }
    }
};
app.use("/graphql", graphqlHTTP({
    schema: schema,
    rootValue: _1.buildResolver(mapping),
    graphiql: true
}));
app.listen(exports.APPLICATION_PORT, () => {
    console.log(`Server is listening on port ${exports.APPLICATION_PORT}`);
});
