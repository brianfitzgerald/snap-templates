"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const graphql_1 = require("graphql");
const graphqlHTTP = require("express-graphql");
const aws_sdk_1 = require("aws-sdk");
const __1 = require("..");
const credentials = new aws_sdk_1.SharedIniFileCredentials({ profile: "personal" });
aws_sdk_1.config.credentials = credentials;
aws_sdk_1.config.update({ region: "us-east-1" });
const ddb = new aws_sdk_1.DynamoDB();
exports.APPLICATION_PORT = 3000;
const app = express();
const schemaString = `
type Song {
  id: String
  SpotifyURL: String
  Genre: String
}
type Query {
  song(id: String): Song
  songByGenre(genre: String, table: String): Song
}
type Mutation {
  createSong(id: String, name: String, SpotifyURL: String): String
}
`;
const schema = graphql_1.buildSchema(schemaString);
// const parsedAST = parse(schemaString)
// console.log("parsed ast", JSON.stringify(parsedAST, null, 2))
app.use("/graphql", graphqlHTTP({
    schema: schema,
    rootValue: __1.buildResolver(ddb, schema, { Song: "ambliss-songs" }),
    graphiql: true
}));
app.listen(exports.APPLICATION_PORT, () => {
    console.log(`Server is listening on port ${exports.APPLICATION_PORT}`);
});
