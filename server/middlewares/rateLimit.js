import { RATE_LIMIT } from "../config/rateLimit.js";
import redis from "../utils/redis.js";

export const rateLimit = (type) => {
    return async (req, res, next) => {
        const config = RATE_LIMIT[type];

        // safety check
        if (!config) {
            return next();
        }

        const { limit, window } = config;

        const ip = req.ip;
        const key = `rateLimit:${type}:${ip}`;

        try {
            const count = await redis.incr(key);

            if (count === 1) {
                await redis.expire(key, window);
            }

            const remaining = Math.max(limit - count, 0);
            const ttl = await redis.ttl(key);

            // headers
            res.setHeader("X-RateLimit-Limit", limit);
            res.setHeader("X-RateLimit-Remaining", remaining);
            res.setHeader("X-RateLimit-Reset", ttl > 0 ? ttl : 0);

            if (count > limit) {
                res.setHeader("Retry-After", ttl > 0 ? ttl : 0);

                return res.status(429).json({
                    success: false,
                    message: "too many requests",
                    data: null,
                });
            }

            next();
        } catch (err) {
            console.error("Rate limiter error:", err);

            // fail-open
            next();
        }
    };
};
