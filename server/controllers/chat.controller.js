// Import necessary modules
import { authenticateChatSchema, chatSchema } from "../zod/chat.schema.js";
import { createChatCompletions } from "../utils/openai.js";
import { createChatCompletionBySarvam } from "../utils/sarvam.js";
import { systemPrompt } from "../utils/contants.js";
import Chat from "../models/chats.schema.js";
import Message from "../models/messages.schema.js";

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

export const sendAuthenticatedMessage = async (req, res) => {
    try {
        const validation = authenticateChatSchema.safeParse(req.body);

        // SSE Headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        if (!validation.success) {
            res.write(
                `data: ${JSON.stringify({ type: "error", message: "invalid input" })}\n\n`,
            );
            return res.end();
        }

        const userId = req?.user?._id;
        const { chatId, content } = validation.data;

        // if !chatId, create new chat + generate title
        let chat;
        let isNewChat = false;

        if (!chatId) {
            chat = await Chat.create({
                userId,
                title: content.slice(0, 30),
            });
            isNewChat = true;
        } else {
            chat = await Chat.findOne({ _id: chatId, userId });

            if (!chat) {
                res.write(
                    `data: ${JSON.stringify({ type: "error", message: "chat not found" })}\n\n`,
                );
                return res.end();
            }
        }

        if (isNewChat) {
            res.write(
                `data: ${JSON.stringify({ type: "chat_created", chatId: chat._id })}\n\n`,
            );
        }

        await Message.create({
            chatId: chat?._id,
            role: "user",
            content,
        });

        // Fetch Context
        const lastMessages = await Message.find({ chatId: chat?._id })
            .sort({ createdAt: 1 })
            .limit(20)
            .lean();

        // Convert to SarvamAI format
        const messages = lastMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));

        // create empty assistnat message
        const assistantMessage = await Message.create({
            chatId: chat?._id,
            role: "assistant",
            content: "",
            status: "pending",
        });

        let fullText = "";

        const controller = new AbortController();

        res.on("close", () => {
            controller.abort();
        });

        // Get response from Sarvam
        const stream = await createChatCompletionBySarvam({
            model: "sarvam-105b",
            messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: true,
            reasoning_effort: "low",
            wiki_grounding: true,
            abortSignal: controller.signal,
        });

        for await (let chunk of stream) {
            const token = chunk.choices[0]?.delta?.content;

            if (!token) continue;
            fullText += token;

            res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
        }

        assistantMessage.content = fullText;
        assistantMessage.status = "completed";
        await assistantMessage.save();

        res.write(
            `data: ${JSON.stringify({ type: "done", chatId: chat._id })}\n\n`,
        );
        return res.end();
    } catch (err) {
        console.error("Streaming error:", err);

        res.write(
            `data: ${JSON.stringify({
                error: "streaming failed",
            })}\n\n`,
        );

        res.end();
    }
};

export const getAllChats = async (req, res) => {
    try {
        const userId = req.user._id;

        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 20;

        page = Math.max(1, page);
        limit = Math.max(1, Math.min(limit, 20));

        const skip = (page - 1) * limit;

        const chats = await Chat.find({ userId })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit + 1)
            .select("_id title updatedAt")
            .lean();

        const hasMore = chats.length > limit;
        if (hasMore) chats.pop();

        return res.success(200, "fetched chats", {
            chats,
            pagination: {
                page,
                hasMore,
            },
        });
    } catch (err) {
        console.error("Error getting all chats", err);

        // will update error handling later, for now leave it as it is
        return res.error(500, "Error getting chats");
    }
};

// export const getChatById = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const { chatId } = req.param;

//         const
//     } catch (err) {}
// };
