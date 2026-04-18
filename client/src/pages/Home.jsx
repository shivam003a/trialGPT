import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function Home() {
    return (
        <div className="flex flex-row h-screen w-screen overflow-hidden">
            <div className="h-screen w-80">
                <Sidebar />
            </div>
            <div className="w-full">
                <div className="w-full">
                    <Topbar />
                </div>
                <div className="w-full">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default Home;
