"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const graphql_1 = require("graphql");
const graphqlHTTP = require("express-graphql");
const aws_sdk_1 = require("aws-sdk");
const __1 = require("..");
const DynamoDB_1 = require("../resolvers/DynamoDB");
const JSON_1 = require("../resolvers/JSON");
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
  type Bear {
    name: String
    breed: String
  }
  type Query {
    song(id: String): Song
    songByGenre(genre: String, table: String): Song
    bear(name: String): Bear
  }
  type Mutation {
    createSong(id: String, name: String, SpotifyURL: String): String
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
                    S: "$context.arguments.id"
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
    },
    createSong: {
        kind: "DynamoDB",
        operation: "PutItem",
        query: {
            TableName: "ambliss-songs"
        }
    },
    bear: {
        kind: "JSON",
        query: {
            name: "$context.arguments.name"
        }
    }
};
const createSong = {
    kind: "DynamoDB",
    operation: "PutItem",
    query: {
        TableName: "ambliss-songs",
        Item: {
            id: { S: "$context.arguments.id" },
            SpotifyURL: { S: "$context.arguments.SpotifyURL" },
            Genre: { S: "$context.arguments.Genre" }
        }
    }
};
const bears = [
    {
        name: "Carl",
        breed: "black bear"
    },
    {
        name: "Steve",
        breed: "polar bear"
    }
];
app.use("/graphql", graphqlHTTP({
    schema: schema,
    rootValue: __1.buildResolver(mapping, [
        DynamoDB_1.DynamoResolver(ddb),
        JSON_1.JSONResolver(bears)
    ]),
    graphiql: true
}));
app.listen(exports.APPLICATION_PORT, () => {
    console.log(`Server is listening on port ${exports.APPLICATION_PORT}`);
});
