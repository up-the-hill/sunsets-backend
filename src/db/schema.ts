import { pgTable, uuid, text, geometry } from "drizzle-orm/pg-core";

// export const usersTable = pgTable("users", {
//   id: uuid().primaryKey(),
//   name: varchar({ length: 255 }).notNull(),
//   age: integer().notNull(),
//   email: varchar({ length: 255 }).notNull().unique(),
// });

export const sunsetsTable = pgTable("sunsets", {
  id: uuid().primaryKey().unique(),
  geo: geometry('geo', { type: 'point' }).notNull(),
})
