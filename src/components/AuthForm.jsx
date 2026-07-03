import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("login"); // 'login', 'signup', or 'forgot'
  const [message, setMessage] = useState(null);

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/"; 
      } else if (view === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Success! Check your email to confirm.");
      } else if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setMessage("Check your email for the password reset link.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="font-['Teko'] text-4xl text-white uppercase tracking-wider">
          {view === "login" && "Captain Login"}
          {view === "signup" && "New Recruit"}
          {view === "forgot" && "Reset Password"}
        </h2>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        {/* EMAIL */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/50 border border-white/20 p-3 text-white rounded focus:border-gold-400 focus:outline-none"
            required
          />
        </div>

        {/* PASSWORD (Hidden for Reset) */}
        {view !== "forgot" && (
          <div className="space-y-1">
            <div className="flex justify-between">
               <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Password</label>
               {view === "login" && (
                 <button type="button" onClick={() => setView("forgot")} className="text-[10px] text-gold-500 hover:underline">
                   Forgot?
                 </button>
               )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/20 p-3 text-white rounded focus:border-gold-400 focus:outline-none"
              required
            />
          </div>
        )}

        {message && (
          <div className={`text-xs p-3 rounded ${message.includes("Success") || message.includes("Check") ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
            {message}
          </div>
        )}

        <button
          disabled={loading}
          className="mt-4 w-full bg-gold-400 hover:bg-gold-300 text-black font-['Teko'] text-xl py-3 rounded uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? "Processing..." : view === "login" ? "Enter World" : view === "signup" ? "Join Crew" : "Send Reset Link"}
        </button>
      </form>

      {/* TOGGLES */}
      <div className="mt-6 text-center space-y-2">
        {view !== "login" && (
          <button onClick={() => setView("login")} className="text-gray-400 text-xs hover:text-white block w-full">
            Back to Login
          </button>
        )}
        {view === "login" && (
          <button onClick={() => setView("signup")} className="text-gray-400 text-xs hover:text-white block w-full">
            Need an account? Recruit here.
          </button>
        )}
      </div>
    </div>
  );
}