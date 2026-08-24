# ============================================================================
# DSH Conversation Timeline 插件卸载脚本（便携版）
#
# 用法：
#   .\uninstall.ps1
#   .\uninstall.ps1 -ProfileDir <dsh web profile 目录>
#
# 脚本动作：
#   1. 从 profile package.json 移除依赖声明和 bundles 条目
#   2. 删除 profile/node_modules 下的插件目录
#   3. 幂等：未安装时运行也安全
# ============================================================================
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ProfileDir = "$env:USERPROFILE\.dsh\profiles\web"
)

$ErrorActionPreference = "Stop"

# --- 常量 ---
$pluginName = "@kindred7/dsh-timeline"
$targetDir  = Join-Path $ProfileDir "node_modules\$pluginName"
$pkgPath    = Join-Path $ProfileDir "package.json"

Write-Host "=== $pluginName 卸载 ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $ProfileDir)) {
    Write-Host "profile 目录不存在 ($ProfileDir)，无需卸载。" -ForegroundColor Yellow
    exit 0
}

# --- 1. 清理 package.json ----------------------------------------------------
if (Test-Path $pkgPath) {
    $pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $changed = $false

    if ($pkg.PSObject.Properties['dependencies'] -and
        $pkg.dependencies.PSObject.Properties[$pluginName]) {
        $pkg.dependencies.PSObject.Properties.Remove($pluginName)
        $changed = $true
        Write-Host "[1/2] 已移除 dependencies 声明" -ForegroundColor Green
    }
    if ($pkg.PSObject.Properties['dsh'] -and
        $pkg.dsh.PSObject.Properties['profile'] -and
        $pkg.dsh.profile.PSObject.Properties['bundles']) {
        $bundles = @($pkg.dsh.profile.bundles | Where-Object { $_ -ne $pluginName })
        if ($bundles.Count -ne @($pkg.dsh.profile.bundles).Count) {
            $pkg.dsh.profile.bundles = $bundles
            $changed = $true
            Write-Host "      已从 dsh.profile.bundles 移除" -ForegroundColor Green
        }
    }
    if ($changed) {
        # UTF-8 无 BOM 写回，避免 Node 解析 JSON 出问题
        $json = ($pkg | ConvertTo-Json -Depth 32) + "`n"
        [System.IO.File]::WriteAllText($pkgPath, $json, (New-Object System.Text.UTF8Encoding($false)))
    } else {
        Write-Host "[1/2] package.json 中无残留配置" -ForegroundColor DarkGray
    }
}

# --- 2. 删除插件目录 ---------------------------------------------------------
if (Test-Path $targetDir) {
    Remove-Item -Recurse -Force $targetDir
    Write-Host "[2/2] 已删除插件文件" -ForegroundColor Green
} else {
    Write-Host "[2/2] 插件文件不存在，跳过" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "卸载完成。重启 DSH 生效:  dsh web" -ForegroundColor Cyan
