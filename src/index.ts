import express from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./schema"; // Import GraphQL schema definition
import { resolvers } from "./resolvers"; // Import GraphQL resolvers
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables (e.g., JWT secret)
dotenv.config();

// Initialize an Express application
const app = express(); // No need to explicitly type as `Application`

// Secret key for JWT authentication
const SECRET = process.env.JWT_SECRET || "supersecret";

/**
 * The interface for the user object in context, based on the JWT payload.
 */
interface AuthPayload {
  id: string;
  username: string;
  role: string;
}

/**
 * Type for GraphQL context, including the user object.
 */
interface Context {
  user?: AuthPayload;
}

/**
 * Creates a new Apollo Server instance with:
 * - typeDefs: The GraphQL schema definition.
 * - resolvers: The functions handling GraphQL queries and mutations.
 * - context: Middleware to authenticate users via JWT.
 */
const server = new ApolloServer({
  typeDefs, // GraphQL schema
  resolvers, // Resolver functions

  // Context function runs on each request to check for authentication
  context: ({ req }) => {
    // Extract the authorization token from request headers
    const token = req.headers.authorization || "";

    try {
      // Verify and decode the JWT token
      const user = jwt.verify(token, SECRET) as AuthPayload;
      return { user }; // Attach user data to the context if token is valid
    } catch {
      return {}; // Return an empty context if token is invalid or missing
    }
  },
});

/**
 * Asynchronous function to start the Apollo Server and apply middleware
 */
async function startServer() {
  await server.start(); // Start the Apollo Server

  // Apply Apollo GraphQL middleware to the Express app
  server.applyMiddleware({ app: app as any }); // Casting `app` as `any` to bypass type conflict

  // Start the Express server on port 4000
  app.listen(4000, () =>
    console.log("🚀 Server running at http://localhost:4000/graphql")
  );
}

// Invoke the function to start the server
startServer();
