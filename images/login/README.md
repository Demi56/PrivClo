# 登录页图标（可选）

登录页已用内联 SVG 占位显示图标，**无需必放图片**即可正常显示。

若需替换为自有图标，可放置以下文件（单张建议 &lt;200KB）：

- `icon-app.png`：App 图标（衣架等）
- `icon-phone.png`：手机号输入框左侧图标
- `icon-lock.png`：密码输入框左侧图标
- `icon-eye.png`：密码可见/隐藏
- `icon-apple.png`、`icon-wechat.png`、`icon-more.png`：其他方式登录

放置后需在 `pages/login/login.wxml` 中把对应 `<view class="input-icon">` 等改为 `<image class="input-icon" src="/images/login/xxx.png" mode="aspectFit" />`。
