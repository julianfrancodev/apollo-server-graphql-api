import {importSchema} from "graphql-import";

const typeDefs = importSchema('data/schema.graphql');

export {typeDefs};