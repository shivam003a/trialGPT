import z from "zod";

export const chatSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(["system", "user", "assistant"]),
                content: z
                    .string({ required_error: "message is required" })
                    .min(1, "message cannot be empty")
                    .max(2000, "message too long")
                    .trim(),
            }),
        )
        .min(1, "atleast one message is required")
        .max(20, "too many messages"),
});
