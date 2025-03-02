import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import prisma from "utils/PrismaClient";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { verifyPassword } from "@utils/passwordCrypt";
import { getSafeUser } from "@utils/safeUser";
import { User } from "@prisma/client";

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
    signOut: "/auth",
    verifyRequest: "/auth", // (used for check email message)
    newUser: "/auth", // New users will be directed here on first sign in (leave the property out if not of interest)
  },
  debug: true,
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email" },
        password: { label: "Password", type: "password" },
      },
      type: "credentials",
      name: "Credentials",
      async authorize(credentials) {
        // Add logic here to look up the user from the credentials supplied using prisma
        if (!credentials || !credentials.email || !credentials.password)
          throw new Error("No credentials supplied");
        let user;
        try {
          user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase(),
            },
          });
        } catch (error: any) {
          throw new Error("In [...nextauth].ts line 35\n" + error.message);
        }

        if (!user) {
          // If you return null then an error will be displayed advising the user to check their details.
          // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
          // wrong email
          throw new Error("Wrong email or password");
        } else {
          // Any object returned will be saved in `user` property of the JWT
          let isPasswordCorrect = verifyPassword({
            password: credentials.password,
            hashedPassword: user.password,
            salt: user.salt,
          });
          if (isPasswordCorrect) {
            return getSafeUser(user) as User;
            // wrong password
          } else throw new Error("Wrong email or password");
        }
      },
    }),
    EmailProvider({
      server: {
        service: "gmail",
        host: "smtp.gmail.com",
        secure: false,
        auth: {
          user: process.env.EMAIL_FROM,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      let User = user as User;
      if (account?.type !== "credentials") return true;
      if (!User.emailVerified)
        throw new Error(
          "Email not verified.\n Please verify from the email sent to you, or click to send a new verification link"
        );
      return true;
    },
    async session({ session, token, user }) {
      const userWithHouse = await prisma.user.findUnique({
        where: { id: <string>token.id },
        include: { House: true },
      });
      if (session.user && token.id) {
        const capFN =
          userWithHouse!.firstName[0].toUpperCase() +
          userWithHouse?.firstName.slice(1);
        const capLN =
          userWithHouse!.lastName[0].toUpperCase() +
          userWithHouse?.lastName.slice(1);
        session.user = {
          ...user,
          email: userWithHouse?.email,
          name: `${capFN} ${capLN}`,
          id: <string>token.id,
          houseId: userWithHouse?.houseId || undefined,
        };
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const newUser = getSafeUser(user as User);
        newUser.firstName =
          newUser.firstName.charAt(0).toUpperCase() +
          newUser.firstName.slice(1);
        newUser.lastName =
          newUser.lastName.charAt(0).toUpperCase() + newUser.lastName.slice(1);
        return {
          ...token,
          ...newUser,
        };
      }
      return token;
    },
  },
});
