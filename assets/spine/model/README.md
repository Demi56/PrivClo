# Spine 模特资源

将 Spine 骨骼动画资源放入此处，目录结构示例：

```
model/
├── female/           # 女性模特
│   ├── model.json    # 骨骼数据
│   ├── model.atlas   # 图集描述
│   └── model.png     # 图集贴图（或 model.webp）
└── male/             # 男性模特
    ├── model.json
    ├── model.atlas
    └── model.png
```

## 必需动画
- `idle`：待机动画（循环）
- `happy`：点击交互/开心（可选）
- `surprise`：换装成功反馈（可选）

## 插槽名称（与换装系统对应）
- `top` - 上衣
- `bottom` - 下装
- `dress` - 连衣裙/套装
- `shoes` - 鞋子
- `hair` - 发型/配饰

## 资源建议
- 单个体积控制在 2MB 以内
- 使用 WebP 可减小体积
