import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
        },
        content: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "error"],
            default: "completed",
        },
        token: {
            type: Number,
        },
        metadata: {
            type: Object,
        },
    },
    { timestamps: true },
);

// important compound index
messageSchema.index({ chatId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
