import googleAuthClient from "../utils/googleAuth.js";

export const getAuthUrl = async (req, res) => {
    try {
        const url = googleAuthClient.generateAuthUrl({
            access_type: "offline",
            scope: ["profile", "email"],
        });

        console.log(url);
        res.redirect(url);
    } catch (err) {
        console.err("something wnet wrong");
    }
};

export const getCodes = (req, res) => {
    console.log(req.url, req.query);
};
