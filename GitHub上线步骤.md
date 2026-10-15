# 发布到 GitHub Pages · 傻瓜步骤

你的代码已经配好了 GitHub Pages 所需的全部配置，只需要在 GitHub 上操作几步即可上线。

## 前提

- 已注册 GitHub 账号
- 电脑上装好了 Git（Windows 可到 <https://git-scm.com> 下载安装）

## 第一步：在 GitHub 上创建仓库

1. 打开 <https://github.com> ，登录
2. 点右上角「+」→「New repository」
   1. 仓库名填 `Planner`（注意首字母大写，和代码配置一致）
3. 选 **Public**（公开，免费才能用 Pages）
4. 其他保持默认，点「Create repository」

创建后会出现一个页面，上面有一堆命令，先**别关**，下一步要用。

## 第二步：把本地代码推上去

在电脑上打开「命令提示符」（Win+R 输入 `cmd` 回车），逐行粘贴执行：

```
cd /d C:\Users\user\WorkBuddy\2026-10-15-18-16-14\planner
```

然后执行（把下面 3 行的 `你的用户名` 换成你的 GitHub 用户名）：

```
git init
git add .
git commit -m "first release"
git branch -M main
git remote add origin https://github.com/你的用户名/Planner.git
git push -u origin main
```

推送时会弹出登录框或要求输入账号密码，按提示登录即可。

> 提示：如果没装 Git，上面命令会报「不是内部或外部命令」。先去 <https://git-scm.com> 装好再回来。

## 第三步：开启 Pages

1. 回到 GitHub 上的仓库页面，点 **Settings**
2. 左侧点 **Pages**
3. 「Source」下拉框选 **GitHub Actions**
4. 完事，不用再做别的

## 第四步：等自动部署

推上去后，GitHub 会自动开始构建（约 1~2 分钟）。完成后：

1. 仓库页点 **Actions** 标签，能看到一条绿色对勾的任务
2. 访问 `https://你的用户名.github.io/Planner/` 就能打开你的工具了

## 以后每次更新

改完功能后，执行：

```
git add .
git commit -m "更新"
git push
```

推上去后自动重新部署，等 1 分钟刷新即可。

## 常见问题

**Q：访问地址 404？**  
等 Action 跑完（看 Actions 标签有没有绿色对勾），或者确认 Settings → Pages → Source 选的是 GitHub Actions。

**Q：改了代码但线上没变？**  
多半是浏览器缓存，强制刷新（Ctrl+F5）；或者确认 push 成功了。

**Q：iPad 想当成 App 用？**  
Safari 打开你的地址 → 分享按钮 →「添加到主屏幕」。

**Q：数据会同步吗？**  
不会。数据存在每台设备自己的浏览器里。换设备前记得在「设置」页导出备份。
