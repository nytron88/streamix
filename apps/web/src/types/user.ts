import { User as PrismaUser } from "@prisma/client";
import { UserIdSchema } from "@/schemas/userIdSchema";
import { z } from "zod";

export type User = PrismaUser;

export type UserId = z.infer<typeof UserIdSchema>;
