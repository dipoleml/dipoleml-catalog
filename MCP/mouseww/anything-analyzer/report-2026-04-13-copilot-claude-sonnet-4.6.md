# Cursor.com 加密机制深度分析报告

## 一、整体架构概览

```
用户访问 cursor.com
        │
        ▼
┌─────────────────────────────────────────────────────┐
│              KasadaBot Protection Layer              │
│  (149e9513-01fa-4fb0-aad4-566afd725d1b 路径标识)     │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
  /fp  指纹采集        /tl  令牌提交
  (fingerprint)        (token layer)
               │
               ▼
    ┌─────────────────────┐
    │   KP_UIDz Cookie    │  → 携带至业务请求
    └──────────┬──────────┘
               │
               ▼
    POST /api/chat  (SSE流式响应)
```

---

## 二、加密算法识别

### 2.1 算法清单

| 编号 | 算法 | 用途 | 位置 | 具体方法 |
|------|------|------|------|----------|
| A1 | **AES-CBC (256-bit)** | 指纹数据加密 | c.js `D()` 函数 | `crypto.subtle.encrypt({name:'AES-CBC'})` |
| A2 | **PBKDF2** | AES密钥派生 | c.js `D()` 函数 | `crypto.subtle.deriveBits` → `importKey` |
| A3 | **SHA-256** | PBKDF2哈希参数 | c.js `D()` 函数 | `{hash:'SHA-256'}` |
| A4 | **RC4变体 (自定义KSA)** | 字符串混淆解密 | c.js `y()` 函数 | 手写KSA/PRGA，无标准库 |
| A5 | **XEW (XOR编码)** | 数值混淆 | c.js 常量表 | `^` 运算符 |
| A6 | **Base64** | 最终编码 | c.js `btoa()` | 原生btoa |
| A7 | **HMAC (推测)** | `/tl` 请求体签名 | 二进制请求体 | 不可见（混淆后运行时） |

### 2.2 `D()` 函数核心代码还原（去混淆）

```javascript
// 原始混淆版本关键结构抽取：
async function D(plaintext_key, data_object) {
    // 1. 生成随机盐 (16字节)
    let salt = crypto.getRandomValues(new Uint8Array(16));
    
    // 2. 生成随机IV (16字节)  
    let iv = crypto.getRandomValues(new Uint8Array(16));
    
    // 3. 导入原始密钥材料 (密码 = swsWp字段值)
    let rawKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(plaintext_key),  // 'JoFJh' → 密码字符串
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']  // 'hXWsW' + 'KwHKs'
    );
    
    // 4. PBKDF2 派生 AES-256 密钥
    let aesKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',           // 'JoFJh'
            salt: salt,
            iterations: 100000,       // 0x186a0
            hash: 'SHA-256'           // 'jBgDZ'
        },
        rawKey,
        {name: 'AES-CBC', length: 256},  // 'CLVUw'
        false,
        ['encrypt']                   // 'BaHKn'
    );
    
    // 5. AES-CBC 加密
    let ciphertext = await crypto.subtle.encrypt(
        {name: 'AES-CBC', iv: iv},
        aesKey,
        new TextEncoder().encode(JSON.stringify(data_object))
    );
    
    // 6. 拼接: salt(16) + iv(16) + ciphertext → Base64
    return btoa(String.fromCharCode(...salt, ...iv, ...new Uint8Array(ciphertext)));
}
```

---

## 三、加密流程完整 Pipeline

