#!/usr/bin/env python3
"""Fail closed when a public artifact contains unresolved editorial markers."""
from __future__ import annotations

import argparse
import csv
import io
import json
import pathlib
import re
import sys
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser


RULES = (
    ("editorial-zopa-question", re.compile(r"\bwhat\s+does\s+zopa\s+stand\s+for\b\s*\??", re.I)),
    ("editorial-directive", re.compile(r"\b(?:todo|fixme)\s*:", re.I)),
    ("editorial-bracketed-marker", re.compile(r"\[\s*(?:todo|fixme|tbd)(?:\s*:[^\]\r\n]*)?\s*\]", re.I)),
)
TEXT_SUFFIXES = {".html", ".htm", ".json", ".md", ".markdown", ".txt", ".csv"}
READABLE_ATTRIBUTES = {"alt", "aria-label", "title", "placeholder"}
BLOCK_TAGS = {"address", "article", "aside", "blockquote", "br", "dd", "details", "div", "dl",
              "dt", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3",
              "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre",
              "section", "summary", "table", "td", "th", "tr", "ul"}


class ScanError(RuntimeError):
    pass


@dataclass(frozen=True, order=True)
class Finding:
    location: str
    rule_id: str


def _normalize(value: str) -> str:
    return " ".join(value.replace("\N{NO-BREAK SPACE}", " ").split())


def _find(value: str, location: str) -> list[Finding]:
    normalized = _normalize(value)
    matches = [Finding(location, rule_id) for rule_id, pattern in RULES if pattern.search(normalized)]
    if any(item.rule_id == "editorial-bracketed-marker" for item in matches):
        matches = [item for item in matches if item.rule_id != "editorial-directive"]
    return matches


class _HTMLText(HTMLParser):
    def __init__(self, location: str):
        super().__init__(convert_charrefs=True)
        self.location = location
        self.hidden = 0
        self.parts: list[tuple[int, str]] = []
        self.blocks: list[tuple[int, str]] = []

    def _flush(self):
        if self.parts:
            self.blocks.append((self.parts[0][0], " ".join(part for _, part in self.parts)))
            self.parts.clear()

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in {"script", "style"}:
            self.hidden += 1
        if tag in BLOCK_TAGS:
            self._flush()
        if not self.hidden:
            for name, value in attrs:
                if name.lower() in READABLE_ATTRIBUTES and value is not None:
                    self.blocks.append((self.getpos()[0], value))

    def handle_endtag(self, tag):
        if tag.lower() in BLOCK_TAGS:
            self._flush()
        if tag.lower() in {"script", "style"} and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden and data.strip():
            self.parts.append((self.getpos()[0], data))

    def close(self):
        super().close()
        self._flush()


def _json_values(value, path="$", line=1):
    if isinstance(value, str):
        yield path, line, value
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from _json_values(item, f"{path}[{index}]", line)
    elif isinstance(value, dict):
        for key, item in value.items():
            escaped = json.dumps(str(key), ensure_ascii=False)
            yield from _json_values(item, f"{path}[{escaped}]", line)


def _scan_bytes(data: bytes, suffix: str, location: str) -> list[Finding]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ScanError(f"unreadable scoped file: {location}") from exc
    findings: list[Finding] = []
    if suffix in {".html", ".htm"}:
        parser = _HTMLText(location)
        try:
            parser.feed(text)
            parser.close()
        except Exception as exc:
            raise ScanError(f"malformed HTML: {location}") from exc
        for line, value in parser.blocks:
            findings.extend(_find(value, f"{location}:{line}"))
    elif suffix == ".json":
        try:
            value = json.loads(text)
        except (ValueError, RecursionError) as exc:
            raise ScanError(f"malformed JSON: {location}") from exc
        for json_path, line, item in _json_values(value):
            findings.extend(_find(item, f"{location}:{line}:{json_path}"))
    elif suffix == ".csv":
        try:
            for row_number, row in enumerate(csv.reader(io.StringIO(text), strict=True), 1):
                for column, item in enumerate(row, 1):
                    findings.extend(_find(item, f"{location}:{row_number}:{column}"))
        except csv.Error as exc:
            raise ScanError(f"malformed CSV: {location}") from exc
    else:
        # A marker may be wrapped across adjacent source lines, but unrelated
        # paragraphs remain independent content boundaries.
        line_number = 1
        for block in re.split(r"(?:\r?\n){2,}", text):
            findings.extend(_find(block, f"{location}:{line_number}"))
            line_number += block.count("\n") + 2
    return findings


def scan_artifact(root: pathlib.Path | str) -> list[Finding]:
    root = pathlib.Path(root)
    if not root.is_dir() or root.is_symlink():
        raise ScanError("artifact root is missing or untrusted")
    findings: list[Finding] = []
    scoped = 0
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        if path.is_symlink():
            raise ScanError(f"symlinked scan input: {relative}")
        if not path.is_file():
            continue
        suffix = path.suffix.lower()
        if suffix in TEXT_SUFFIXES:
            scoped += 1
            try:
                findings.extend(_scan_bytes(path.read_bytes(), suffix, relative))
            except OSError as exc:
                raise ScanError(f"unreadable scoped file: {relative}") from exc
        elif suffix == ".zip":
            scoped += 1
            try:
                with zipfile.ZipFile(path) as archive:
                    for info in sorted(archive.infolist(), key=lambda item: item.filename):
                        member = pathlib.PurePosixPath(info.filename)
                        if info.is_dir() or member.is_absolute() or ".." in member.parts:
                            if not info.is_dir():
                                raise ScanError(f"untrusted ZIP member: {relative}!{info.filename}")
                            continue
                        member_suffix = member.suffix.lower()
                        if member_suffix in TEXT_SUFFIXES:
                            findings.extend(_scan_bytes(archive.read(info), member_suffix,
                                                       f"{relative}!{info.filename}"))
            except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
                raise ScanError(f"unreadable ZIP: {relative}") from exc
    if not scoped:
        raise ScanError("artifact root contains no supported publication files")
    return sorted(set(findings))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact_root", type=pathlib.Path)
    args = parser.parse_args(argv)
    try:
        findings = scan_artifact(args.artifact_root)
    except ScanError as exc:
        print(f"editorial-placeholder-scan-error: {exc}", file=sys.stderr)
        return 2
    for finding in findings:
        print(f"{finding.rule_id}: {finding.location}", file=sys.stderr)
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
