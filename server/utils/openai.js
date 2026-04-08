import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

if (!apiKey) {
    throw new Error('missing required environment variable OPENAI_API_KEY');
}

const client = new OpenAI({
    apiKey,
    baseURL,
});

export const createChatCompletions = async ({
    model = 'gpt-3.5-turbo', 
    messages = [], 
    temperature = 0.7, 
    max_tokens = 1000, 
    stream = false, 
    ...rest
} = {}) => {
    if(!Array.isArray(messages) || messages.length === 0){
        throw new Error('OpenAI createChatCompletion requires a non-empty messages array');
    }

    return client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens,
        stream,
        ...rest,
    })
}

export default client;