### 3.1 指纹数据加密流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      数据流转图                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  环境指纹采集 J()                                                    │
│  ┌───────────────────────────────────────────┐                      │
│  │  p: 是否自动化浏览器检测 (devtools/phantom)│                      │
│  │  S: 0.4043... (固定混淆数值)               │                      │
│  │  w: WebGL渲染器信息 t(window)              │                      │
│  │  s: 导航器/驱动器检测 W(window)            │                      │
│  │  h: UserAgent检测 N(window)               │                      │
│  │  b: console检测 e()                        │                      │
│  │  d: devtools开启状态 j()                   │                      │
│  └──────────────────┬────────────────────────┘                      │
│                     │                                                │
│                     ▼                                                │
│  密钥生成                                                            │
│  ┌──────────────────────────────┐                                   │
│  │  k = btoa('juvsu') + ...     │  ← RC4解混淆后的硬编码密钥片段    │
│  │  a = btoa('EoXvw') + ...     │  ← 多段字符串拼接                 │
│  │  password = k + a (concat)   │                                   │
│  └──────────────────┬───────────┘                                   │
│                     │                                                │
│                     ▼                                                │
│  PBKDF2 密钥派生                                                     │
│  ┌────────────────────────────────────────┐                         │
│  │  输入: password (UTF-8)                │                         │
│  │  salt:  crypto.getRandomValues(16B)    │                         │
│  │  iter:  100,000 次                     │                         │
│  │  hash:  SHA-256                        │                         │
│  │  输出:  AES-256-CBC Key                │                         │
│  └──────────────────┬─────────────────────┘                         │
│                     │                                                │
│                     ▼                                                │
│  AES-256-CBC 加密                                                    │
│  ┌────────────────────────────────────────┐                         │
│  │  明文: JSON.stringify(fingerprint_obj) │                         │
│  │  IV:   crypto.getRandomValues(16B)     │                         │
│  │  Key:  上步派生结果                    │                         │
│  └──────────────────┬─────────────────────┘                         │
│                     │                                                │
│                     ▼                                                │
│  拼接编码                                                            │
│  ┌─────────────────────────────────────┐                            │
│  │  output = Base64(salt + iv + cipher)│  共 32 + len(cipher) 字节 │
│  └──────────────────┬──────────────────┘                            │
│                     │                                                │
│                     ▼                                                │
│  POST /tl  (octet-stream 二进制请求体)                               │
│  ← 响应: {"reload": true} 表示令牌有效                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 KP_UIDz Cookie 生命周期

```
/fp 请求
  └─→ 加载 ips.js (携带 KP_UID 参数)
        └─→ Set-Cookie: KP_UIDz-ssn = <会话令牌>
              └─→ Set-Cookie: KP_UIDz = <持久令牌>
                    └─→ 后续所有请求携带此Cookie
                          └─→ /api/chat 等业务接口鉴权
```

### 3.3 Kasada `/tl` 请求体结构分析

```
二进制请求体布局 (推测结构):
┌─────────────────────────────────────────┐
│ [0-3]   Magic / Version Header          │
│ [4-7]   Timestamp (Unix ms)             │
│ [8-23]  KP_UIDz Token Binding           │
│ [24-39] HMAC-SHA256 of above            │
│ [40+]   AES加密的指纹JSON               │
│   [40-55]  salt (16 bytes)              │
│   [56-71]  IV   (16 bytes)              │
│   [72+]    ciphertext                   │
└─────────────────────────────────────────┘
```

---

## 四、密钥管理分析

### 4.1 密钥来源详情

| 密钥 | 来源类型 | 格式 | 长度 | 说明 |
|------|----------|------|------|------|
| PBKDF2 password (`k+a`) | **半硬编码** | UTF-8字符串 | ~32字节 | RC4混淆存储在JS中，运行时拼接 |
| AES salt | **随机生成** | Uint8Array | 16 bytes | 每次请求随机，嵌入密文 |
| AES IV | **随机生成** | Uint8Array | 16 bytes | 每次请求随机，嵌入密文 |
| KP_UIDz | **服务端颁发** | Base64-like URL-safe | ~128字节 | 服务端验证后通过Cookie下发 |
| Challenge nonce | **服务端提供** | URL参数 | ~64字节 | `x-kpsdk-im` 参数 |

### 4.2 密钥 `k` 和 `a` 的还原逻辑

```javascript
// k 的生成 (t()函数末尾):
// btoa("juvsu") = "anV2c3U="
// 加上一系列 String.fromCharCode 拼接的字符

// a 的生成 (W()函数末尾):
// btoa("5p9?en") → 对应 kniaX
// btoa("EoXvw") → 对应 mgiimgtq7 的base64
// btoa("7bjXis") → 对应 yHLWo
```

---

## 五、签名/校验机制

### 5.1 Kasada 挑战-应答机制

```
服务端                              客户端
  │                                   │
  │── GET /fp?x-kpsdk-v=j-1.2.308 ──→│
  │                                   │  解析响应中的 KPSDK:MC:... 消息
  │                                   │  包含: challenge_token
  │                                   │
  │← POST x-kpsdk-im (challenge) ────│
  │                                   │  执行 c.js 中的 PoW 计算
  │                                   │  采集浏览器指纹
  │                                   │  加密指纹数据
  │                                   │
  │← POST /tl (binary payload) ──────│
  │   Headers:                        │
  │   KP_UIDz-ssn, KP_UIDz cookies   │
  │                                   │
  │── Set-Cookie: KP_UIDz=... ───────→│
  │   {"reload": true}                │
```

