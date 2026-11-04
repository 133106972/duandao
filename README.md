# 一锤子买卖（断刀）

打铁赌运气的增量小游戏。每一锤可能升级也可能碎，等级越高越值钱也越容易碎；剑价像股票一样每锤都在跳，要按期还钱庄的高利贷。

**在线玩**：开启 GitHub Pages 后地址是 `https://133106972.github.io/duandao/`，首页能选任意一个版本玩。

**单文件版**：`docs/one-hammer-deal.html` 是整个游戏打包成的一个文件，双击就能玩，不联网也行，可以直接发给别人（微信、QQ 发文件都可以）。

## 目录

| 位置 | 内容 |
|---|---|
| `game/` | 当前版本的源码（`index.html` + `game.js`，纯网页，没有依赖） |
| `docs/` | 网站：版本列表 `index.html`，以及每个版本一个文件夹 `v0.1/`、`v0.2/` …… |
| `DESIGN.md` | 设计和交接文档：规则、数值、代码在哪、接下来做什么 |
| `tools/` | 录宣传片的脚本（Playwright） |
| `media/` | 自动试玩视频 |
| `store/taptap/` | TapTap 上架资料包：按上传顺序编号的文件夹（H5 包、图标、截图、实机录屏、宣传片、宣传图、LOGO、封面、壁纸），先看 `00_上架指引（先看这个）.html` |

## 本地运行

```bash
cd game && python3 -m http.server 8766
```

然后打开 `http://localhost:8766/`。地址后面加 `#demo` 是 AI 自动试玩。

## 发一个新版本

1. 改 `game/` 里的代码。
2. 把 `game/` 复制成 `docs/v0.X/`，在 `docs/index.html` 里加一行更新说明；单文件版用 `tools/build-standalone.py` 重新生成。
3. 提交并推送，网站会自动更新。

## 开启网站（只需要一次）

仓库 Settings → Pages → Build and deployment：Source 选 **Deploy from a branch**，Branch 选 **main**，文件夹选 **/docs**，保存。
