<div align="center">

# CrAnE

**三档灰，两片翼，一折线。**

<img src="assets/CrAnE.png" width="384" height="384" alt="浅灰背景上，由两片灰色三角翼面和一条折线构成的抽象飞鹤。">

[SVG](assets/CrAnE.svg) · [1024 × 1024 PNG](assets/CrAnE.png)

</div>

## 名字里有什么

**CrAnE** 读作 *crane*，意为鹤。大写的 **C、A、E** 同时指向图像的三档灰阶：

| 字母 | 色值 | 位置 |
| :---: | :---: | --- |
| **C** | `#CCCCCC` | 远侧翼面 |
| **A** | `#AAAAAA` | 近侧翼面与折线 |
| **E** | `#EEEEEE` | 背景与留白 |

这个拼写把形象和配色放进了同一个名字，也延续了 [acex](https://github.com/xhugoliu/acex) 以灰阶字母命名图案的习惯。

## 从灰鹤到 CrAnE

<table>
  <tr>
    <td align="center"><img src="assets/background/GrusGrus.png" width="220" alt="最初的去色灰鹤头像"><br><strong>Grus grus</strong><br>姿态与留白</td>
    <td align="center"><img src="assets/background/xhugoliu.png" width="220" alt="由五个方块构成的三色几何 X 头像"><br><strong>acex</strong><br>灰阶与秩序</td>
    <td align="center"><img src="assets/CrAnE.png" width="220" alt="定稿的 CrAnE 几何灰鹤头像"><br><strong>CrAnE</strong><br>形态与规则</td>
  </tr>
</table>

它起于一张用了多年的头像：去色处理的灰鹤（*Grus grus*），在大面积留白中展翅飞行，带有一点水墨气息。后来，头像换成了只有三档灰阶、由五个方块构成的几何 X。

CrAnE 保留灰鹤的飞行姿态，也继承几何 X 的克制。羽毛、眼睛和喙的细节逐渐退去，留下两片翼面与一条向前伸展、向后下折的线。所有顶点都落在整数网格上，构造可以用一小段话说清楚。

## 几何定义

坐标系为 **16 × 16**。左上角是 `(0,0)`，X 向右、Y 向下。按下表从上到下绘制：

| 图层 | 颜色 | 构造 |
| --- | --- | --- |
| 背景 | E | 覆盖整个画布的正方形 |
| 远侧翼面 | C | 三角形 `(6,10) → (5,4) → (10,10)` |
| 近侧翼面 | A | 三角形 `(6,10) → (12,3) → (10,11)` |
| 折线 | A | `(2,10) → (6,10) → (14,12)`，线宽 `0.5` |

三角形闭合填充。折线不填充，使用 SVG 默认的平切端点（`butt`）和尖角连接（`miter`）。

- 两片翼面与折线共用支点 **`(6,10)`**。
- 折线先向右走 **4 格**，再向右 **8 格**、向下 **2 格**。
- 近侧翼面的下顶点 **`(10,11)`** 是斜线段的中点，其下沿与斜线中心线重合。
- 近侧翼面覆盖远侧翼面的一部分；折线最后绘制。
- PNG 中每格对应 **64 像素**，线宽对应 **32 像素**。

### 复原口令

> 十六格的 E 色方纸，以 `(6,10)` 为支点。C 翼连接 `(5,4)` 和 `(10,10)`；A 翼连接 `(12,3)` 和 `(10,11)`。最后用半格宽的 A 色线，从 `(2,10)` 水平画到支点，再连到 `(14,12)`。

完整 SVG 只有这些：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect width="16" height="16" fill="#eee"/>
  <polygon fill="#ccc" points="6,10 5,4 10,10"/>
  <polygon fill="#aaa" points="6,10 12,3 10,11"/>
  <polyline fill="none" stroke="#aaa" stroke-width=".5" points="2,10 6,10 14,12"/>
</svg>
```

## 复现与校验

需要 **Node.js 22 或更新版本**，无第三方依赖，无需安装包。

```sh
npm run check  # 只读校验定稿资产
npm run build  # 从几何定义重新生成两个资产
```

`scripts/crane.mjs` 集中保存尺寸、配色、顶点和线宽。它从相同定义生成 SVG，并以像素中心采样方式生成 PNG：三角形与折线轮廓都是实色填充，不做抗锯齿。PNG 使用三色索引调色板，实际像素严格只有 `#AAA`、`#CCC`、`#EEE`，没有透明通道。

校验会检查 SVG 构造，以及 PNG 的尺寸、调色板、数据完整性和全部像素；压缩字节的差异不会被误认为图像发生变化。SVG 在浏览器中通常会经过抗锯齿显示，因此需要严格三色像素时使用 PNG。

每次推送或提交 Pull Request 时，GitHub Actions 会校验资产并重新构建，检查生成结果是否与仓库中的定稿一致。

## 文件

```text
assets/
  CrAnE.svg          矢量定稿
  CrAnE.png          1024 × 1024 三色位图定稿
  background/
    GrusGrus.png     最初的去色灰鹤头像
    xhugoliu.png     acex 几何 X 头像
scripts/
  crane.mjs          几何定义、生成与校验
```

`assets/` 下的两个 CrAnE 文件是当前定稿；`background/` 保存设计背景参考。
