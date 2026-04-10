import { useRef, useState } from "react";

function ChatInterface2() {
    const [messages, setMessages] = useState([]);
    const [query, setQuery] = useState("");

    const abortRef = useRef(null);

    const sendMessages = async (e) => {
        e?.preventDefault();

        const controller = new AbortController();
        abortRef.current = controller;

        if (!query.trim()) return;

        const newMessages = [...messages, { role: "user", content: query }];
        setMessages([...newMessages, { role: "assistant", content: "" }]);
        setQuery("");

        try {
            const res = await fetch(
                "http://localhost:5000/api/chat/message/s",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: newMessages,
                    }),
                    signal: controller.signal,
                },
            );

            let result = "";

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let i = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                const lines = chunk.split("\n");

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
                            // TODO: update code for proper rendering
                            setMessages((prev) => {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    role: "assistant",
                                    content: result,
                                };
                                return updated;
                            });
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {
            if (e.name === "AbortError") {
                console.log("Request aborted");
            } else {
                console.log("Something Went Wrong", e);
            }
        }
    };

    const abortRequest = () => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
    };

    return (
        <div className="overflow-hidden! w-screen flex flex-col items-center justify-center p-4 bg-red-300">
            <div className="overflow-hidden! w-screen px-20 h-full flex flex-col">
                {messages &&
                    messages?.length &&
                    messages.map((msg, i) => {
                        return (
                            <div
                                key={i}
                                className={`bg-amber-100 rounded-sm p-2 max-w-6/10 ${msg.role === "user" ? "self-end" : "self-start"}`}
                            >
                                {msg.content}
                            </div>
                        );
                    })}
            </div>

            <form className="absolute left-1/2 bottom-0 -translate-x-1/2">
                <input
                    type="text"
                    placeholder="Type your message here..."
                    className="w-96 p-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setQuery(e?.target?.value)}
                />
                <button
                    onClick={sendMessages}
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Send
                </button>
                <button
                    type="button"
                    onClick={abortRequest}
                    className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Abort
                </button>
            </form>
        </div>
    );
}

export default ChatInterface2;
