二、环境准备
2.1 系统要求
macOS / Linux / Windows
Node.js >= 22
智谱 API Key（在 智谱开放平台 注册获取）
2.2 获取智谱 API Key
访问 智谱开放平台
注册并登录
进入「API Keys」页面，创建新的 API Key
保存好 Key，后续配置需要使用
三、安装 Codex CLI
# 全局安装最新版 Codex CLI
npm install -g @openai/codex@latest

# 验证安装
codex --version
💡 如果安装的是 0.80.0 等旧版本，macOS 可能会拦截未签名的二进制文件。建议直接使用最新版。

四、安装 CLIProxyAPI 代理
CLIProxyAPI 是一个成熟的开源项目（GitHub 4.7k fork），专门用于 Codex / Claude Code 等 CLI 工具的 API 协议转换，由智谱 Z.ai 赞助。

4.1 下载
前往 CLIProxyAPI Releases 下载对应平台的版本：

平台	文件名
macOS Apple Silicon	CLIProxyAPI_darwin_arm64.tar.gz
macOS Intel	CLIProxyAPI_darwin_amd64.tar.gz
Linux x86_64	CLIProxyAPI_linux_amd64.tar.gz
Linux ARM64	CLIProxyAPI_linux_arm64.tar.gz
Windows	CLIProxyAPI_windows_amd64.zip
4.2 安装
# 创建目录
mkdir -p ~/.codex

# 下载（以 macOS Apple Silicon 为例）
curl -L -o /tmp/cliproxyapi.tar.gz \
  "https://github.com/router-for-me/CLIProxyAPI/releases/latest/download/CLIProxyAPI_darwin_arm64.tar.gz"

# 解压
cd /tmp && tar -xzf cliproxyapi.tar.gz

# 复制到 ~/.codex 目录
cp /tmp/cli-proxy-api ~/.codex/
chmod +x ~/.codex/cli-proxy-api

# 验证
~/.codex/cli-proxy-api --help
五、配置 CLIProxyAPI
5.1 创建代理配置文件
cat > ~/.codex/cliproxy-config.yaml << 'EOF'
# 监听地址和端口
host: "127.0.0.1"
port: 8080

# 调试模式（生产环境建议关闭）
debug: false

# API Key 认证（客户端连接代理时使用的 Key）
api-keys:
  - "sk-your-custom-key"

# OpenAI 兼容提供商配置
openai-compatibility:
  - name: "glm"
    base-url: "https://open.bigmodel.cn/api/coding/paas/v4"
    api-key-entries:
      - api-key: "你的智谱API_Key"
    models:
      - name: "glm-5.1"
        alias: "glm-5.1"
EOF
⚠️ 请将 sk-your-custom-key 替换为你自定义的密钥，将 你的智谱API_Key 替换为你在智谱开放平台获取的真实 API Key。

5.2 启动代理
# 前台启动（调试用）
~/.codex/cli-proxy-api -config ~/.codex/cliproxy-config.yaml

# 后台启动（推荐）
nohup ~/.codex/cli-proxy-api -config ~/.codex/cliproxy-config.yaml > ~/.codex/proxy.log 2>&1 &

# 查看日志
tail -f ~/.codex/proxy.log

# 停止代理
kill $(lsof -ti:8080)
六、配置 Codex CLI
6.1 编辑配置文件
cat > ~/.codex/config.toml << 'EOF'
# 交互风格：pragmatic（务实）/ concise（简洁）
personality = "pragmatic"

# 模型提供商和模型名称
model_provider = "glm-proxy"
model = "glm-5.1"

# MCP 服务器配置（可选）
[mcp_servers]

[mcp_servers.sequential-thinking]
type = "stdio"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-sequential-thinking"]

[mcp_servers.memory]
type = "stdio"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-memory"]

# 自定义模型提供商
[model_providers.glm-proxy]
name = "GLM via CLIProxyAPI"
base_url = "http://127.0.0.1:8080/v1"
env_key = "CODEX_GLM_KEY"
wire_api = "responses"

