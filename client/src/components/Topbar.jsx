import { NavLink } from "react-router-dom";

function Topbar() {
    return (
        <div className="h-15 w-full! bg-amber-200 flex justify-between items-center p-8">
            <p>Topbar</p>
            <NavLink to="/login" className="bg-red-100 p-2">
                Login
            </NavLink>
        </div>
    );
}

export default Topbar;
