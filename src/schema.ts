import { gql } from "apollo-server-express";

export const typeDefs = gql`
  enum Role {
    USER
    ADMIN
  }

  type User {
    id: ID!
    username: String!
    role: Role!
  }

  type Course {
    id: ID!
    title: String!
    description: String!
    duration: String!
    outcome: String!
    userId: String! # User who owns the course
    collection: Collection
    collectionName: String
  }

  type Collection {
    id: ID!
    name: String!
    courses: [Course]
  }

  type Query {
    courses(limit: Int, sortOrder: String): [Course]
    course(id: ID!): Course
    collections: [Collection]
    collection(id: ID!): Collection
  }

  type Mutation {
    register(username: String!, password: String!): String
    login(username: String!, password: String!): String
    addCourse(
      title: String!
      description: String!
      duration: String!
      outcome: String!
      collectionId: ID # Associated collection ID
      collectionName: String # Collection name
    ): Course
    updateCourse(
      id: ID!
      title: String
      description: String
      duration: String
      outcome: String
    ): Course
    deleteCourse(id: ID!): Boolean
  }
`;
