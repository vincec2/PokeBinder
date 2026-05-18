import { useState } from "react";
import { useNavigate } from "react-router";
import { logoutUser } from "../auth/cognito";

export function LogoutButton() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logoutUser();
      localStorage.removeItem("pokebinder-api-active-binder-id");
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      className="secondary-button"
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? "Logging out..." : "Log out"}
    </button>
  );
}