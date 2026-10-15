# wheremystuff — 任务管理
# 用法: just <recipe>

# 默认目标：显示帮助
default:
    @just --list

# ── 开发 ──────────────────────────────────────────────

# 安装开发依赖
deps:
    cd web && pnpm install

# 开发模式：后端 + 前端并行启动
dev:
    #!/usr/bin/env bash
    set -e
    trap 'kill 0' EXIT INT TERM
    just dev-server &
    just dev-web &
    wait

# 仅启动后端开发服务
dev-server:
    cargo run -p server

# 仅启动前端开发服务（Vite HMR，/api 代理到 :3000）
dev-web:
    cd web && pnpm dev

# ── 构建 & 运行 ───────────────────────────────────────

# 构建前端 + 编译后端 release（前端打包进二进制）
# 重要：改前端后必须重编二进制，否则服务端还是旧前端！
build:
    #!/usr/bin/env bash
    set -e
    FRONTEND_OUT="web/dist/index.html"
    BINARY="target/release/server"

    # 前端：源码有变更才重新构建
    if [ ! -f "$FRONTEND_OUT" ] || [ -n "$(find web/src web/index.html web/vite.config.ts web/tsconfig.json -newer "$FRONTEND_OUT" -print -quit 2>/dev/null)" ]; then
      echo "构建前端..."
      (cd web && pnpm build)
      # 前端变了，必须重编二进制
      echo "编译后端（嵌入新前端）..."
      touch server/src/main.rs
      cargo build --release
    elif [ ! -f "$BINARY" ] || [ -n "$(find server/src server/migrations Cargo.toml Cargo.lock "$FRONTEND_OUT" -newer "$BINARY" -print -quit 2>/dev/null)" ]; then
      echo "编译后端..."
      cargo build --release
    else
      echo "无变更，跳过"
    fi

# 运行生产版本（需先 just build，必须从仓库根目录运行）
run:
    #!/usr/bin/env bash
    set -e
    if [ ! -f target/release/server ]; then
      echo "二进制不存在，请先执行 just build" >&2
      exit 1
    fi
    ./target/release/server

# ── 系统安装 ──────────────────────────────────────────

# 安装到系统（默认 ~/.local/bin，可用 PREFIX=/usr/local 覆盖）
PREFIX := if os() == "linux" { env_var_or_default("PREFIX", home_dir() / ".local/bin") } else { home_dir() / ".local/bin" }

# 安装 wheremystuff 到系统路径（前端已打包进二进制，需先 just build）
install:
    #!/usr/bin/env bash
    set -e
    if [ ! -f target/release/server ]; then
      echo "二进制不存在，请先执行 just build" >&2
      exit 1
    fi
    echo "安装到 {{ PREFIX }} ..."
    mkdir -p "{{ PREFIX }}"
    install -m 755 target/release/server "{{ PREFIX }}/wheremystuff"
    echo "已安装: {{ PREFIX }}/wheremystuff"
    echo ""
    echo "数据目录: ~/.local/share/wheremystuff/ (首次运行自动创建)"
    echo "可选 config.toml 自定义路径、端口"

# 卸载
uninstall:
    rm -f "{{ PREFIX }}/wheremystuff"
    echo "已卸载 {{ PREFIX }}/wheremystuff"

# ── 容器 (Podman) ─────────────────────────────────────

# 构建容器镜像
container-build:
    podman build -t wheremystuff -f deploy/Containerfile .

# 运行容器（数据持久化到 ./data，端口 3000）
container-run:
    podman run -d --name wheremystuff \
      -p 3000:3000 \
      -v ./data:/app/data:Z \
      --restart unless-stopped \
      wheremystuff

# 停止并删除容器
container-clean:
    podman stop wheremystuff 2>/dev/null || true
    podman rm wheremystuff 2>/dev/null || true

# 查看容器日志
container-logs:
    podman logs -f wheremystuff

# ── 检查 & 测试 ───────────────────────────────────────

# 运行测试
test:
    cargo test -p server

# 格式化代码（rustfmt + prettier）
fmt:
    cargo fmt --all
    cd web && pnpm exec prettier --write "src/**/*.{ts,tsx,css}"

# 代码检查（clippy + prettier + tsc）
lint:
    cargo clippy -p server -- -D warnings
    cd web && pnpm exec prettier --check "src/**/*.{ts,tsx,css}"
    cd web && pnpm exec tsc -b

# 格式化 + 检查 + 测试
check: fmt lint test

# 清理构建产物
clean:
    cargo clean
    cd web && rm -rf dist node_modules/.vite

# 清空数据库和图片（不可恢复，慎用）
reset-db:
    #!/usr/bin/env bash
    read -p "确定要清空所有数据吗？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf data/
        echo "已清空 data/"
    else
        echo "已取消"
    fi
