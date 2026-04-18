import "./App.css";
import ChatInterface2 from "./components/ChatInterface2";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NewChatInterface from "./components/NewChatInterface";
import Signup from "./pages/Signup";

function App() {
    return (
        <div>
            <Routes>
                <Route path="/" element={<Home />}>
                    <Route index element={<ChatInterface2 />} />
                    <Route path="chat" element={<NewChatInterface />} />
                </Route>
                <Route path="/login" element={<Signup />} />
            </Routes>
        </div>
    );
}

export default App;
