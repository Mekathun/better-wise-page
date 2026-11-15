#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check.py — 知识库体检。查四件事，外加两条本库特有的规矩。

  1. wikilink 断链        （[[...]] 指向不存在的文件）
  2. 缺 frontmatter        （没有 type/source，AI 没法按属性筛）
  3. 孤儿笔记              （没有任何入链，等于没有入口）
  4. 体积超预算            （L0 ≤ 3000 tok，首页 ≤ 1500，专题软上限 9000）
  5. 生成层被手改          （带 generated 标记的文件里出现「手写区」标记 → 下次 sync 会吞掉）
  6. 生成层里存了敏感串    （密码 / token / cookie 不该进库）

用法：
  python vault/scripts/check.py           # 全量报告
  python vault/scripts/check.py --quiet   # 只报问题，没问题是 exit 0
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

VAULT = Path(__file__).resolve().parent.parent
GEN_MARK = "<!-- generated: sync.py"

BUDGET = {
    "000-入口/L0-钉住上下文.md": 3000,
    "000-入口/00-首页.md": 1500,
    "000-入口/L1-总览地图.md": 2600,
    "000-入口/怎么用这个库.md": 1500,
}
TOPIC_CAP = 9000

# 只抓「真的带值」的，光提到 BDUSS 这个词不算
SECRET = re.compile(
    r"(jixiekesuen1|"
    r"BDUSS\s*[=:]\s*[A-Za-z0-9+/=_-]{10,}|"
    r"SESSDATA\s*[=:]\s*\S{10,}|"
    r"(?:access[_-]?token|api[_-]?key|password|passwd)\s*[=:]\s*[A-Za-z0-9_\-.]{12,}|"
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----)",
    re.I,
)

# 原文副本天生就是大的，不参与预算
NO_BUDGET = {"700-归档/PROGRESS.md"}


def est_tokens(text: str) -> int:
    cjk = len(re.findall(r"[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]", text))
    words = re.findall(r"[A-Za-z0-9_\-./]+", text)
    return cjk + len(words) + max(0, len(text) - cjk - sum(len(w) for w in words)) // 4


def notes() -> list[Path]:
    return sorted(p for p in VAULT.rglob("*.md") if ".obsidian" not in p.parts)


LINK = re.compile(r"\[\[([^\]\|#]+)(?:#[^\]\|]*)?(?:\|[^\]]*)?\]\]")


FENCE = re.compile(r"```.*?```", re.S)
LEAD_COMMENT = re.compile(r"^\s*<!--.*?-->\s*", re.S)


def prose(text: str) -> str:
    """围栏代码块里的 [[...]] 是示例，不参与断链检查。"""
    return FENCE.sub("", text)


def body_start(text: str) -> str:
    """跳过开头的生成标记注释，返回 frontmatter 起点之后的内容。"""
    return LEAD_COMMENT.sub("", text, count=1)


def link_targets(text: str) -> list[str]:
    return [m.group(1).strip() for m in LINK.finditer(prose(text))]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    files = notes()
    rel = {p.relative_to(VAULT).as_posix(): p for p in files}
    stem = {}
    for r in rel:
        stem.setdefault(Path(r).stem, []).append(r)

    inbound: dict[str, int] = {r: 0 for r in rel}
    problems: dict[str, list[str]] = {k: [] for k in ("断链", "缺属性", "孤儿", "超预算", "生成层被动", "敏感串")}
    tokens_total = 0

    for r, p in rel.items():
        text = p.read_text(encoding="utf-8", errors="replace")
        tok = est_tokens(text)
        tokens_total += tok
        generated = text.startswith(GEN_MARK)

        # 1. 断链
        for t in link_targets(text):
            cand = t if t.endswith(".md") else t + ".md"
            cand = cand.lstrip("/")
            if cand in rel or t in rel:
                inbound[cand if cand in rel else t] += 1
            elif len(stem.get(Path(t).stem, [])) == 1:
                inbound[stem[Path(t).stem][0]] += 1  # Obsidian 能按文件名唯一解析
            else:
                problems["断链"].append(f"{r} → [[{t}]]")

        # 2. frontmatter（700-归档/PROGRESS.md 是原文副本，故意不加）
        if r != "700-归档/PROGRESS.md":
            head = body_start(text)
            if not head.startswith("---"):
                problems["缺属性"].append(f"{r}（没有 frontmatter）")
            elif "type:" not in head.split("---")[1]:
                problems["缺属性"].append(f"{r}（frontmatter 没有 type）")

        # 4. 体积
        cap = BUDGET.get(r, TOPIC_CAP)
        if r in NO_BUDGET:
            cap = 10**9
        if tok > cap:
            problems["超预算"].append(f"{r}：{tok} tok > {cap}")

        # 5. 生成层被动：generated 文件里出现手写标记
        if generated and re.search(r"<!--\s*手写", text):
            problems["生成层被动"].append(f"{r}（把结论写进生成层了，改去手写层）")

        # 6. 敏感串
        m = SECRET.search(text)
        if m:
            problems["敏感串"].append(f"{r}：命中 {m.group(1)[:12]}…")

    # 3. 孤儿（索引类文件和模板不算孤儿）
    for r in rel:
        if inbound.get(r, 0):
            continue
        if r.startswith(("900-", "300-轮次记录/2026", "600-素材与样本/原文/")) or "/00-" in r or r.startswith("000-入口/00-"):
            continue
        problems["孤儿"].append(f"{r}（没有入链）")

    total_problems = sum(len(v) for v in problems.values())
    if not args.quiet:
        print(f"库内 {len(rel)} 篇 · 约 {tokens_total:,} tok（含生成层原文，实际阅读量远小于此）")
        print(f"生成层 {sum(1 for p in rel.values() if p.read_text(encoding='utf-8', errors='replace').startswith(GEN_MARK))} 篇 / 手写层 {len(rel) - sum(1 for p in rel.values() if p.read_text(encoding='utf-8', errors='replace').startswith(GEN_MARK))} 篇")
        print()

    if total_problems == 0:
        print("体检通过：断链 0、缺属性 0、孤儿 0、超预算 0。")
        return 0

    for kind, items in problems.items():
        if not items:
            continue
        print(f"## {kind}（{len(items)}）")
        for it in items[:40]:
            print(f"  - {it}")
        if len(items) > 40:
            print(f"  … 还有 {len(items) - 40} 条")
        print()
    print(f"共 {total_problems} 条问题。")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
