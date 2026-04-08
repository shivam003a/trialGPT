// Import necessary modules
import { chatSchema } from "../zod/chat.schema.js";
import { createChatCompletions } from "../utils/openai.js";

// POST /chat/message - Send a message
export const sendMessage = async (req, res) => {
    try {
        const result = chatSchema.safeParse(req.body);

        if (!result.success) {
            const errorMessages = result.error
                .map((err) => err.message)
                .join(", ");

            return res.error(400, "invalid input", errorMessages);
        }

        const { query } = result.data;

        const messages = [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: query },
        ];

        const llmResponse = await createChatCompletions({
            model: "openai/gpt-oss-20b:free",
            messages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: true,
        });

        res.setHeader("Content-Type", "event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const chunk of llmResponse) {
            const content = chunk?.choices?.[0]?.delta?.content;

            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        console.error("Error processing message:", err);
        return res.error(400, "Invalid message format");
    }
};
