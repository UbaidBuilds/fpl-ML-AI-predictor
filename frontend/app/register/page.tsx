"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(name, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string } };
      };
      setError(axiosErr.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-white/10">
        <h1 className="text-3xl font-black text-center mb-8 text-white">Sign Up</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            className="w-full bg-[#00FF87] text-[#0a0e1a] hover:bg-[#00e676] font-bold"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-[#00FF87] hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
