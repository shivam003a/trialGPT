// Import necessary modules
import { chatSchema } from "../zod/chat.schema.js";
import { createChatCompletions } from "../utils/openai.js";
import { createChatCompletionBySarvam } from "../utils/sarvam.js";
import { systemPrompt } from "../utils/contants.js";

// Stream response from OpenAI
export const sendMessage = async (req, res) => {
    try {
        // Validate request body
        const result = chatSchema.safeParse(req.body);

        if (!result.success) {
            const errorMessages = result?.error?.issues?.map((err) => ({
                error_path: err?.path[0],
                error_message: err?.message,
            }));

            return res.error(400, "invalid input", errorMessages);
        }

        // Extract messages
        const { messages } = result.data;

        // Combine system prompt with user messages
        const combinedMessages = [
            { role: "system", content: "You are a helpful assistant." },
            ...messages,
        ];

        // Get response from OpenAI
        const llmResponse = await createChatCompletions({
            model: "openai/gpt-oss-20b:free",
            messages: combinedMessages,
            temperature: 0.7,
            max_tokens: 800,
            stream: true,
        });

        // Set streaming headers
        res.setHeader("Content-Type", "event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Stream response chunks
        for await (const chunk of llmResponse) {
            const content = chunk?.choices?.[0]?.delta?.content;

            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }
        // End stream
        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        console.error("Error processing message:", err);
        return res.error(400, "Invalid message format");
    }
};

// Stream response from Sarvam with abort signal
export const sendMessageS = async (req, res) => {
    try {
        // Create abort controller for cancellation
        const controller = new AbortController();
        res.on("close", () => {
            if (!res.writableEnded) {
                controller.abort();
            }
        });

        // Validate request body
        const validation = chatSchema.safeParse(req.body);

        if (!validation.success) {
            const error = validation?.error?.issues?.map((err) => ({
                error_path: err?.path[0],
                error_message: err?.message,
            }));

            return res.error(400, "invalid input", error);
        }

        // Extract messages
        const { messages } = validation.data;

        // Combine system prompt with user messages
        const combinedMessages = [
            {
                role: "system",
                content: systemPrompt,
            },
            ...messages,
        ];

        // Get response from Sarvam
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

        // Set streaming headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        // Setup heartbeat ping
        const heartbeat = setInterval(() => {
            if (!res.writableEnded) {
                res.write(`: ping\n\n`);
            }
        }, 15000);

        try {
            // Stream response chunks
            for await (const chunk of llmResponse) {
                if (res.writableEnded) break;

                const content = chunk?.choices?.[0]?.delta?.content;
                if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }

            // End stream
            if (!res.writableEnded) {
                res.write(`data: [DONE]\n\n`);
                res.end();
            }
        } catch (streamErr) {
            // Handle abort error
            if (streamErr.name === "AbortError") return;

            console.log("streaming error: ", streamErr);

            if (!res.writableEnded) {
                res.end();
            }
        } finally {
            // Clear heartbeat
            clearInterval(heartbeat);
        }
    } catch (err) {
        console.error("Error processing message:", err);

        // Handle abort error
        if (err.name === "AbortError") {
            console.log("gotcha yaa");
            return;
        }
        // Send error if headers not sent
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
