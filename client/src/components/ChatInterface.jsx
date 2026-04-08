import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function ChatInterface() {
    const [messages, setMessages] = useState("");
    const [query, setQuery] = useState("");

    const sendMessages = async (e) => {
        e?.preventDefault();

        try {
            const res = await fetch("http://localhost:5000/api/chat/message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query,
                }),
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let result = "";

            while (true) {
                const { done, value } = await reader.read();
                if (!done) return;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");

                buffer = lines.pop();

                for (let line of lines) {
                    line = line.trim();
                    if (!line.startsWith("data: ")) continue;

                    const data = line.replace("data: ", "");
                    if (data === "[DONE]") return;

                    try {
                        const parsed = JSON.parse(data);
                        const text = parsed.content;

                        if (text) {
                            result += text;
                            setMessages(result);
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.log("Something Went Wrong", e);
        }
    };

    return (
        <div className="overflow-hidden! w-screen flex flex-col items-center justify-center p-4 bg-red-300">
            <div className="overflow-hidden! w-screen px-20 h-full">
                <ReactMarkdown
                    components={{
                        code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                                className || "",
                            );

                            return !inline ? (
                                <SyntaxHighlighter
                                    style={oneDark}
                                    language={match ? match[1] : "javascript"}
                                    PreTag="div"
                                >
                                    {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code className="bg-gray-200 px-1 rounded">
                                    {children}
                                </code>
                            );
                        },
                    }}
                >
                    {messages}
                </ReactMarkdown>
            </div>

            <form onSubmit={sendMessages}>
                <input
                    type="text"
                    placeholder="Type your message here..."
                    className="w-96 p-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setQuery(e?.target?.value)}
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Send
                </button>
            </form>
        </div>
    );
}

export default ChatInterface;
