import jwt from "jsonwebtoken";
import User from "../models/user.schema.js";

const authenticateRequest = async (req, res, next) => {
    try {
        // Extract token from headers or cookies
        const authHeader = req.headers["authorization"];
        const token =
            req.cookies["token"] ||
            (authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : null);

        // Check if token exists
        if (!token) {
            return res.error(401, "token is missing");
        }

        // Verify JWT token
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.error(401, "invalid or expired token");
        }

        // Find user in database by userId
        const user = await User.findById(payload.userId);

        // Return error if user not found
        if (!user) {
            return res.error(401, "user does not exist").lean();
        }

        // Attach user to request and continue
        req.user = user;
        return next();
    } catch (err) {
        console.error("Auth error:", err);

        return res.error(500, "Error Authenticating user");
    }
};

export default authenticateRequest;
