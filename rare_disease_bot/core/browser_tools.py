"""浏览器工具集 - 支持反 Cloudflare"""
import asyncio
import time
import random
from typing import Optional, List
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from playwright_stealth import Stealth
from rich.console import Console

from config.settings import (
    HEADLESS,
    DEFAULT_WAIT_TIME,
    USER_AGENT,
    MAX_RETRIES,
    PROXY_SERVER,
    STORAGE_STATE_PATH,
    PERSISTENT_CONTEXT,
    USER_DATA_DIR,
)

console = Console()


class BrowserManager:
    """浏览器管理器 - 处理 Cloudflare 和页面操作"""
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
    async def __aenter__(self):
        """异步上下文管理器入口"""
        await self.start()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close()
        
    async def start(self):
        """启动浏览器"""
        console.log("[cyan]🚀 启动浏览器...[/cyan]")
        
        self.playwright = await async_playwright().start()

        if PERSISTENT_CONTEXT:
            # 使用持久化上下文，保留用户数据目录（Cookie、本地存储）
            self.context = await self.playwright.chromium.launch_persistent_context(
                user_data_dir=str(USER_DATA_DIR),
                headless=HEADLESS,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ],
                proxy={ 'server': PROXY_SERVER } if PROXY_SERVER else None,
            )
            self.browser = None
            self.context.set_default_navigation_timeout(30000)
            await self.context.set_extra_http_headers({ 'Accept-Language': 'en-US,en;q=0.9' })
        else:
            # 启动 Chromium（有界面模式，反 Cloudflare）
            self.browser = await self.playwright.chromium.launch(
                headless=HEADLESS,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ],
                proxy={ 'server': PROXY_SERVER } if PROXY_SERVER else None,
            )
            
            # 创建上下文（自定义 User-Agent），尝试加载持久化的 storage state
            storage_state = str(STORAGE_STATE_PATH) if STORAGE_STATE_PATH.exists() else None
            self.context = await self.browser.new_context(
                user_agent=USER_AGENT,
                viewport={'width': 1280, 'height': 800},
                locale='en-US',
                timezone_id='America/New_York',
                extra_http_headers={
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                storage_state=storage_state,
            )
        
        # 创建页面
        self.page = await self.context.new_page()
        
        # 应用反检测
        stealth_config = Stealth()
        await stealth_config.apply_stealth_async(self.page)
        
        console.log("[green]✓ 浏览器启动成功[/green]")
        
    async def close(self):
        """关闭浏览器"""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
            
        console.log("[yellow]✓ 浏览器已关闭[/yellow]")
        
    async def navigate(self, url: str, wait_time: Optional[int] = None) -> bool:
        """
        导航到 URL
        
        Args:
            url: 目标 URL
            wait_time: 等待时间（秒），默认使用 DEFAULT_WAIT_TIME
            
        Returns:
            bool: 是否成功
        """
        if not self.page:
            raise RuntimeError("浏览器未启动")
            
        wait_time = wait_time or DEFAULT_WAIT_TIME
        
        console.log(f"[cyan]🔗 导航到: {url}[/cyan]")

        try:
            retries = 0
            # 随机抖动，避免固定节奏触发风控
            base_wait = wait_time

            while retries <= MAX_RETRIES:
                # 导航到页面
                await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
                # 等待网络空闲，提高稳定性
                try:
                    await self.page.wait_for_load_state('networkidle', timeout=15000)
                except Exception:
                    # 某些站点不会进入 networkidle，忽略
                    pass

                # 检测 Cloudflare 验证页面
                is_cloudflare = await self._detect_cloudflare()

                if is_cloudflare:
                    # 动态等待时间，加入随机抖动
                    jitter = random.uniform(0.3, 0.7)
                    wait_sec = int((base_wait or DEFAULT_WAIT_TIME) * (1 + jitter))
                    console.log(f"[yellow]⚠️  检测到 Cloudflare 验证，等待 {wait_sec} 秒...[/yellow]")
                    await asyncio.sleep(wait_sec)

                    # 等待挑战 iframe（Turnstile）出现并运行
                    try:
                        await self.page.wait_for_selector('iframe[src*="challenges.cloudflare.com"]', timeout=10000)
                        # 给挑战执行时间
                        await asyncio.sleep(random.uniform(5, 10))
                    except Exception:
                        pass

                    # 模拟人类行为：轻微鼠标移动与滚动
                    await self._mimic_human_activity()

                    # 提示人工介入（在有界面模式下）
                    console.log("[yellow]🖐️ 请在浏览器窗口完成 Cloudflare 验证（最多 60 秒）[/yellow]")
                    for _ in range(30):
                        await asyncio.sleep(2)
                        if not await self._detect_cloudflare():
                            break

                    # 再次检测
                    is_cloudflare = await self._detect_cloudflare()
                    if is_cloudflare:
                        retries += 1
                        if retries > MAX_RETRIES:
                            console.log("[red]✗ Cloudflare 验证未通过，已达到最大重试次数[/red]")
                            return False
                        console.log(f"[yellow]↻ 重试第 {retries} 次，尝试刷新页面[/yellow]")
                        # 刷新并继续循环
                        try:
                            await self.page.reload(wait_until='domcontentloaded')
                            try:
                                await self.page.wait_for_load_state('networkidle', timeout=10000)
                            except Exception:
                                pass
                        except Exception:
                            # 如果刷新失败，继续下一轮
                            pass
                        # 在刷新后短暂等待
                        await asyncio.sleep(2)
                        continue
                else:
                    # 正常页面也等待一下，加入轻微抖动
                    jitter = random.uniform(0.1, 0.3)
                    wait_sec = int((base_wait or DEFAULT_WAIT_TIME) * (1 + jitter))
                    console.log(f"[cyan]⏳ 等待 {wait_sec} 秒...[/cyan]")
                    await asyncio.sleep(wait_sec)

                console.log("[green]✓ 页面加载完成[/green]")
                # 通过后保存 storage state（包含 Cookie）供下次复用
                try:
                    await self.context.storage_state(path=str(STORAGE_STATE_PATH))
                except Exception:
                    pass
                return True

            # 理论上不会到达这里
            return False

        except Exception as e:
            console.log(f"[red]✗ 导航失败: {e}[/red]")
            return False
            
    async def _detect_cloudflare(self) -> bool:
        """检测是否是 Cloudflare 验证页面"""
        try:
            # 检查标题
            title = await self.page.title()
            if 'cloudflare' in title.lower() or 'just a moment' in title.lower():
                return True
                
            # 检查页面内容
            content = await self.page.content()
            if 'Checking your browser' in content or 'cf-browser-verification' in content:
                return True
            # Turnstile 相关标识
            if 'cf-chl' in content or 'challenges.cloudflare.com' in content:
                return True
                
            return False
        except:
            return False

    async def _mimic_human_activity(self):
        """模拟人类行为以降低风控：鼠标移动与轻微滚动"""
        try:
            # 随机鼠标移动
            for _ in range(5):
                x = random.randint(50, 1200)
                y = random.randint(50, 700)
                await self.page.mouse.move(x, y, steps=random.randint(5, 15))
                await asyncio.sleep(random.uniform(0.05, 0.2))

            # 轻微滚动
            for _ in range(3):
                await self.page.evaluate('window.scrollBy(0, Math.random()*200)')
                await asyncio.sleep(random.uniform(0.2, 0.6))
        except Exception:
            pass
            
    async def get_html(self, max_length: Optional[int] = None) -> str:
        """
        获取页面 HTML
        
        Args:
            max_length: 最大长度（用于大模型分析）
            
        Returns:
            str: HTML 内容
        """
        if not self.page:
            raise RuntimeError("浏览器未启动")
            
        html = await self.page.content()
        
        if max_length and len(html) > max_length:
            html = html[:max_length]
            
        return html
        
    async def get_current_url(self) -> str:
        """获取当前 URL"""
        if not self.page:
            raise RuntimeError("浏览器未启动")
        return self.page.url
        
    async def execute_script(self, script: str):
        """执行 JavaScript"""
        if not self.page:
            raise RuntimeError("浏览器未启动")
        return await self.page.evaluate(script)
        
    async def query_selector_all(self, selector: str) -> List[str]:
        """
        查询元素（返回文本列表）
        
        Args:
            selector: CSS 选择器
            
        Returns:
            List[str]: 元素文本列表
        """
        if not self.page:
            raise RuntimeError("浏览器未启动")
            
        try:
            elements = await self.page.query_selector_all(selector)
            texts = []
            for element in elements:
                text = await element.text_content()
                if text:
                    texts.append(text.strip())
            return texts
        except Exception as e:
            console.log(f"[yellow]⚠️  查询元素失败 ({selector}): {e}[/yellow]")
            return []
            
    async def get_links(self, selector: str) -> List[str]:
        """
        获取链接列表
        
        Args:
            selector: CSS 选择器
            
        Returns:
            List[str]: URL 列表
        """
        if not self.page:
            raise RuntimeError("浏览器未启动")
            
        try:
            elements = await self.page.query_selector_all(selector)
            urls = []
            for element in elements:
                href = await element.get_attribute('href')
                if href:
                    # 转换为绝对 URL
                    absolute_url = await self.page.evaluate(
                        f'new URL("{href}", window.location.href).href'
                    )
                    urls.append(absolute_url)
            return urls
        except Exception as e:
            console.log(f"[yellow]⚠️  获取链接失败 ({selector}): {e}[/yellow]")
            return []
            
    async def scroll_to_bottom(self, pause_time: float = 1.0):
        """滚动到页面底部"""
        if not self.page:
            raise RuntimeError("浏览器未启动")
            
        await self.page.evaluate('''
            window.scrollTo(0, document.body.scrollHeight);
        ''')
        await asyncio.sleep(pause_time)


# 同步包装器（用于 LangChain Tools）
class BrowserToolsSync:
    """浏览器工具的同步包装器"""
    
    def __init__(self, browser_manager: BrowserManager):
        self.browser = browser_manager
        
    def navigate(self, url: str) -> str:
        """导航到 URL"""
        success = asyncio.get_event_loop().run_until_complete(
            self.browser.navigate(url)
        )
        return f"导航到 {url} {'成功' if success else '失败'}"
        
    def get_html(self, max_length: int = 30000) -> str:
        """获取 HTML"""
        return asyncio.get_event_loop().run_until_complete(
            self.browser.get_html(max_length)
        )
        
    def get_links(self, selector: str) -> List[str]:
        """获取链接"""
        return asyncio.get_event_loop().run_until_complete(
            self.browser.get_links(selector)
        )
        
    def get_current_url(self) -> str:
        """获取当前 URL"""
        return asyncio.get_event_loop().run_until_complete(
            self.browser.get_current_url()
        )
