
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";

export const createAuth = (db, client) => {
  return betterAuth({
    database: mongodbAdapter(db, {
      client,
    }),

    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,

    trustedOrigins: ["http://localhost:3000"],

    emailAndPassword: {
      enabled: true,
    },

    plugins: [
      jwt(),
    ],
  });
};
