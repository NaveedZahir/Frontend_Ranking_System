
import { useState } from "react";
import { supabase } from "./lib/supabase";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        if (data.session) {
          onLogin?.(data.session);
          setMessage("Account created successfully.");
        } else {
          setMessage(
            "Account created. Check your email to confirm it, then sign in."
          );
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) throw error;

        onLogin?.(data.session);
        setMessage("Login successful.");
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: "60px auto", padding: 24 }}>
      <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <label style={{ display: "block", marginBottom: 12 }}>
            Full name
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ display: "block", width: "100%", padding: 10 }}
            />
          </label>
        )}

        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", padding: 10 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", padding: 10 }}
          />
        </label>

        <button disabled={loading} type="submit">
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Register"}
        </button>
      </form>

      <p>{message}</p>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setMessage("");
        }}
      >
        {mode === "login"
          ? "Create an account"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
