import { createClient } from "redis";

const redis_url = process.env.REDIS_URL;
if (!redis_url) {
    throw new Error("missing required environment vaiable REDIS_URL");
}

const redis = createClient({
    url: redis_url,
});

// Event Listeners
redis.on("connect", () => {
    console.log("[Redis] Connected");
});

redis.on("reconnecting", () => {
    console.log("[Redis] Reconnecting...");
});

redis.on("error", (err) => {
    console.log("[Redis] Error", err);
});

export const connectRedis = async () => {
    try {
        if (!redis.isOpen) {
            await redis.connect();
        }
    } catch (err) {
        console.error("[Redis] Connection failed:", err);
        process.exit(1);
    }
};

export const disconnectRedis = async () => {
    if (redis.isOpen) {
        await redis.quit();
        console.log("[Redis] Disconnected");
    }
};

export default redis;
