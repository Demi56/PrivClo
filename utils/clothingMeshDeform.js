/**
 * 衣物网格变形：规则网格三角剖分（与平面点集 Delaunay 在矩形网格上等价）+ 每三角形仿射纹理映射
 * 默认 6x6 网格（可调 5～6），避免点数过多
 */

var DEFAULT_GRID = 6

/** 解 3x3 线性方程组 A*x = b（A 为 3x3） */
function solveLinear3(A, b) {
  var a00 = A[0][0]
  var a01 = A[0][1]
  var a02 = A[0][2]
  var a10 = A[1][0]
  var a11 = A[1][1]
  var a12 = A[1][2]
  var a20 = A[2][0]
  var a21 = A[2][1]
  var a22 = A[2][2]
  var b0 = b[0]
  var b1 = b[1]
  var b2 = b[2]
  var det =
    a00 * (a11 * a22 - a12 * a21) -
    a01 * (a10 * a22 - a12 * a20) +
    a02 * (a10 * a21 - a11 * a20)
  if (Math.abs(det) < 1e-10) return [0, 0, 0]
  var invDet = 1 / det
  var inv00 = (a11 * a22 - a12 * a21) * invDet
  var inv01 = (a02 * a21 - a01 * a22) * invDet
  var inv02 = (a01 * a12 - a02 * a11) * invDet
  var inv10 = (a12 * a20 - a10 * a22) * invDet
  var inv11 = (a00 * a22 - a02 * a20) * invDet
  var inv12 = (a10 * a02 - a00 * a12) * invDet
  var inv20 = (a10 * a21 - a11 * a20) * invDet
  var inv21 = (a01 * a20 - a00 * a21) * invDet
  var inv22 = (a00 * a11 - a10 * a01) * invDet
  return [
    inv00 * b0 + inv01 * b1 + inv02 * b2,
    inv10 * b0 + inv11 * b1 + inv12 * b2,
    inv20 * b0 + inv21 * b1 + inv22 * b2
  ]
}

/**
 * 由三对对应点（源：图像像素坐标，目标：画布坐标）求 Canvas setTransform 参数
 * x' = a*x + c*y + e, y' = b*x + d*y + f
 */
function affineFromTriangle(s0, s1, s2, d0, d1, d2) {
  var A = [
    [s0.x, s0.y, 1],
    [s1.x, s1.y, 1],
    [s2.x, s2.y, 1]
  ]
  var bx = [d0.x, d1.x, d2.x]
  var by = [d0.y, d1.y, d2.y]
  var rx = solveLinear3(A, bx)
  var ry = solveLinear3(A, by)
  return {
    a: rx[0],
    c: rx[1],
    e: rx[2],
    b: ry[0],
    d: ry[1],
    f: ry[2]
  }
}

function buildGridTriangleIndices(gridSize) {
  var n = gridSize
  var tris = []
  for (var j = 0; j < n - 1; j++) {
    for (var i = 0; i < n - 1; i++) {
      var i00 = j * n + i
      var i10 = j * n + i + 1
      var i01 = (j + 1) * n + i
      var i11 = (j + 1) * n + i + 1
      tris.push([i00, i10, i11])
      tris.push([i00, i11, i01])
    }
  }
  return tris
}

/**
 * 新建默认网格：u,v ∈ [0,1]，偏移 ox,oy 初始为 0
 */
function createDefaultMesh(gridSize, sourceUrl) {
  var n = gridSize
  var verts = []
  for (var j = 0; j < n; j++) {
    for (var i = 0; i < n; i++) {
      var u = n > 1 ? i / (n - 1) : 0
      var v = n > 1 ? j / (n - 1) : 0
      verts.push({ u: u, v: v, ox: 0, oy: 0 })
    }
  }
  return {
    gridSize: n,
    sourceUrl: sourceUrl || '',
    verts: verts,
    triangles: buildGridTriangleIndices(n)
  }
}

function clampGridSize(n) {
  var g = parseInt(n, 10) || DEFAULT_GRID
  if (g < 4) g = 4
  if (g > 6) g = 6
  return g
}

/**
 * 根据 fit 矩形计算某顶点当前画布坐标（含偏移）
 */
function vertexCanvasXY(vert, fitX, fitY, fitW, fitH) {
  var rx = fitX + vert.u * fitW
  var ry = fitY + vert.v * fitH
  return { x: rx + (vert.ox || 0), y: ry + (vert.oy || 0) }
}

/**
 * 源三角形顶点（图像像素坐标）
 */
function vertexSourcePx(vert, imgW, imgH) {
  return { x: vert.u * imgW, y: vert.v * imgH }
}

/**
 * 绘制单个三角形的纹理（仿射 + clip）
 */
function drawTexturedTriangle(ctx, img, su0, su1, su2, du0, du1, du2) {
  var t = affineFromTriangle(su0, su1, su2, du0, du1, du2)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(du0.x, du0.y)
  ctx.lineTo(du1.x, du1.y)
  ctx.lineTo(du2.x, du2.y)
  ctx.closePath()
  ctx.clip()
  ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

/**
 * 绘制整件衣物网格
 */
function triArea2(a, b, c) {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))
}

function drawMeshedClothing(ctx, img, mesh, fitX, fitY, fitW, fitH) {
  if (!mesh || !mesh.verts || !mesh.triangles) return
  var verts = mesh.verts
  var iw = img.width
  var ih = img.height
  var tris = mesh.triangles
  for (var t = 0; t < tris.length; t++) {
    var tri = tris[t]
    var ia = tri[0]
    var ib = tri[1]
    var ic = tri[2]
    var va = verts[ia]
    var vb = verts[ib]
    var vc = verts[ic]
    if (!va || !vb || !vc) continue
    var du0 = vertexCanvasXY(va, fitX, fitY, fitW, fitH)
    var du1 = vertexCanvasXY(vb, fitX, fitY, fitW, fitH)
    var du2 = vertexCanvasXY(vc, fitX, fitY, fitW, fitH)
    if (triArea2(du0, du1, du2) < 0.25) continue
    var su0 = vertexSourcePx(va, iw, ih)
    var su1 = vertexSourcePx(vb, iw, ih)
    var su2 = vertexSourcePx(vc, iw, ih)
    if (triArea2(su0, su1, su2) < 1e-6) continue
    drawTexturedTriangle(ctx, img, su0, su1, su2, du0, du1, du2)
  }
}

/**
 * 计算用于命中测试的顶点画布坐标列表
 */
function getDeformedVertexCanvasList(mesh, fitX, fitY, fitW, fitH) {
  var out = []
  var verts = mesh.verts || []
  for (var i = 0; i < verts.length; i++) {
    var p = vertexCanvasXY(verts[i], fitX, fitY, fitW, fitH)
    out.push({ x: p.x, y: p.y, index: i })
  }
  return out
}

function cloneMesh(mesh) {
  if (!mesh) return null
  return {
    gridSize: mesh.gridSize,
    sourceUrl: mesh.sourceUrl,
    verts: (mesh.verts || []).map(function(v) {
      return { u: v.u, v: v.v, ox: v.ox || 0, oy: v.oy || 0 }
    }),
    triangles: (mesh.triangles || []).map(function(tr) {
      return tr.slice()
    })
  }
}

module.exports = {
  DEFAULT_GRID,
  clampGridSize,
  createDefaultMesh,
  buildGridTriangleIndices,
  drawMeshedClothing,
  getDeformedVertexCanvasList,
  vertexCanvasXY,
  cloneMesh
}
