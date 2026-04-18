import googleAuthClient from "../utils/googleAuth.js";
import User from "../models/user.schema.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Generate Google auth URL and redirect
export const getAuthUrl = (req, res) => {
    try {
        // Create Google OAuth URL
        const state = crypto.randomBytes(32).toString("hex");

        res.cookie("oauth_state", state, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 10 * 60 * 1000,
        });

        const url = googleAuthClient.generateAuthUrl({
            access_type: "offline",
            scope: ["profile", "email"],
            state,
            prompt: "select_account",
        });

        // Redirect to Google login
        return res.redirect(url);
    } catch (err) {
        console.error("Error generating auth URL: ", err);

        // Handle error and redirect to login
        return res.redirect(`${process.env.FE_URL}/login?error=auth_failed`);
    }
};

// Handle Google OAuth callback
export const googleAuthCallback = async (req, res) => {
    try {
        // Extract authorization code
        const { code, state } = req.query;

        const storedState = req.cookies.oauth_state;

        if (!state || state !== storedState) {
            return res.redirect(
                `${process.env.FE_URL}/login?error=invalid_state`,
            );
        }

        res.clearCookie("oauth_state", {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 10 * 60 * 1000,
        });

        if (!code) {
            return res.redirect(
                `${process.env.FE_URL}/login?error=missing_code`,
            );
        }

        // Exchange code for tokens
        const { tokens } = await googleAuthClient.getToken(code);

        // Verify ID token
        const ticket = await googleAuthClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        // Get user payload
        const payload = ticket.getPayload();

        if (!payload || !payload.sub) {
            return res.redirect(
                `${process.env.FE_URL}/login?error=invalid_payload`,
            );
        }

        // Check email verification
        if (!payload.email_verified) {
            return res.redirect(
                `${process.env.FE_URL}/login?error=email_not_verified`,
            );
        }

        // Extract user data from payload
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const email_verified = payload.email_verified;
        const avatar = payload.picture;

        // Check if user exists in database
        let user = await User.findOne({ googleId });

        // Create new user if not found
        if (!user) {
            user = await User.create({
                googleId,
                email,
                name,
                avatar,
                email_verified,
                lastLogin: new Date(),
                role: "user",
            });
        } else {
            // Update existing user information
            if (user.name !== name) user.name = name;
            if (user.avatar !== avatar) user.avatar = avatar;
            user.lastLogin = new Date();
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Redirect to success page with token
        return res.redirect(`${process.env.FE_URL}/dashboard`);
    } catch (err) {
        console.error("Google callback error:", err);

        // Handle error
        return res.redirect(
            `${process.env.FE_URL}/login?error=google_auth_failed`,
        );
    }
};

export const logoutUser = (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.success(200, "Logged out successfully");
    } catch (err) {
        console.error("Logout error:", err);
        return res.error(500, "Failed to logout");
    }
};

export const getProfile = (req, res) => {
    try {
        const user = req.user;

        return res.success(200, "user fetched successfully", user);
    } catch (err) {
        console.error("GetMe error:", err);
        return res.error(500, "Failed to fetch user");
    }
};
