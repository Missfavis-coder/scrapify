"use client";

import { useState } from "react";
import { Mail, Lock, EyeOff, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";


type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;

export const dynamic = "force-dynamic";

export default function SigninPage() {
  const router = useRouter();

  
  const [payload, setPayload] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOnChange(e: InputChangeEvent) {
    const { name, value } = e.target;
    setPayload(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!payload.email || !payload.password) {
      setError("Please fill in all fields");
      toast.error("Please fill in all fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      setError("Please enter a valid email address");
      toast.error("Please enter a valid email address");
      return;
    }

  }

  return (
    <div className="flex min-h-screen bg-white text-secondary">
      <div className="w-full flex items-center justify-center p-6 lg:p-8 pt-24">
        <div className="w-full max-w-md relative">
          
          {/* Header */}
          <div className="mb-6 relative">
            <h1 className="text-2xl font-bold tracking-widest  mb-3">
              Welcome Back
            </h1>
            <p className="text-neutral-500 text-sm">
              Sign in to access your account.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-6 mb-6" autoComplete="off">
            <div className="space-y-4">
            
              <div>
                <div className="relative group">
                  <input
                    name="email"
                    type="email"
                    value={payload.email}
                    onChange={handleOnChange}
                    placeholder="Enter your email"
                    className="h-12 pl-12 pr-4 w-full rounded-xl border border-neutral-200 text-neutral-500  text-sm outline-none  transition-all duration-200 "
                    autoComplete="off"
                    required
                  />
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" />
                </div>
              </div>

              <div>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={payload.password}
                    onChange={handleOnChange}
                    placeholder="Enter your password"
                    className="h-12 pl-12 pr-12 w-full rounded-xl border border-neutral-200 text-gray-600 text-sm outline-none  transition-all duration-200"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-primary bg-white" 
                  autoComplete="off" 
                />
                <span className="text-neutral-700">Remember me</span>
              </label>
              <span className="text-neutral-500 hover:text-primary font-medium transition-colors cursor-pointer">
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              onClick={(()=>{router.push("/dashboard/home")})}
              className="w-full h-12 flex items-center justify-center bg-primary hover:opacity-90 text-white font-semibold rounded-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"

            >

                <div className="flex items-center gap-2">

                  Sign in
                </div>
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <p className="text-neutral-600">
              Don't have an account?{" "}
              <span className="text-neutral-500 hover:text-primary font-semibold transition-colors cursor-pointer">
                Create account
              </span>
            </p>
          </div>


        </div>
      </div>
    </div>
  );
}