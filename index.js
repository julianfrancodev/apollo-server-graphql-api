import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import {typeDefs} from './data/schema';
import {resolvers} from "./data/resolvers";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';


dotenv.config(({path: 'variables.env'}));


const app = express();

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({req}) => {
        const token = req.headers['authorization'];
        if (token !== null) {
            try {
                const userUp = await jwt.verify(token, process.env.SECRET);
                req.userUp = userUp;
                {
                    return userUp;
                }
            } catch (e) {
                console.log(e);
            }
        }
    }
});

server.applyMiddleware({app});

app.listen({port: 4000},
    () => console.log(`server is running in http://localhost:4000${server.graphqlPath}`));