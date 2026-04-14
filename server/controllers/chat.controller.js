// Import necessary modules
import { chatSchema } from "../zod/chat.schema.js";
import { createChatCompletions } from "../utils/openai.js";
import { createChatCompletionBySarvam } from "../utils/sarvam.js";
import { systemPrompt } from "../utils/contants.js";

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
            max_tokens: 800,
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
        const controller = new AbortController();
        res.on("close", () => {
            if (!res.writableEnded) {
                controller.abort();
            }
        });

        const validation = chatSchema.safeParse(req.body);

        if (!validation.success) {
            const error = validation?.error?.issues?.map((err) => ({
                error_path: err?.path[0],
                error_message: err?.message,
            }));

            return res.error(400, "invalid input", error);
        }

        const { messages } = validation.data;

        const combinedMessages = [
            {
                role: "system",
                content: systemPrompt,
            },
            ...messages,
        ];

        const llmResponse = await createChatCompletionBySarvam({
            model: "sarvam-105b",
            messages: combinedMessages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: true,
            reasoning_effort: "low",
            wiki_grounding: true,
            abortSignal: controller.signal,
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        const heartbeat = setInterval(() => {
            if (!res.writableEnded) {
                res.write(`: ping\n\n`);
            }
        }, 15000);

        try {
            for await (const chunk of llmResponse) {
                if (res.writableEnded) break;

                const content = chunk?.choices?.[0]?.delta?.content;
                if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }

            if (!res.writableEnded) {
                res.write(`data: [DONE]\n\n`);
                res.end();
            }
        } catch (streamErr) {
            if (streamErr.name === "AbortError") return;

            console.log("streaming error: ", streamErr);

            if (!res.writableEnded) {
                res.end();
            }
        } finally {
            clearInterval(heartbeat);
        }
    } catch (err) {
        console.error("Error processing message:", err);

        if (err.name === "AbortError") {
            console.log("gotcha yaa");
            return;
        }
        // ✅ 2. If headers not sent → normal error
        if (!res.headersSent) {
            return res.error(
                err.statusCode || 500,
                err?.body?.error?.message || "Internal server error",
            );
        }
        if (!res.writableEnded) {
            res.end();
        }
    }
};
