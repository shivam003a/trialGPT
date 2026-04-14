import { SarvamAIClient } from "sarvamai";

const apiKey = process.env.SARVAM_API_KEY;

if (!apiKey) {
    throw new Error("missing required environment variable SARVAM_API_KEY");
}

const sarvamClient = new SarvamAIClient({
    apiSubscriptionKey: apiKey,
});

export const createChatCompletionBySarvam = async ({
    model = "sarvam-105b",
    messages = [],
    temperature = 0.7,
    max_tokens = 1000,
    stream = false,
    reasoning_effort = null,
    wiki_grounding = false,
    abortSignal,
    ...rest
} = {}) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        const err = new Error("SarvamAI requires a non-empty messages array");
        err.statusCode = 400;
        throw err;
    }

    if (temperature < 0 || temperature > 2) {
        const err = new Error("temperature must be between 0 and 2");
        err.statusCode = 400;
        throw err;
    }

    if (max_tokens <= 0) {
        const err = new Error("max_tokens must be positive");
        err.statusCode = 400;
        throw err;
    }

    try {
        return await sarvamClient.chat.completions(
            {
                model,
                messages,
                temperature,
                max_tokens,
                stream,
                reasoning_effort,
                wiki_grounding,
                ...rest,
            },
            abortSignal ? { abortSignal } : {},
        );
    } catch (err) {
        const error = new Error(
            err?.body?.error?.message || "LLM request failed",
        );
        error.statusCode = err.statusCode || 500;
        error.type = "LLM_ERROR";

        throw error;
    }
};
