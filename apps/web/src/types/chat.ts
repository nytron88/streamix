import { z } from "zod";
import { ChatSettingsUpdateSchema } from "@/schemas/chatSettingSchema";

export type ChatSettingsInput = z.infer<typeof ChatSettingsUpdateSchema>;
