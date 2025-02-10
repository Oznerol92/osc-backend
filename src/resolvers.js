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
exports.resolvers = void 0;
const client_1 = require("@prisma/client");
const apollo_server_express_1 = require("apollo-server-express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables (e.g., JWT secret)
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const SECRET = process.env.JWT_SECRET || "supersecret";
exports.resolvers = {
    Query: {
        /**
         * Fetches a list of courses with optional sorting and limit.
         * @param limit - (Optional) Number of courses to return.
         * @param sortOrder - (Optional) Sort order ('ASC' or 'DESC').
         * @returns List of courses from the database.
         */
        courses: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { limit, sortOrder }) {
            return yield prisma.course.findMany({
                take: limit, // Limit the number of returned results if provided
                orderBy: { title: sortOrder === "ASC" ? "asc" : "desc" }, // Sort courses by title
            });
        }),
        /**
         * Fetches a single course by its ID.
         * @param id - Course ID.
         * @returns The course object if found.
         */
        course: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { id }) { return prisma.course.findUnique({ where: { id } }); }),
        /**
         * Fetches all course collections with their associated courses.
         * @returns List of collections.
         */
        collections: () => __awaiter(void 0, void 0, void 0, function* () { return prisma.collection.findMany({ include: { courses: true } }); }),
        /**
         * Fetches a single collection by ID, including its courses.
         * @param id - Collection ID.
         * @returns The collection object if found.
         */
        collection: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { id }) {
            return prisma.collection.findUnique({
                where: { id },
                include: { courses: true },
            });
        }),
    },
    Mutation: {
        /**
         * Registers a new user with hashed password.
         * @param username - The user's chosen username.
         * @param password - The user's chosen password.
         * @returns A success message upon registration.
         */
        register: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { username, password }) {
            // Check if the username already exists
            const existingUser = yield prisma.user.findUnique({
                where: { username },
            });
            if (existingUser) {
                throw new Error("Username already exists");
            }
            // Set role to "ADMIN" if username is "admin", otherwise set to "USER"
            // note: this has to be written in a better way for production,
            //       like a list of emails in .env it's already a better way than this
            const role = username === "admin" ? "ADMIN" : "USER";
            // Hash password before saving to database
            const hashedPassword = yield bcrypt_1.default.hash(password, 10);
            yield prisma.user.create({
                data: { username, password: hashedPassword, role },
            });
            return "User registered successfully!";
        }),
        /**
         * Logs in a user by validating credentials and returning a JWT.
         * @param username - The username.
         * @param password - The password.
         * @returns A JWT token if authentication is successful.
         */
        login: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { username, password }) {
            // Find user by username
            const user = yield prisma.user.findUnique({ where: { username } });
            if (!user || !(yield bcrypt_1.default.compare(password, user.password))) {
                throw new apollo_server_express_1.AuthenticationError("Invalid credentials");
            }
            // Generate and return a JWT token
            return jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, SECRET, {
                expiresIn: "7d",
            });
        }),
        /**
         * Adds a new course to the database (Authenticated users only).
         * @param title - Course title.
         * @param description - Course description.
         * @param duration - Course duration in hours.
         * @param outcome - Learning outcome.
         * @param collectionId - (Optional) Associated collection ID.
         * @param collectionName - (Optional) Collection name if collection doesn't exist.
         * @param user - Authenticated user (from context).
         * @returns The created course object.
         */
        addCourse: (_1, _a, _b) => __awaiter(void 0, [_1, _a, _b], void 0, function* (_, { title, description, duration, outcome, collectionId, collectionName, }, { user }) {
            console.log(user);
            if (!user)
                throw new apollo_server_express_1.AuthenticationError("Unauthorized");
            let collectionData;
            // If no collectionId is provided, create a new collection
            if (!collectionId && collectionName) {
                // Create a new collection if no collectionId and collection data is provided
                collectionData = yield prisma.collection.create({
                    data: {
                        name: collectionName, // The name of the new collection
                    },
                });
            }
            // Create the course, either with the existing collectionId or the newly created collection
            const course = yield prisma.course.create({
                data: {
                    title,
                    description,
                    duration,
                    outcome,
                    userId: user.id,
                    collectionId: collectionId || (collectionData === null || collectionData === void 0 ? void 0 : collectionData.id), // Use the provided collectionId or the new collection's ID
                },
            });
            return course;
        }),
        /**
         * Updates an existing course by ID (Authenticated users only).
         * @param id - Course ID.
         * @param title - (Optional) Updated title.
         * @param description - (Optional) Updated description.
         * @param duration - (Optional) Updated duration.
         * @param outcome - (Optional) Updated learning outcome.
         * @param user - Authenticated user (from context).
         * @returns The updated course object.
         */
        updateCourse: (_1, _a, _b) => __awaiter(void 0, [_1, _a, _b], void 0, function* (_, { id, title, description, duration, outcome }, { user }) {
            if (!user)
                throw new apollo_server_express_1.AuthenticationError("Unauthorized");
            // Check if the course exists
            const course = yield prisma.course.findUnique({ where: { id } });
            if (!course) {
                throw new Error("Course not found");
            }
            // Check if the user is trying to update their own course or is an Admin
            if (course.userId !== user.id && user.role !== "ADMIN") {
                throw new apollo_server_express_1.AuthenticationError("Not authorized to update this course");
            }
            return yield prisma.course.update({
                where: { id },
                data: { title, description, duration, outcome },
            });
        }),
        /**
         * Deletes a course by ID (Authenticated users only).
         * @param id - Course ID.
         * @param user - Authenticated user (from context).
         * @returns True if the course was deleted.
         */
        deleteCourse: (_1, _a, _b) => __awaiter(void 0, [_1, _a, _b], void 0, function* (_, { id }, { user }) {
            if (!user)
                throw new apollo_server_express_1.AuthenticationError("Unauthorized");
            // Check if the course exists
            const course = yield prisma.course.findUnique({ where: { id } });
            if (!course) {
                throw new Error("Course not found");
            }
            // Only ADMIN can delete courses
            if (user.role !== "ADMIN") {
                throw new apollo_server_express_1.AuthenticationError("Not authorized to delete this course");
            }
            yield prisma.course.delete({ where: { id } });
            return true;
        }),
    },
};
