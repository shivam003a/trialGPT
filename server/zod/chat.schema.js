import z from "zod";

export const chatSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                content: z
                    .string({ required_error: "message is required" })
                    .min(1, "message cannot be empty")
                    .max(8000, "message too long")
                    .trim(),
            }),
        )
        .min(1, "atleast one message is required")
        .max(20, "too many messages")
        .refine((msgs) => msgs[msgs.length - 1]?.role === "user", {
            message: "last message must be from user",
        })
        .refine(
            (msgs) =>
                msgs.reduce((acc, m) => acc + m.content.length, 0) <= 10000,
            {
                message: "total message content too long",
            },
        ),
});
