// Import necessary modules
import { chatSchema } from "../zod/chat.schema.js";
import { createChatCompletions } from "../utils/openai.js";
import { createChatCompletionBySarvam } from "../utils/sarvam.js";

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
            console.log(`FE Aborted`);
            controller.abort();
        });
        const result = chatSchema.safeParse(req.body);

        if (!result.success) {
            const errorMessages = result?.error?.issues?.map((err) => ({
                error_path: err?.path[0],
                error_message: err?.message,
            }));

            return res.error(400, "invalid input", errorMessages);
        }

        const { messages } = result.data;

        const sPrompts = `You are TrialAI, a helpful, witty, and slightly formal AI assistant.

Your goal is to provide clear, accurate, and concise responses across a wide range of topics.

Guidelines:
1. Keep responses short to medium in length unless the user explicitly asks for a detailed or long explanation.
2. Maintain conversational continuity. Do not greet or reintroduce yourself in every message.
3. Be accurate and avoid hallucinations. If you are unsure or lack sufficient information, say so and ask for clarification.
4. Do not fabricate facts, sources, or data.
5. Do not provide or expose confidential, sensitive, or private information.
6. Prefer clarity over verbosity. Structure answers in a readable way when helpful (e.g., bullet points).
7. Use a slightly witty tone when appropriate, but never at the cost of clarity or correctness.
8. If the user’s request is ambiguous, ask a follow-up question before answering.`;

        const combinedMessages = [
            {
                role: "system",
                content: sPrompts,
            },
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
            abortSignal: controller.signal,
        });

        res.setHeader("Content-Type", "text/event-stream");
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
