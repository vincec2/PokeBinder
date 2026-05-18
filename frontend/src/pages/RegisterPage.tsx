import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { confirmUser, registerUser } from "../auth/cognito";

export function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [confirmationCode, setConfirmationCode] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await registerUser(email.trim(), password);

      setNeedsConfirmation(true);
      setSuccessMessage(
        "Account created. Check your email for the confirmation code."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Registration failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await confirmUser(email.trim(), confirmationCode.trim());

      setSuccessMessage("Account confirmed. You can log in now.");
      navigate("/login");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Confirmation failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="auth-card">
        <p className="eyebrow">Create Account</p>
        <h1>Register for PokéBinder</h1>
        <p>Create an account so your binders can be saved online.</p>

        {!needsConfirmation ? (
          <form className="auth-form" onSubmit={handleRegister}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {errorMessage && <p className="form-error">{errorMessage}</p>}
            {successMessage && <p className="form-success">{successMessage}</p>}

            <button
              className="primary-button button-reset"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Account"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleConfirm}>
            <label>
              Confirmation code
              <input
                value={confirmationCode}
                onChange={(event) => setConfirmationCode(event.target.value)}
                required
              />
            </label>

            {errorMessage && <p className="form-error">{errorMessage}</p>}
            {successMessage && <p className="form-success">{successMessage}</p>}

            <button
              className="primary-button button-reset"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Confirming..." : "Confirm Account"}
            </button>
          </form>
        )}

        <p className="auth-switch-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}