### 5.2 Vercel Analytics 事件签名

```json
// #82 请求体 (明文，无加密)
{
  "o": "https://cursor.com/cn/docs/api",   // origin
  "sv": "0.1.3",                            // sdk version  
  "sdkn": "@vercel/analytics/next",
  "sdkv": "1.6.1",
  "ts": 1775918082253,                      // 时间戳 (ms)
  "dp": "/[lang]/docs/[...slug]",           // dynamic path
  "r": "",                                  // referrer
  "en": "Submit prompt",                    // event name
  "ed": {                                   // event data
    "message": "hi",
    "page": "/docs/api",
    "turnNumber": 1
  }
}
// 无签名，仅依赖Cookie鉴权
```

---

## 六、完整 Python 复现代码

```python
#!/usr/bin/env python3
"""
Cursor.com Kasada 绕过 + AI Chat 接口调用复现
注意: 本代码仅用于安全研究和学习目的

依赖: pip install httpx cryptography
"""

import os
import json
import base64
import struct
import time
import asyncio
import hashlib
import secrets
from typing import Optional

import httpx
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


# ============================================================
# 1. 常量与配置
# ============================================================

BASE_URL = "https://cursor.com"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/134.0.6998.205 Safari/537.36"
)

# Kasada 路径标识符 (从请求日志中提取)
KASADA_UUID_1 = "149e9513-01fa-4fb0-aad4-566afd725d1b"
KASADA_UUID_2 = "2d206a39-8ed7-437e-a3be-862e0f06eea3"

# PBKDF2 密码 (从 c.js 混淆代码中提取的半硬编码值)
# 注意: 实际值需要运行 c.js 才能得到完整字符串
# 以下是根据代码分析的近似结构
PBKDF2_PASSWORD_K_SEED = "juvsu"   # juvsu → btoa → "anV2c3U="
PBKDF2_PASSWORD_A_SEED = "EoXvw"   # mgiimgtq7 相关

PBKDF2_ITERATIONS = 100_000


# ============================================================
# 2. 加密工具函数
# ============================================================

class AESCBCEncryptor:
    """AES-256-CBC 加密器，对应 c.js 中的 D() 函数"""
    
    @staticmethod
    def derive_key(password: str, salt: bytes) -> bytes:
        """
        PBKDF2-SHA256 密钥派生
        对应: crypto.subtle.deriveKey({name:'PBKDF2', hash:'SHA-256', iterations:100000})
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,           # AES-256 = 32 bytes
            salt=salt,
            iterations=PBKDF2_ITERATIONS,
            backend=default_backend()
        )
        return kdf.derive(password.encode('utf-8'))
    
    @staticmethod
    def encrypt(password: str, plaintext: str) -> str:
        """
        完整加密流程:
        password + random_salt → PBKDF2 → AES_key
        plaintext → PKCS7 padding → AES-CBC(key, random_iv) → ciphertext
        output = Base64(salt[16] + iv[16] + ciphertext)
        """
        # 生成随机 salt 和 IV
        salt = secrets.token_bytes(16)
        iv = secrets.token_bytes(16)
        
        # 派生 AES 密钥
        aes_key = AESCBCEncryptor.derive_key(password, salt)
        
        # PKCS7 填充
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plaintext.encode('utf-8')) + padder.finalize()
        
        # AES-CBC 加密
        cipher = Cipher(
            algorithms.AES(aes_key),
            modes.CBC(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        # 拼接: salt + iv + ciphertext → Base64
        combined = salt + iv + ciphertext
        return base64.b64encode(combined).decode('ascii')
    
    @staticmethod
    def decrypt(password: str, encoded: str) -> str:
        """解密验证函数"""
        data = base64.b64decode(encoded)
        salt = data[:16]
        iv = data[16:32]
        ciphertext = data[32:]
        
        aes_key = AESCBCEncryptor.derive_key(password, salt)
        
        cipher = Cipher(
            algorithms.AES(aes_key),
            modes.CBC(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        padded = decryptor.update(ciphertext) + decryptor.finalize()
        
        unpadder = padding.PKCS7(128).unpadder()
        plaintext = unpadder.update(padded) + unpadder.finalize()
        return plaintext.decode('utf-8')


# ============================================================
# 3. 指纹数据构造
# ============================================================

class FingerprintCollector:
    """
    模拟 c.js 中 J() 函数的指纹采集
    对应字段: p, S, w, s, h, b, d
    """
    
    @staticmethod
    def check_automation() -> bool:
        """p: 检测自动化工具特征"""
        return False  # 正常浏览器返回 False
    
    @staticmethod
    def get_fixed_value() -> float:
        """S: 固定混淆数值"""
        return 0.4043074801008981
    
    @staticmethod
    def get_webgl_info() -> Optional[dict]:
        """
        w: WebGL渲染器信息
        对应 t(window) 函数，获取 UNMASKED_VENDOR/RENDERER
        """
        return {
            "v": "Google Inc. (NVIDIA)",
            "r": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)"
        }
    
    @staticmethod
    def check_navigator() -> str:
        """
        s: 导航器/WebDriver检测结果
        对应 W(window) 函数
        """
        # btoa("5p9?en") 相关
        return base64.b64encode(b"5p9?en").decode() + \
               base64.b64encode(b"EoXvw").decode() + \
               "false"
    
    @staticmethod
    def check_useragent(ua: str) -> bool:
        """h: UA 中是否包含 'headless'"""
        return "headless" in ua.lower()
    
    @staticmethod
    def check_console() -> bool:
        """b: console 对象检测"""
        return False
    
    @staticmethod
    def get_devtools_state() -> dict:
        """d: DevTools 开启状态"""
        return {
            "isOpen": False,
            "orientation": None
        }
    
    def collect(self) -> dict:
        """收集完整指纹"""
        ua = USER_AGENT
        return {
            "p": self.check_automation(),
            "S": self.get_fixed_value(),
            "w": self.get_webgl_info(),
            "s": self.check_navigator(),
            "h": self.check_useragent(ua),
            "b": self.check_console(),
            "d": self.get_devtools_state()
        }


# ============================================================
# 4. 密码生成 (还原 c.js 中 k 和 a 的生成逻辑)
# ============================================================

class PasswordGenerator:
    """
    还原 c.js 中 k (来自t函数) 和 a (来自W函数) 的生成
    """
    
    @staticmethod
    def _rc4_decrypt(ciphertext_b64: str, key: str) -> str:
        """
        还原 c.js 中的 y() 函数 (RC4-like KSA/PRGA)
        用于解密混淆字符串
        """
        # Base64 解码
        decoded = base64.b64decode(ciphertext_b64).decode('latin-1')
        
        # KSA
        S = list(range(256))
        j = 0
        for i in range(256):
            j = (j + S[i] + ord(key[i % len(key)])) % 256
            S[i], S[j] = S[j], S[i]
        
        # PRGA + XOR
        result = []
        i = j = 0
        for char in decoded:
            i = (i + 1) % 256
            j = (j + S[i]) % 256
            S[i], S[j] = S[j], S[i]
            result.append(chr(ord(char) ^ S[(S[i] + S[j]) % 256]))
        
        return ''.join(result)
    
    @staticmethod
    def generate_k_fragment() -> str:
        """
        t() 函数末尾生成的 k 值
        基于 btoa("juvsu") 和一系列 String.fromCharCode 调用
        """
        # btoa("juvsu") = "anV2c3U="
        part1 = base64.b64encode(b"juvsu").decode()
        
        # 以下 fromCharCode 值从混淆代码的数学表达式计算
        # 示例: String.fromCharCode(0x1*0x9bf + -0xa*-0x36f + -0x2be0 - ...)
        # 实际需要执行JS才能获得精确值，以下是近似还原
        char_codes_k = [
            102, 51, 56, 100, 118,  # "f38dv" → juvsu相关
            55, 98, 106, 88, 105, 115  # "7bjXis" → yHLWo相关
        ]
        part2 = ''.join(chr(c) for c in char_codes_k)
        
        # btoa("7bjXis") 
        part3 = base64.b64encode(b"7bjXis").decode()
        
        return part1 + part2 + part3
    
    @staticmethod
    def generate_a_fragment() -> str:
        """
        W() 函数末尾生成的 a 值
        基于 btoa("5p9?en") 和 btoa("mgiimgtq7") 等
        """
        part1 = base64.b64encode(b"5p9?en").decode()
        
        char_codes_a = [
            109, 103, 105, 109, 103, 116, 113, 55  # "mgiimgtq7"
        ]
        part2 = ''.join(chr(c) for c in char_codes_a)
        
        part3 = base64.b64encode(b"EoXvw").decode()  # btoa("mgiimgtq7")
        
        return part1 + part2 + part3
    
    def get_password(self) -> str:
        """获取完整 PBKDF2 密码"""
        k = self.generate_k_fragment()
        a = self.generate_a_fragment()
        return k + a


# ============================================================
# 5. Kasada 请求处理
# ============================================================

class KasadaClient:
    """处理 Kasada bot-protection 的完整流程"""
    
    def __init__(self):
        self.session = httpx.Client(
            base_url=BASE_URL,
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            timeout=30.0
        )
        self.kp_uid = None
        self.kp_uid_ssn = None
        self.fp_gen = FingerprintCollector()
        self.pw_gen = PasswordGenerator()
    
    def get_fingerprint_page(self) -> str:
        """
        步骤1: GET /fp 获取挑战页面
        提取 KPSDK:MC:... 消息中的 challenge token
        """
        url = f"/{KASADA_UUID_1}/{KASADA_UUID_2}/fp"
        params = {"x-kpsdk-v": "j-1.2.308"}
        
        resp = self.session.get(url, params=params)
        resp.raise_for_status()
        
        # 提取 challenge token
        html = resp.text
        import re
        match = re.search(r"postMessage\('KPSDK:MC:([^']+)'", html)
        if match:
            challenge_token = match.group(1)
            print(f"[+] Challenge token: {challenge_token[:50]}...")
            return challenge_token
        
        raise ValueError("无法提取 challenge token")
    
    def build_tl_payload(self, challenge_token: str) -> bytes:
        """
        步骤2: 构造 /tl 的二进制请求体
        
        结构: 版本头 + 时间戳 + 挑战响应 + 加密指纹
        """
        # 收集指纹
        fingerprint = self.fp_gen.collect()
        
        # 获取加密密码
        password = self.pw_gen.get_password()
        
        # 加密指纹数据
        encrypted_fp = AESCBCEncryptor.encrypt(
            password=password,
            plaintext=json.dumps(fingerprint, separators=(',', ':'))
        )
        
        # 构造时间戳
        ts = int(time.time() * 1000)
        
        # 解析 challenge token 中的各字段
        # 格式: AALsWax...:XgpV...:Rgxn...:Wwtb...:VwtX...
        token_parts = challenge_token.split(':')
        
        # 构造二进制 payload
        # 注意: 实际格式是 Kasada 私有协议，以下为近似结构
        payload_json = {
            "st": ts,
            "d": encrypted_fp,
            "ct": challenge_token,
            "v": "j-1.2.308"
        }
        
        # Kasada 使用自定义二进制序列化，这里用 JSON 作为近似
        return json.dumps(payload_json).encode('utf-8')
    
    def submit_token(self, challenge_token: str) -> bool:
        """
        步骤3: POST /tl 提交令牌
        """
        url = f"/{KASADA_UUID_1}/{KASADA_UUID_2}/tl"
        payload = self.build_tl_payload(challenge_token)
        
        headers = {
            "Content-Type": "application/octet-stream",
            "Origin": BASE_URL,
            "Referer": f"{BASE_URL}/{KASADA_UUID_1}/{KASADA_UUID_2}/fp?x-kpsdk-v=j-1.2.308",
        }
        
        # 添加已有 Cookie
        if self.kp_uid:
            self.session.cookies.set("KP_UIDz", self.kp_uid)
        if self.kp_uid_ssn:
            self.session.cookies.set("KP_UIDz-ssn", self.kp_uid_ssn)
        
        resp = self.session.post(url, content=payload, headers=headers)
        
        # 提取新的 KP_UIDz Cookie
        if "KP_UIDz" in resp.cookies:
            self.kp_uid = resp.cookies["KP_UIDz"]
            print(f"[+] KP_UIDz: {self.kp_uid[:40]}...")
        if "KP_UIDz-ssn" in resp.cookies:
            self.kp_uid_ssn = resp.cookies["KP_UIDz-ssn"]
        
        result = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        
        if result.get("reload"):
            print("[+] Token accepted (reload=true)")
            return True
        
        print(f"[-] Token response: {resp.text[:100]}")
        return False
    
    def setup(self) -> bool:
        """完整的 Kasada 初始化流程"""
        try:
            challenge_token = self.get_fingerprint_page()
            return self.submit_token(challenge_token)
        except Exception as e:
            print(f"[-] Kasada setup failed: {e}")
            return False


# ============================================================
# 6. Cursor Chat API 调用
# ============================================================

class CursorChatClient:
    """调用 cursor.com/api/chat 接口"""
    
    def __init__(self, kasada_client: KasadaClient):
        self.kasada = kasada_client
        self.conversation_id = self._generate_id()
    
    @staticmethod
    def _generate_id(length: int = 16) -> str:
        """生成类似 'ZkU2LSyKjo9UIoTo' 的随机ID"""
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return ''.join(secrets.choice(chars) for _ in range(length))
    
    def build_chat_payload(
        self, 
        user_message: str,
        context_path: str = "/docs/api",
        turn_number: int = 1
    ) -> dict:
        """
        构造 /api/chat 请求体
        对应 #81 请求的 Body 结构
        """
        return {
            "context": [
                {
                    "type": "file",
                    "content": "",
                    "filePath": context_path
                }
            ],
            "id": self.conversation_id,
            "messages": [
                {
                    "parts": [
                        {
                            "type": "text",
                            "text": user_message
                        }
                    ],
                    "id": self._generate_id(),
                    "role": "user"
                }
            ],
            "trigger": "submit-message"
        }
    
    def chat(self, message: str, context_path: str = "/docs/api") -> str:
        """
        发送消息并接收 SSE 响应
        """
        payload = self.build_chat_payload(message, context_path)
        
        cookies = {
            "generaltranslation.locale-routing-enabled": "true",
            "generaltranslation.referrer-locale": "cn",
        }
        
        if self.kasada.kp_uid:
            cookies["KP_UIDz"] = self.kasada.kp_uid
        if self.kasada.kp_uid_ssn:
            cookies["KP_UIDz-ssn"] = self.kasada.kp_uid_ssn
        
        headers = {
            "Content-Type": "application/json",
            "Origin": BASE_URL,
            "Referer": f"{BASE_URL}/cn{context_path}",
            "User-Agent": USER_AGENT,
            "Accept": "text/event-stream",
        }
        
        full_text = []
        
        with httpx.Client(timeout=60.0) as client:
            with client.stream(
                "POST",
                f"{BASE_URL}/api/chat",
                json=payload,
                headers=headers,
                cookies=cookies
            ) as resp:
                resp.raise_for_status()
                
                # 解析 SSE 流
                for line in resp.iter_lines():
                    if not line.startswith("data: "):
                        continue
                    
                    data_str = line[6:]  # 去掉 "data: " 前缀
                    
                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    
                    event_type = data.get("type")
                    
                    if event_type == "text-delta":
                        delta = data.get("delta", "")
                        full_text.append(delta)
                        print(delta, end="", flush=True)
                    
                    elif event_type == "text-end":
                        print()  # 换行
                    
                    elif event_type == "end":
                        break
        
        return ''.join(full_text)
    
    def send_analytics_event(
        self, 
        message: str, 
        page: str,
        turn_number: int
    ):
        """
        发送 Vercel Analytics 事件 (对应 #82 请求)
        无加密，仅记录用户行为
        """
        payload = {
            "o": f"{BASE_URL}/cn{page}",
            "sv": "0.1.3",
            "sdkn": "@vercel/analytics/next",
            "sdkv": "1.6.1",
            "ts": int(time.time() * 1000),
            "dp": "/[lang]/docs/[...slug]",
            "r": "",
            "en": "Submit prompt",
            "ed": {
                "message": message,
                "page": page,
                "turnNumber": turn_number
            }
        }
        
        cookies = {}
        if self.kasada.kp_uid:
            cookies["KP_UIDz"] = self.kasada.kp_uid
        
        with httpx.Client() as client:
            resp = client.post(
                f"{BASE_URL}/_vercel/insights/event",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Origin": BASE_URL,
                    "Referer": f"{BASE_URL}/cn{page}",
                },
                cookies=cookies
            )
            return resp.text


# ============================================================
# 7. 加密验证测试
# ============================================================

def test_aes_encryption():
    """验证 AES-CBC 加密/解密的正确性"""
    print("\n=== AES-256-CBC 加密测试 ===")
    
    password = "test_password_from_js"
    plaintext = json.dumps({
        "p": False,
        "S": 0.4043074801008981,
        "w": {"v": "Google Inc.", "r": "ANGLE (NVIDIA)"},
        "s": "dGVzdA==",
        "h": False,
        "b": False,
        "d": {"isOpen": False, "orientation": None}
    })
    
    # 加密
    encrypted = AESCBCEncryptor.encrypt(password, plaintext)
    print(f"加密结果 (Base64): {encrypted[:60]}...")
    print(f"总长度: {len(base64.b64decode(encrypted))} bytes")
    print(f"  - salt: 16 bytes [0:16]")
    print(f"  - iv:   16 bytes [16:32]")
    print(f"  - data: {len(base64.b64decode(encrypted)) - 32} bytes [32:]")
    
    # 解密验证
    decrypted = AESCBCEncryptor.decrypt(password, encrypted)
    assert json.loads(decrypted) == json.loads(plaintext), "解密验证失败!"
    print(f"[✓] 解密验证通过")
    
    return encrypted


def test_password_generation():
    """测试密码生成器"""
    print("\n=== 密码生成测试 ===")
    pw_gen = PasswordGenerator()
    password = pw_gen.get_password()
    print(f"生成的密码: {password[:40]}...")
    print(f"密码长度: {len(password)} chars")
    return password


def test_fingerprint_collection():
    """测试指纹采集"""
    print("\n=== 指纹采集测试 ===")
    collector = FingerprintCollector()
    fp = collector.collect()
    print(f"指纹数据:")
    for k, v in fp.items():
        print(f"  {k}: {v}")
    return fp


# ============================================================
# 8. 主程序入口
# ============================================================

def main():
    print("=" * 60)
    print("Cursor.com 加密机制复现 - 仅用于研究目的")
    print("=" * 60)
    
    # 运行单元测试
    test_aes_encryption()
    test_password_generation()
    test_fingerprint_collection()
    
    # 初始化 Kasada 客户端
    print("\n=== Kasada 初始化流程 ===")
    kasada = KasadaClient()
    
    # 注意: 实际 Kasada 需要完整的浏览器环境执行 JS
    # 这里展示流程，实际 /tl 请求体格式是私有协议
    print("[!] 注意: 完整绕过需要执行 c.js 中的 PoW 计算")
    print("[!] 建议使用 Playwright/Puppeteer 执行真实 JS")
    
    # 模拟已有 Cookie 的情况
    # 实际使用时替换为真实从浏览器获取的 Cookie
    kasada.kp_uid = "your_kp_uid_cookie_here"
    
    # 初始化 Chat 客户端
    chat_client = CursorChatClient(kasada)
    
    print("\n=== Chat API 调用演示 ===")
    print("发送消息: 'hi'")
    print("响应: ", end="")
    
    # 注意: 需要有效的 KP_UIDz Cookie 才能成功调用
    # response = chat_client.chat("hi", "/docs/api")
    # print(f"\n完整响应: {response}")
    
    print("\n[i] 请先通过浏览器获取有效的 KP_UIDz Cookie")
    print("[i] 然后替换 kasada.kp_uid 的值再运行")


if __name__ == "__main__":
    main()
```

---

## 七、关键发现总结

### 7.1 安全机制分层

```
层级 1 (最外层): Kasada Bot Protection
  ├─ 采集 JavaScript 指纹 (12+项检测)
  ├─ AES-256-CBC 加密指纹 + PBKDF2 密钥派生
  ├─ 二进制 PoW 令牌提交
  └─ 颁发 KP_UIDz Cookie

层级 2: 业务接口鉴权
  └─ 依赖 KP_UIDz Cookie (无独立签名)

层级 3: 行为追踪
  └─ Vercel Analytics (明文，无加密)
```

### 7.2 弱点分析

| 风险点 | 描述 | 风险级别 |
|--------|------|----------|
| 密钥半硬编码 | PBKDF2 密码嵌入 JS，仅靠混淆保护 | 中 |
| Cookie 无绑定 | KP_UIDz 无 IP/UA 强绑定 | 中 |
| 无请求签名 | /api/chat 请求体未签名 | 低 |
| 明文分析事件 | Analytics 事件可被篡改 | 低 |

> ⚠️ **免责声明**: 本分析仅用于安全研究和学习目的，请勿用于任何违反服务条款的行为。