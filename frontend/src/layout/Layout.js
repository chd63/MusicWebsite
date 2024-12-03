// layout/Layout.js
import { Outlet, Link, useNavigate, useLocation  } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "./Layout.css";
import MusicPlayer from "../MusicPlayer/MusicPlayer";
import profileIcon from "./profile.png";

function Layout() {
  const authContext = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await authContext.logout();
    navigate("/");
  };

  const musicPlayerVisiblePaths = ["/", "/homepage", "/user"];

  return (
    <div className="Layout-container">
      <div className="Layout">
        {/* Navigation bar */}
        <div className="nav-bar">
          <h1 className="title">MusicWebsite</h1>
          <div className="links">
            <Link className="nav-link" to="/">Home</Link>
            
            <Link className="nav-link" to="/upload">Upload</Link>
            <Link className="nav-link" to="/user">
            <img
                src={profileIcon}
                alt="Profile"
                style={{
                    width: "32px", // Adjust the size as needed
                    height: "32px",
                }}
            />
            </Link>
            {authContext.authToken ? (
              <button className="nav-link emphasized" onClick={handleLogout}>Sign Out</button>
            ) : (
              <Link className="nav-link emphasized" to="/signin">Sign In</Link>
            )}
          </div>
        </div>

        {/* Main content (Outlet will render the page-specific content) */}
        <main>
          <Outlet />
        </main>
      </div>

      {/* Persistent Music Player */}
      {musicPlayerVisiblePaths.includes(location.pathname) && (
        <footer>
          <MusicPlayer />
        </footer>
      )}

    </div>
  );
}

export default Layout;