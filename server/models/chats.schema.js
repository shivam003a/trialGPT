import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            default: "New Chat",
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: true },
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