# 项目信任级别
[projects."/Users/你的用户名"]
trust_level = "trusted"
EOF
6.2 配置环境变量
# 将 API Key 添加到 shell 配置
echo 'export CODEX_GLM_KEY="sk-your-custom-key"' >> ~/.zshrc

# 立即生效
source ~/.zshrc

# 验证
echo $CODEX_GLM_KEY
💡 env_key 指定的环境变量值必须与 cliproxy-config.yaml 中 api-keys 列表中的某个值一致。

七、开始使用
7.1 启动
# 确保 CLIProxyAPI 正在运行
lsof -i:8080

# 启动 Codex
codex
7.2 常用命令
# 交互模式
codex

# 直接提问
codex "解释这个项目的架构"

# 全自动模式（自动读写文件，谨慎使用）
codex --full-auto "修复 UserService 中的空指针异常"

# 指定工作目录
codex --cwd /path/to/project "分析代码质量"
7.3 交互模式快捷键
快捷键	功能
Enter	发送消息
Ctrl+C	取消当前操作
Ctrl+D	退出 Codex
↑ / ↓	浏览历史消息
八、常见问题排查
8.1 Missing environment variable: CODEX_GLM_KEY
原因：环境变量未设置或未生效。

解决：

# 检查环境变量
echo $CODEX_GLM_KEY

# 如果为空，手动设置
export CODEX_GLM_KEY="sk-your-custom-key"
source ~/.zshrc
8.2 503 Service Unavailable: auth_unavailable
原因：CLIProxyAPI 配置中的 api-keys 与 Codex 发送的 Key 不匹配。

解决：确保 ~/.codex/config.toml 中 env_key 对应的环境变量值，与 ~/.codex/cliproxy-config.yaml 中 api-keys 列表中的值一致。

8.3 stream disconnected before completion
原因：代理的流式处理出现兼容性问题。

解决：使用 CLIProxyAPI 替代自建代理（本文方案已解决此问题）。

8.4 macOS 提示"恶意软件已阻止"
原因：旧版 Codex（≤ 0.80.0）的二进制文件未经过 Apple 公证。

解决：使用最新版 Codex CLI（已签名），或对旧版执行自签名：

codesign --force --deep -s - /path/to/codex/binary
8.5 Model metadata for 'glm-5.1' not found
原因：这是正常的警告信息，Codex 找不到模型的元数据定义，会使用默认配置，不影响使用。

九、配置文件速查
最终 ~/.codex/ 目录下需要的文件：

~/.codex/
├── config.toml              # Codex CLI 配置
├── cliproxy-config.yaml     # CLIProxyAPI 代理配置
└── cli-proxy-api            # CLIProxyAPI 二进制文件
认证流程
Codex CLI
  → 读取 env_key="CODEX_GLM_KEY"
  → 获取环境变量值 "sk-your-custom-key"
  → 发送请求到 http://127.0.0.1:8080/v1/responses
    → CLIProxyAPI 验证 api-keys 中的 "sk-your-custom-key"
    → 转换 Responses API → Chat Completions API
    → 使用真实 GLM API Key 转发到智谱
    → 转换响应 Chat Completions → Responses API
  ← 返回给 Codex CLI
十、总结
通过 CLIProxyAPI 代理，我们成功将 Codex CLI 与智谱 GLM-5.1 模型对接，核心在于解决 Responses API 与 Chat Completions API 的协议转换问题。这套方案的优点：

✅ 成熟稳定：CLIProxyAPI 社区活跃（4.7k fork），持续维护
✅ 完整兼容：支持流式/非流式、function calling
✅ 低成本：智谱 Coding Plan 仅 $10/月
✅ 无需代理：国内直连智谱 API
参考链接
Codex CLI GitHub
CLIProxyAPI GitHub
智谱开放平台
智谱 Coding Plan
编辑于 2026-05-26 20:27・江苏w