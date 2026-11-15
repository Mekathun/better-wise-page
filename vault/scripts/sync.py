#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync.py — 把 PROGRESS.md 与 docs/ 喂进 Obsidian 记忆库（生成层）。

只重写「生成层」：
  300-轮次记录/YYYY-MM/NNN-*.md     每轮一篇
  300-轮次记录/00-轮次索引.md        按真实时间排序的总表
  000-入口/L0-钉住上下文.md          PROGRESS 头部常驻章节的镜像
  600-素材与样本/原文/*.md           docs/ 原始文档副本（加 frontmatter）
  700-归档/PROGRESS.md               原文副本（行号可对照，不加 frontmatter）
  700-归档/00-原文索引.md

手写层（00-首页、100-*、200-*、400-*、500-*）一个字都不碰。

用法：
  python vault/scripts/sync.py            # 重建生成层
  python vault/scripts/sync.py --dry-run  # 只说会写什么
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

VAULT = Path(__file__).resolve().parent.parent
ROOT = VAULT.parent
PROGRESS = ROOT / "PROGRESS.md"
DOCS = ROOT / "docs"

ROUNDS = VAULT / "300-轮次记录"
ENTRY = VAULT / "000-入口"
MATERIAL = VAULT / "600-素材与样本"
ARCHIVE = VAULT / "700-归档"

STATUS_TITLES = ("Goal", "Done", "Next", "Open questions", "Key facts", "分发")

# 生成文件的统一标记：check.py 靠它判断「可重建 / 禁手改」
GEN = "<!-- generated: sync.py — 手改会被覆盖，要改去改 PROGRESS.md 或 100-/200-/400-/500- 里的手写笔记 -->"

ILLEGAL = re.compile(r'[\\/:*?"<>|#^\[\]]')


# ---------------------------------------------------------------- 基础工具
def est_tokens(text: str) -> int:
    """粗估 token：CJK 一字 ≈ 1 token，ASCII 词 ≈ 1 token，其余字符 /4。"""
    cjk = len(re.findall(r"[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]", text))
    ascii_words = len(re.findall(r"[A-Za-z0-9_\-./]+", text))
    rest = max(0, len(text) - cjk - sum(len(w) for w in re.findall(r"[A-Za-z0-9_\-./]+", text)))
    return cjk + ascii_words + rest // 4


def slug(title: str, limit: int = 44) -> str:
    s = re.sub(r"[（(][^）)]*(?:beta\d+|20\d\d-\d\d-\d\d)[^）)]*[）)]", "", title)  # 去掉时间戳括号
    s = re.sub(r"\s+", " ", s).strip()
    s = ILLEGAL.sub("-", s)
    s = re.sub(r"-{2,}", "-", s).strip("- ")
    s = re.sub(r"\s+", "", s)
    return s[:limit] or "untitled"


def first_sentence(body: str, limit: int = 46) -> str:
    """抓一句能代表这轮的话，给索引表摘要列和前 frontmatter 的 summary 用。

    跳过「用户报的四个问题：」这类引出句，落到第一条有信息量的行上。
    """
    META = re.compile(r"^(用户|User|原文|会话|本轮|这轮|背景|反馈|问题清单)")
    out: list[str] = []
    for raw in body.split("\n"):
        ln = raw.strip()
        if not ln or ln.startswith(("#", "|", ">", "```", "---", "…", "<!--")):
            continue
        ln = re.sub(r"^[-*+]\s+|^\d+[.)]\s+", "", ln)
        ln = re.sub(r"~~([^~]*)~~", r"\1", ln)
        ln = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", ln)
        ln = re.sub(r"[`*_]", "", ln)
        ln = re.sub(r"\s+", " ", ln).strip()
        if len(ln) < 10 or ln.endswith(("：", ":")) or META.match(ln):
            continue
        out.append(ln)
    if not out:
        return ""
    s2 = out[0]
    for sep in ("——", "：", ":"):
        i = s2.find(sep)
        if 6 < i:
            s2 = s2[:i]
            break
    s2 = s2.strip("，。；、 ")
    return s2[:limit] + ("…" if len(s2) > limit else "")


def write(path: Path, text: str, dry: bool) -> None:
    if dry:
        print(f"  would write {path.relative_to(VAULT)}  ({len(text)}B, ~{est_tokens(text)} tok)")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def frontmatter(data: dict) -> str:
    lines = ["---"]
    for k, v in data.items():
        if v is None or v == "":
            continue
        lines.append(f"{k}: {v}")
    lines.append("---")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- 切分
@dataclass
class Section:
    title: str
    start: int  # 1-based，含 `## ` 那一行
    end: int  # 1-based，含最后一行
    body: str
    kind: str = "round"
    date: str = ""
    version: str = ""
    order: int = 0
    seq: int = 0
    path: Path | None = None
    summary: str = ""
    extra: dict = field(default_factory=dict)

    @property
    def lines(self) -> str:
        return f"{self.start}-{self.end}"

    @property
    def tokens(self) -> int:
        return est_tokens(self.body)


def split_h2(lines: list[str]) -> list[Section]:
    marks = [i for i, l in enumerate(lines) if l.startswith("## ")]
    out: list[Section] = []
    for n, i in enumerate(marks):
        j = marks[n + 1] if n + 1 < len(marks) else len(lines)
        body = "\n".join(lines[i + 1 : j]).strip("\n")
        out.append(
            Section(
                title=lines[i][3:].strip(),
                start=i + 1,
                end=j,  # 下一节标题前一行
                body=body,
                order=n,
            )
        )
    return out


DATE_RE = re.compile(r"(20\d\d-\d\d-\d\d)")
BETA_RE = re.compile(r"beta\s*(\d+)", re.I)
VER_RE = re.compile(r"0\.1\.\d+(?:\.\d+)?")
WHEEL_RE = re.compile(r"^第[一二三四五六七八九十百零〇\d]+轮")


def classify(sections: list[Section]) -> None:
    last_date = ""
    for s in sections:
        if any(s.title.startswith(t) for t in STATUS_TITLES):
            s.kind = "status"
            continue
        m = DATE_RE.search(s.title)
        if m:
            last_date = m.group(1)
        elif DATE_RE.search(s.body[:400]):
            last_date = DATE_RE.search(s.body[:400]).group(1)
        s.date = last_date

        b = BETA_RE.search(s.title)
        v = VER_RE.search(s.title)
        s.version = f"beta{int(b.group(1))}" if b else (v.group(0) if v else "")

        if WHEEL_RE.search(s.title) or b or v:
            s.kind = "round"
        elif re.search(r"发布|收尾|验证|待办|未收口|补", s.title):
            s.kind = "note"
        else:
            s.kind = "note"


# ---------------------------------------------------------------- 轮次笔记
def render_round(s: Section, prev: Section | None, nxt: Section | None) -> str:
    anchor = s.title
    fm = frontmatter(
        {
            "type": "round" if s.kind == "round" else "note",
            "source": "700-归档/PROGRESS.md",
            "lines": s.lines,
            "date": s.date or "unknown",
            "version": s.version,
            "tokens": s.tokens,
            "seq": f"{s.seq:03d}",
            "summary": s.summary.replace(":", "：") if s.summary else "",
        }
    )
    out = [GEN, fm, f"# {s.title}", ""]
    if s.date:
        meta = [f"日期 {s.date}"]
        if s.version:
            meta.append(f"版本 {s.version}")
        meta.append(f"原文 {s.lines} 行")
        meta.append(f"约 {s.tokens} tok")
        out.append("`" + " · ".join(meta) + "`")
        out.append("")
    if s.tokens > 12000:
        out.append("> [!warning] 这一轮很长，别整读。先看下面这张表，再跳到需要的小节。")
        out.append("")
        for m in re.finditer(r"^### (.+)$", s.body, re.M):
            out.append(f"- {m.group(1)}")
        out.append("")
    out.append(s.body)
    out.append("")
    nav = [f"原文：[[700-归档/PROGRESS#{anchor}|PROGRESS L{s.lines}]]"]
    if prev:
        nav.append(f"上一轮：[[{prev.path.as_posix() if prev.path else ''}|{prev.seq:03d}]]")
    if nxt:
        nav.append(f"下一轮：[[{nxt.path.as_posix() if nxt.path else ''}|{nxt.seq:03d}]]")
    nav.append("索引：[[300-轮次记录/00-轮次索引|轮次索引]]")
    out.append("---")
    out.append(" · ".join(nav))
    out.append("")
    return "\n".join(out)


def render_round_index(groups: dict[str, list[Section]]) -> str:
    total = sum(len(v) for v in groups.values())
    out = [
        GEN,
        frontmatter({"type": "index", "source": "700-归档/PROGRESS.md", "date": datetime.now().strftime("%Y-%m-%d")}),
        "# 轮次索引",
        "",
        f"共 {total} 篇，按**日期**排序（不是 PROGRESS.md 里的书写顺序 —— 原文 23–26 轮排在 27–28 轮后面，这里已还原）。",
        "",
        "读法：先看这张表挑一轮，再点进去。别看完全部。",
        "",
    ]
    for ym in sorted(groups):
        rows = groups[ym]
        out.append(f"## {ym}（{len(rows)} 篇）")
        out.append("")
        out.append("| # | 日期 | 标题 | 一句话 | 版本 | ~tok | 原文行 |")
        out.append("|---|---|---|---|---|---|---|")
        for s in rows:
            name = s.path.stem if s.path else f"{s.seq:03d}"
            link = f"[[{s.path.as_posix()}|{name}]]" if s.path else name
            out.append(
                f"| {s.seq:03d} | {s.date or '—'} | {link} | {s.summary or '—'} | {s.version or '—'} | {s.tokens} | {s.lines} |"
            )
        out.append("")
    out.append("上级：[[000-入口/00-首页|首页]] · 相关：[[000-入口/L0-钉住上下文|L0 钉住上下文]]")
    out.append("")
    return "\n".join(out)


# ---------------------------------------------------------------- L0
L0_ORDER = ["Goal", "Next", "Open questions", "Key facts", "Done", "分发"]
L0_CAP = {"Done": 12, "Key facts": 40}


def live_facts() -> list[str]:
    """从真实文件读当前版本与产物，免得 L0 里的镜像数字过期。"""
    rows = []
    mf = ROOT / "extension" / "manifest.json"
    if mf.is_file():
        try:
            m = json.loads(mf.read_text(encoding="utf-8"))
            rows.append(("版本", f"`{m.get('version', '?')}`（`extension/manifest.json`）"))
        except Exception:
            pass
    crx = sorted(ROOT.glob("Better_WiSE_v*.crx"), key=lambda p: p.stat().st_mtime)
    if crx:
        last = crx[-1]
        rows.append(("最新产物", f"`{last.name}` {last.stat().st_size:,} B，"
                    + datetime.fromtimestamp(last.stat().st_mtime).strftime("%Y-%m-%d %H:%M")))
    rounds = sorted((VAULT / "300-轮次记录").rglob("[0-9][0-9][0-9]-*.md"))
    if rounds:
        rows.append(("轮次笔记", f"{len(rounds)} 篇，见 [[300-轮次记录/00-轮次索引|轮次索引]]"))
    return [f"| {k} | {v} |" for k, v in rows]


def render_l0(status: dict[str, Section]) -> str:
    out = [
        GEN,
        frontmatter({"type": "context", "source": "700-归档/PROGRESS.md", "date": datetime.now().strftime("%Y-%m-%d")}),
        "# L0 钉住上下文",
        "",
        "每次开工前读这一个文件就够了。上面是自动读出来的现状，下面是 PROGRESS.md 头部六节的镜像 —— 镜像是旧的，以现状为准。",
        "",
        "## 现在的事实（自动读）",
        "",
        "| 项 | 值 |",
        "|---|---|",
        *live_facts(),
        "",
    ]
    for title in L0_ORDER:
        s = status.get(title)
        if not s:
            continue
        body = s.body.strip()
        lines = body.split("\n")
        cap = L0_CAP.get(title)
        if cap and len(lines) > cap:
            body = "\n".join(lines[:cap]) + f"\n\n…（还有 {len(lines)-cap} 行，见 [[700-归档/PROGRESS#{s.title}|原文 L{s.lines}]]）"
        out.append(f"## {title}")
        out.append("")
        out.append(body)
        out.append("")
    out.append("---")
    out.append("上级：[[000-入口/00-首页|首页]] · 全库地图：[[000-入口/L1-总览地图|L1 总览地图]] · 最近几轮：[[300-轮次记录/00-轮次索引|轮次索引]]")
    out.append("")
    return "\n".join(out)


# ---------------------------------------------------------------- 素材
def copy_docs(dry: bool) -> list[tuple[str, str, int]]:
    rows: list[tuple[str, str, int]] = []
    if not DOCS.is_dir():
        return rows
    for src in sorted([*DOCS.rglob("*.md"), *DOCS.rglob("*.txt")]):
        rel = src.relative_to(DOCS).as_posix()
        dst = MATERIAL / "原文" / rel
        text = src.read_text(encoding="utf-8", errors="replace")
        body = text.strip("\n")
        tok = est_tokens(body)
        fm = frontmatter(
            {
                "type": "source-doc",
                "source": f"docs/{rel}",
                "bytes": src.stat().st_size,
                "tokens": tok,
                "date": datetime.fromtimestamp(src.stat().st_mtime).strftime("%Y-%m-%d"),
            }
        )
        out = f"{GEN}\n{fm}\n# {src.stem}\n\n> 原件：`D:\\DSH\\Better_WiSE\\docs\\{rel.replace('/', chr(92))}`\n\n{body}\n\n---\n上级：[[600-素材与样本/00-原文索引|原文索引]]\n"
        write(dst, out, dry)
        rows.append((rel, tok, src.stat().st_size))
    return rows


def render_doc_index(rows: list[tuple[str, int, int]]) -> str:
    out = [
        GEN,
        frontmatter({"type": "index", "date": datetime.now().strftime("%Y-%m-%d")}),
        "# 原文索引（docs/ 并入）",
        "",
        f"`docs/` 下 {len(rows)} 份 markdown 已全文并入本库，原件仍在 `D:\\DSH\\Better_WiSE\\docs\\`。",
        "这里存的是原文，读之前先看提炼卡：[[100-项目/04-与校方沟通线|与校方沟通线]]、[[100-项目/00-扩展总览|扩展总览]]。",
        "",
        "| 文件 | 字节 | ~tok |",
        "|---|---|---|",
    ]
    for rel, tok, size in rows:
        out.append(f"| [[600-素材与样本/原文/{rel}\\|{rel}]] | {size:,} | {tok:,} |")
    out.append("")
    # 没并进来的（html 等）
    skipped = [
        src.relative_to(DOCS).as_posix()
        for src in sorted(DOCS.rglob("*"))
        if src.is_file() and src.suffix.lower() not in {".md", ".txt"}
    ]
    if skipped:
        out.append("## 没并进来的")
        out.append("")
        out.append("网页文件不值得转成 markdown，原件留在原处，要看直接开：")
        out.append("")
        for rel in skipped:
            out.append(f"- `docs/{rel}`")
        out.append("")
    out.append("上级：[[000-入口/00-首页|首页]]")
    out.append("")
    return "\n".join(out)


# ---------------------------------------------------------------- 主流程
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    dry = args.dry_run

    if not PROGRESS.exists():
        print(f"找不到 {PROGRESS}", file=sys.stderr)
        return 1

    raw = PROGRESS.read_text(encoding="utf-8")
    lines = raw.split("\n")
    sections = split_h2(lines)
    classify(sections)

    # 键用前缀（原文标题后面常带括号说明），L0 按前缀取
    status: dict[str, Section] = {}
    for s in sections:
        if s.kind != "status":
            continue
        for t in STATUS_TITLES:
            if s.title.startswith(t):
                status[t] = s
                break
    body_sections = [s for s in sections if s.kind != "status"]

    # 归档原文（不加 frontmatter，行号才和 PROGRESS.md 对得上）
    write(ARCHIVE / "PROGRESS.md", raw if raw.endswith("\n") else raw + "\n", dry)

    # 按日期 + 原始行序排序，再编号
    body_sections.sort(key=lambda s: (s.date or "9999", s.order))
    for i, s in enumerate(body_sections, 1):
        s.seq = i
        s.summary = first_sentence(s.body)
        ym = (s.date or "0000-00")[:7]
        s.path = Path("300-轮次记录") / ym / f"{i:03d}-{slug(s.title)}.md"

    # 清掉自己生成过的旧轮次（只删带 GEN 标记的）
    if not dry and ROUNDS.exists():
        for old in ROUNDS.rglob("*.md"):
            try:
                if old.read_text(encoding="utf-8", errors="replace").startswith(GEN):
                    old.unlink()
            except OSError:
                pass

    groups: dict[str, list[Section]] = {}
    for i, s in enumerate(body_sections):
        prev = body_sections[i - 1] if i > 0 else None
        nxt = body_sections[i + 1] if i + 1 < len(body_sections) else None
        groups.setdefault((s.date or "0000-00")[:7], []).append(s)
        write(VAULT / s.path, render_round(s, prev, nxt), dry)

    write(ROUNDS / "00-轮次索引.md", render_round_index(groups), dry)
    write(ENTRY / "L0-钉住上下文.md", render_l0(status), dry)

    rows = copy_docs(dry)
    write(MATERIAL / "00-原文索引.md", render_doc_index(rows), dry)

    print(f"{'[dry] ' if dry else ''}轮次 {len(body_sections)} 篇 · 状态节 {len(status)} 个 · docs {len(rows)} 份")
    for ym in sorted(groups):
        print(f"  {ym}: {len(groups[ym])} 篇  ({groups[ym][0].seq:03d}–{groups[ym][-1].seq:03d})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
