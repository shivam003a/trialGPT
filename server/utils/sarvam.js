import { SarvamAIClient } from "sarvamai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process?.env?.SARVAM_API_KEY;

if (!apiKey) {
    throw new Error("missing required environment variable SARVAM_API_KEY");
}

const sarvamClient = new SarvamAIClient({
    apiSubscriptionKey: apiKey,
});

export const createChatCompletionBySarvam = ({
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
        throw new Error(
            "SarvamAI createChatCompletion requires a non-empty messages array",
        );
    }

    return sarvamClient.chat.completions(
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
};
