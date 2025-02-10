# Repository Setup

1. Clone the repository:

   ```sh
   git clone repo
   ```

2. Rename `.env_sample` to `.env` (Ubuntu):

   ```sh
   mv .env_sample .env
   ```

3. Install dependencies:

   ```sh
   npm install
   ```

---

# Database Setup (PostgreSQL)

1. Start PostgreSQL (Ubuntu):

   ```sh
   sudo -i -u postgres
   ```

   _(For other operating systems, refer to the [PostgreSQL docs](https://www.postgresql.org/docs/17/tutorial.html))_

2. Create the `osc` database:

   ```sh
   createdb osc
   ```

3. Configure the database:

   - Access the database:
     ```sh
     psql -d osc
     ```
   - Check connection:
     ```sh
     \conninfo
     ```
   - Change password (match `.env`):
     ```sh
     \password osc
     ```
     Enter `randompassword` or the one set in `.env`.

---

# Run the Project

1. Start the server:

   ```sh
   npm start
   ```

2. Open GraphQL Playground:  
   [http://localhost:4000/graphql](http://localhost:4000/graphql)

3. Test queries and mutations.

   - register

     ```
     mutation Mutation($username: String!, $password: String!) {
        register(username: $username, password: $password)
     }
     ```

     ```
      {
      "username": "username",
      "password": "1234"
      }
     ```

   - login

     ```

     ```

# Notes

- I had some difficulty understanding how you intended to handle collections. The README isn’t clear on whether collections should be created when a course is added, whether only admins can create them, or if users are allowed to do so as well.

  Here’s how I’m currently handling it—though this approach isn’t ideal for production:

  ```ts
  // If no collectionId is provided, create a new collection
  if (!collectionId && collectionName) {
    // Create a new collection if neither collectionId nor collection data is provided
    collectionData = await prisma.collection.create({
      data: {
        name: collectionName, // The name of the new collection
      },
    });
  }
  ```

- I have some bug for `addCourse` mutation `Argument userId is missing.`
