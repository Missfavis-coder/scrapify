
"use client";

import { useState, type FormEvent } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRegister } from "@/lib/hooks/use-auth";

export default function RegisterPage() {
  const register = useRegister();

  const [payload, setPayload] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const isLoading = register.isPending;

  
function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (payload.password !== payload.confirmPassword) {
    toast.error("Passwords do not match.");
    return;
  }

  if (!acceptedTerms) {
    toast.error("Please agree to the Terms of Service and Privacy Policy.");
    return;
  }

  const name = payload.fullName.trim();

  if (!name) {
    toast.error("Please enter your full name.");
    return;
  }

  register.mutate({
    name,
    email: payload.email.trim(),
    password: payload.password,
  });
}


  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-full flex flex-col items-center justify-center p-6 lg:p-8 pt-24 lg:mt-2 mt-0">
        <div className="w-full max-w-md">
          <div className="mb-10 relative">
            <h1 className="text-2xl font-bold dark:text-[#160a2a]/90 text-white mb-2">
              Signup.
            </h1>
            <p className="text-neutral-600 text-sm">
              Create your account to access our seamless services.
            </p>
          </div>


          <form
            className="space-y-6 mb-8"
            autoComplete="off"
            onSubmit={handleSubmit}
          >
            <div className="space-y-4 text-[14px]">
              <div className="relative group">
                <input
                  type="text"
                  name="name"
                  placeholder="Full name"
                  value={payload.fullName}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className="h-12 pl-12 pr-4 w-full rounded-xl border border-neutral-200 text-neutral-500 text-sm outline-none transition-all duration-200"
                  maxLength={30}
                  autoComplete="name"
                  required
                />
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" />
              </div>

              <div className="relative group">
                <input
                  name="email"
                  type="email"
                  value={payload.email}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Enter your email"
                  className="h-12 pl-12 pr-4 w-full rounded-xl border border-neutral-200 text-neutral-500 text-sm outline-none transition-all duration-200"
                  autoComplete="email"
                  required
                />
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" />
              </div>

              <div className="relative group">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={payload.password}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Enter your password"
                  className="h-12 pl-12 pr-12 w-full rounded-xl border border-neutral-200 text-neutral-500 text-sm outline-none transition-all duration-200"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="relative group">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" />
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={payload.confirmPassword}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Confirm your password"
                  className="h-12 pl-12 pr-12 w-full rounded-xl border border-neutral-200 text-neutral-600 text-sm outline-none transition-all duration-200"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex items-start space-x-2 text-sm">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="w-4 h-4 accent-primary bg-white cursor-pointer mt-0.5"
                />
                <label htmlFor="acceptTerms" className="text-neutral-500">
                  I agree to the{" "}
                  <span className="text-neutral-600 hover:text-primary font-medium">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-neutral-600 hover:text-primary font-medium"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 flex items-center justify-center bg-primary hover:opacity-90 text-white font-semibold rounded-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </button>
            </div>
          </form>

          <div className="mt-4 text-sm text-center flex items-center justify-center gap-1">
            <p className="text-neutral-500">Already have an account?</p>
            <Link
              href="/login"
              className="text-neutral-600 hover:text-primary font-semibold transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
