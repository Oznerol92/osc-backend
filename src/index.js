"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const schema_1 = require("./schema"); // Import GraphQL schema definition
const resolvers_1 = require("./resolvers"); // Import GraphQL resolvers
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables (e.g., JWT secret)
dotenv_1.default.config();
// Initialize an Express application
const app = (0, express_1.default)(); // No need to explicitly type as `Application`
// Secret key for JWT authentication
const SECRET = process.env.JWT_SECRET || "supersecret";
/**
 * Creates a new Apollo Server instance with:
 * - typeDefs: The GraphQL schema definition.
 * - resolvers: The functions handling GraphQL queries and mutations.
 * - context: Middleware to authenticate users via JWT.
 */
const server = new apollo_server_express_1.ApolloServer({
    typeDefs: schema_1.typeDefs, // GraphQL schema
    resolvers: // GraphQL schema
    resolvers_1.resolvers, // Resolver functions
    // Context function runs on each request to check for authentication
    context: ({ req }) => {
        // Extract the authorization token from request headers
        const token = req.headers.authorization || "";
        try {
            // Verify and decode the JWT token
            const user = jsonwebtoken_1.default.verify(token, SECRET);
            return { user }; // Attach user data to the context if token is valid
        }
        catch (_a) {
            return {}; // Return an empty context if token is invalid or missing
        }
    },
});
/**
 * Asynchronous function to start the Apollo Server and apply middleware
 */
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield server.start(); // Start the Apollo Server
        // Apply Apollo GraphQL middleware to the Express app
        server.applyMiddleware({ app: app }); // Casting `app` as `any` to bypass type conflict
        // Start the Express server on port 4000
        app.listen(4000, () => console.log("🚀 Server running at http://localhost:4000/graphql"));
    });
}
// Invoke the function to start the server
startServer();
