import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLogin } from "@/hooks/useAuth";
import { LogoMark } from "@/components/Logo";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login.mutateAsync({ username: username.trim(), password });
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-paper p-4"
      style={{
        background:
          "radial-gradient(640px 320px at 50% -8%, rgb(61 82 244 / 0.13), transparent 70%), var(--color-paper)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-sm animate-zoom-in p-8 shadow-card-hover"
      >
        <div className="mb-7 flex flex-col items-center gap-2.5 text-center">
          <LogoMark size={48} />
          <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight">
            东西在哪
          </h1>
          <p className="text-sm text-muted">登录后继续管理你的物品档案</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="login-username" className="field-label">
              用户名
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
              className="input"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="field-label">
              密码
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="input"
            />
          </div>

          {error && <p className="text-sm text-signal">{error}</p>}

          <button
            type="submit"
            disabled={login.isPending}
            className="btn btn-primary mt-1 w-full py-2.5"
          >
            <LogIn size={16} />
            {login.isPending ? "登录中…" : "登录"}
          </button>
        </div>
      </form>
    </div>
  );
}
