import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redis_url = process?.env?.REDIS_URL;
if (!redis_url) {
    throw new Error("missing required environment vaiable REDIS_URL");
}

const redis = createClient({
    url: redis_url,
});

redis.on("connect", () => {
    console.log("redis connected");
});

redis.on("error", (error) => {
    console.log("redis client error", error);
});

await redis.connect();

export default redis;
