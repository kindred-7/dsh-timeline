# ============================================================================
# DSH Conversation Timeline 插件安装脚本（便携版）
#
# 用法：把整个插件文件夹拷贝到目标电脑任意位置，然后：
#   cd dsh-timeline
#   .\install.ps1
#
# 可选参数：
#   -ProfileDir <路径>  指定 dsh web profile 目录
#                       （默认 %USERPROFILE%\.dsh\profiles\web）
#
# 脚本动作：
#   1. 把插件文件复制到 profile 的 node_modules 下
#   2. 向 profile 的 package.json 写入依赖声明 (file:./node_modules/...)
#   3. 把插件名追加到 dsh.profile.bundles 列表
#   4. 幂等：重复运行安全，只会覆盖更新
# ============================================================================
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ProfileDir = "$env:USERPROFILE\.dsh\profiles\web"
)

$ErrorActionPreference = "Stop"

# --- 常量 ---
$pluginName   = "@kindred7/dsh-timeline"
$pluginSource = $PSScriptRoot                       # 以脚本所在目录为源，天然便携
$targetDir    = Join-Path $ProfileDir "node_modules\$pluginName"
$pkgPath      = Join-Path $ProfileDir "package.json"

Write-Host "=== $pluginName 安装 ===" -ForegroundColor Cyan
Write-Host "源目录: $pluginSource"
Write-Host "目标:   $targetDir"
Write-Host ""

# --- 0. 前置检查 -------------------------------------------------------------
if (-not (Test-Path (Join-Path $pluginSource "package.json"))) {
    Write-Host "错误: 当前目录不是插件根目录（缺少 package.json）。请进入插件目录后运行本脚本。" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $ProfileDir)) {
    Write-Host "错误: 找不到 dsh web profile 目录 $ProfileDir" -ForegroundColor Red
    Write-Host "请先运行一次 'dsh web' 让其初始化 profile，再安装本插件。" -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path $pkgPath)) {
    Write-Host "错误: profile 缺少 package.json ($pkgPath)" -ForegroundColor Red
    exit 1
}

# --- 1. 复制插件文件到 profile/node_modules ----------------------------------
New-Item -ItemType Directory -Path (Join-Path $ProfileDir "node_modules") -Force | Out-Null
if (Test-Path $targetDir) {
    Write-Host "检测到旧版本，正在覆盖更新..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $targetDir
}
Copy-Item -Recurse -Force $pluginSource $targetDir
Write-Host "[1/3] 插件文件已复制" -ForegroundColor Green

# --- 2. 更新 profile package.json：依赖 + bundles ----------------------------
# 注意：用 .NET API 以 UTF-8 无 BOM 写回，避免 Node 解析 JSON 出问题
$pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json

if (-not ($pkg.PSObject.Properties['dependencies'])) {
    $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{})
}
# file:./node_modules/... 相对写法不绑定具体盘符/用户名，任何机器通用
$pkg.dependencies | Add-Member -NotePropertyName $pluginName `
                               -NotePropertyValue "file:./node_modules/$pluginName" -Force

if (-not ($pkg.PSObject.Properties['dsh'])) {
    $pkg | Add-Member -NotePropertyName dsh -NotePropertyValue ([pscustomobject]@{})
}
if (-not ($pkg.dsh.PSObject.Properties['profile'])) {
    $pkg.dsh | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{})
}
if (-not ($pkg.dsh.profile.PSObject.Properties['bundles'])) {
    $pkg.dsh.profile | Add-Member -NotePropertyName bundles -NotePropertyValue @()
}
$bundles = @($pkg.dsh.profile.bundles)
if ($bundles -notcontains $pluginName) {
    $pkg.dsh.profile.bundles = $bundles + $pluginName
}

$json = ($pkg | ConvertTo-Json -Depth 32) + "`n"
[System.IO.File]::WriteAllText($pkgPath, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[2/3] package.json 已更新（dependency + bundles）" -ForegroundColor Green

# --- 3. 完成 -----------------------------------------------------------------
Write-Host "[3/3] 安装完成" -ForegroundColor Green
Write-Host ""
Write-Host "重启 DSH 使插件生效:" -ForegroundColor Cyan
Write-Host "  dsh web" -ForegroundColor White
Write-Host ""
Write-Host "卸载: 运行同目录下的 .\uninstall.ps1" -ForegroundColor DarkGray
