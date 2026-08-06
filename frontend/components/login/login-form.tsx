"use client"

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  loginSchema,
  otpSchema,
  type LoginValues,
  type OtpValues,
} from "@/schemas/login-schema";
import { useLogin } from "@/hooks/use-login";

type UseLoginApi = ReturnType<typeof useLogin>;

function ServerError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder="Enter your password"
        autoComplete="current-password"
        disabled={disabled}
        className="pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 grid place-items-center px-3 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function CredentialsForm({ auth }: { auth: UseLoginApi }) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      usernameOrEmail: "",
      password: "",
      rememberMe: false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(auth.submitCredentials)} className="grid gap-4">
        <FormField
          control={form.control}
          name="usernameOrEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username or email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your username or email"
                  autoComplete="username"
                  autoFocus
                  disabled={auth.isSubmitting}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    auth.clearServerError();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordField
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    auth.clearServerError();
                  }}
                  disabled={auth.isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    auth.clearServerError();
                  }}
                  disabled={auth.isSubmitting}
                />
              </FormControl>
              <FormLabel>Remember me for 30 days</FormLabel>
            </FormItem>
          )}
        />

        <ServerError message={auth.serverError} />

        <Button type="submit" className="w-full" disabled={auth.isSubmitting}>
          {auth.isSubmitting && <Loader2 className="animate-spin" />}
          {auth.isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </Form>
  );
}

function OtpForm({
  auth,
  onBack,
}: {
  auth: UseLoginApi;
  onBack: () => void;
}) {
  const form = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { code: "" },
  });

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to your email to complete sign in.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(auth.submitOtp)} className="grid gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={auth.isSubmitting}
                    className="text-center text-lg tracking-[0.5em]"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.value.replace(/\D/g, ""));
                      auth.clearServerError();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <ServerError message={auth.serverError} />

          <Button type="submit" className="w-full" disabled={auth.isSubmitting}>
            {auth.isSubmitting && <Loader2 className="animate-spin" />}
            {auth.isSubmitting ? "Verifying..." : "Verify Code"}
          </Button>

          <button
            type="button"
            onClick={onBack}
            disabled={auth.isSubmitting}
            className="mx-auto text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
          >
            Back to sign in
          </button>
        </form>
      </Form>
    </div>
  );
}

export function LoginForm() {
  const auth = useLogin();

  if (auth.step === "otp") {
    return <OtpForm auth={auth} onBack={auth.goBack} />;
  }

  return <CredentialsForm auth={auth} />;
}
