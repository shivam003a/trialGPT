// Import necessary modules
import { chatSchema } from "../zod/chat.schema.js";
import { createChatCompletions } from "../utils/openai.js";
import { createChatCompletionBySarvam } from "../utils/sarvam.js";
import { ZodError } from "zod";

// POST /chat/message - Send a message
export const sendMessage = async (req, res) => {
    try {
        const result = chatSchema.safeParse(req.body);

        if (!result.success) {
            const errorMessages = result?.error?.issues?.map((err) => ({
                error_path: err?.path[0],
                error_message: err?.message,
            }));

            return res.error(400, "invalid input", errorMessages);
        }

        const { messages } = result.data;

        const combinedMessages = [
            { role: "system", content: "You are a helpful assistant." },
            ...messages,
        ];

        const llmResponse = await createChatCompletions({
            model: "openai/gpt-oss-20b:free",
            messages: combinedMessages,
            temperature: 0.7,
            max_tokens: 8000,
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

// POST /chat/message - Send a message
export const sendMessageS = async (req, res) => {
    try {
        const result = chatSchema.safeParse(req.body);

        if (!result.success) {
            const errorMessages = result?.error?.issues?.map((err) => ({
                error_path: err?.path[0],
                error_message: err?.message,
            }));

            return res.error(400, "invalid input", errorMessages);
        }

        const { messages } = result.data;

        const combinedMessages = [
            { role: "system", content: "You are a helpful assistant." },
            ...messages,
        ];

        const llmResponse = await createChatCompletionBySarvam({
            model: "sarvam-105b",
            messages: combinedMessages,
            temperature: 0.7,
            max_tokens: 800,
            stream: true,
            reasoning_effort: null,
            wiki_grounding: true,
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
