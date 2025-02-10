import { PrismaClient, Course } from "@prisma/client";
import { AuthenticationError } from "apollo-server-express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables (e.g., JWT secret)
dotenv.config();

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "supersecret";

// Define the structure of authentication payload in JWT
interface AuthPayload {
  id: string;
  role: string;
}

// Define the structure of the GraphQL context, which may include authenticated user data
interface Context {
  user?: AuthPayload;
}

interface AddCourseInput {
  title: string;
  description: string;
  duration: string;
  outcome: string;
  collectionId?: string | null; // Optional: existing collection ID
  collectionName?: string; // Optional: name of the new collection if no collectionId
}

export const resolvers = {
  Query: {
    /**
     * Fetches a list of courses with optional sorting and limit.
     * @param limit - (Optional) Number of courses to return.
     * @param sortOrder - (Optional) Sort order ('ASC' or 'DESC').
     * @returns List of courses from the database.
     */
    courses: async (
      _: any,
      { limit, sortOrder }: { limit?: number; sortOrder?: string }
    ) => {
      return await prisma.course.findMany({
        take: limit, // Limit the number of returned results if provided
        orderBy: { title: sortOrder === "ASC" ? "asc" : "desc" }, // Sort courses by title
      });
    },

    /**
     * Fetches a single course by its ID.
     * @param id - Course ID.
     * @returns The course object if found.
     */
    course: async (_: any, { id }: { id: string }) =>
      prisma.course.findUnique({ where: { id } }),

    /**
     * Fetches all course collections with their associated courses.
     * @returns List of collections.
     */
    collections: async () =>
      prisma.collection.findMany({ include: { courses: true } }),

    /**
     * Fetches a single collection by ID, including its courses.
     * @param id - Collection ID.
     * @returns The collection object if found.
     */
    collection: async (_: any, { id }: { id: string }) =>
      prisma.collection.findUnique({
        where: { id },
        include: { courses: true },
      }),
  },

  Mutation: {
    /**
     * Registers a new user with hashed password.
     * @param username - The user's chosen username.
     * @param password - The user's chosen password.
     * @returns A success message upon registration.
     */
    register: async (
      _: any,
      { username, password }: { username: string; password: string }
    ) => {
      // Check if the username already exists
      const existingUser = await prisma.user.findUnique({
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
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { username, password: hashedPassword, role },
      });

      return "User registered successfully!";
    },

    /**
     * Logs in a user by validating credentials and returning a JWT.
     * @param username - The username.
     * @param password - The password.
     * @returns A JWT token if authentication is successful.
     */
    login: async (
      _: any,
      { username, password }: { username: string; password: string }
    ) => {
      // Find user by username
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new AuthenticationError("Invalid credentials");
      }

      // Generate and return a JWT token
      return jwt.sign({ userId: user.id, role: user.role }, SECRET, {
        expiresIn: "7d",
      });
    },

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
    addCourse: async (
      _: any,
      {
        title,
        description,
        duration,
        outcome,
        collectionId,
        collectionName,
      }: AddCourseInput,
      { user }: Context
    ) => {
      console.log(user);
      if (!user) throw new AuthenticationError("Unauthorized");

      let collectionData;

      // If no collectionId is provided, create a new collection
      if (!collectionId && collectionName) {
        // Create a new collection if no collectionId and collection data is provided
        collectionData = await prisma.collection.create({
          data: {
            name: collectionName, // The name of the new collection
          },
        });
      }

      // Create the course, either with the existing collectionId or the newly created collection
      const course = await prisma.course.create({
        data: {
          title,
          description,
          duration,
          outcome,
          userId: user.id,
          collectionId: collectionId || collectionData?.id, // Use the provided collectionId or the new collection's ID
        },
      });

      return course;
    },

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
    updateCourse: async (
      _: any,
      { id, title, description, duration, outcome }: Course,
      { user }: Context
    ) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      // Check if the course exists
      const course = await prisma.course.findUnique({ where: { id } });
      if (!course) {
        throw new Error("Course not found");
      }

      // Check if the user is trying to update their own course or is an Admin
      if (course.userId !== user.id && user.role !== "ADMIN") {
        throw new AuthenticationError("Not authorized to update this course");
      }

      return await prisma.course.update({
        where: { id },
        data: { title, description, duration, outcome },
      });
    },

    /**
     * Deletes a course by ID (Authenticated users only).
     * @param id - Course ID.
     * @param user - Authenticated user (from context).
     * @returns True if the course was deleted.
     */
    deleteCourse: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      // Check if the course exists
      const course = await prisma.course.findUnique({ where: { id } });
      if (!course) {
        throw new Error("Course not found");
      }

      // Only ADMIN can delete courses
      if (user.role !== "ADMIN") {
        throw new AuthenticationError("Not authorized to delete this course");
      }

      await prisma.course.delete({ where: { id } });
      return true;
    },
  },
};
