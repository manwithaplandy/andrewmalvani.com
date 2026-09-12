#!/usr/bin/env python3
"""Generate the one-page public resume PDF from docs/content/resume-source.md."""

from __future__ import annotations

import argparse
import html
import os
import re
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "docs/content/resume-source.md"
DEFAULT_OUTPUT = ROOT / "public/assets/resume.pdf"
BLUE = colors.HexColor("#2563EB")
DARK = colors.HexColor("#171717")
MUTED = colors.HexColor("#525252")


def section(lines: list[str], name: str) -> list[str]:
    marker = f"## {name}"
    start = lines.index(marker) + 1
    end = next((i for i in range(start, len(lines)) if lines[i].startswith("## ")), len(lines))
    return [line for line in lines[start:end] if line and not line.startswith("<!--") and line != "-->"]


def inline_links(value: str) -> str:
    parts: list[str] = []
    cursor = 0
    for match in re.finditer(r"\[([^]]+)]\(([^)]+)\)", value):
        parts.append(html.escape(value[cursor : match.start()]))
        label, url = match.groups()
        parts.append(f'<link href="{html.escape(url, quote=True)}" color="#2563EB"><u>{html.escape(label)}</u></link>')
        cursor = match.end()
    parts.append(html.escape(value[cursor:]))
    return "".join(parts)


def parse_roles(lines: list[str]) -> list[tuple[str, str, str, list[str]]]:
    roles: list[tuple[str, str, str, list[str]]] = []
    index = 0
    while index < len(lines):
        if not lines[index].startswith("### "):
            index += 1
            continue
        title_company = lines[index][4:]
        title, company = [part.strip() for part in title_company.split(" | ", 1)]
        index += 1
        details = lines[index]
        index += 1
        bullets: list[str] = []
        while index < len(lines) and not lines[index].startswith("### "):
            if lines[index].startswith("- "):
                bullets.append(lines[index][2:])
            index += 1
        roles.append((title, company, details, bullets))
    return roles


def bullet_list(items: list[str], style: ParagraphStyle, left_indent: float = 9) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(html.escape(item), style), bulletText="-", leftIndent=left_indent) for item in items],
        bulletChar="-",
        bulletColor=DARK,
        bulletFontName="Helvetica",
        bulletFontSize=5,
        bulletType="bullet",
        leftIndent=left_indent,
        spaceAfter=0,
        spaceBefore=0,
    )


def build(source_path: Path, output_path: Path) -> None:
    raw_lines = [line.strip() for line in source_path.read_text(encoding="utf-8").splitlines()]
    visible = [line for line in raw_lines if line and not line.startswith("<!--") and line != "-->"]
    name = next(line[2:] for line in visible if line.startswith("# "))
    name_index = raw_lines.index(f"# {name}")
    contact = next(line for line in raw_lines[name_index + 1 :] if line and not line.startswith("<!--"))
    summary = " ".join(section(raw_lines, "Summary"))
    roles = parse_roles(section(raw_lines, "Experience"))
    skills = [line[2:] for line in section(raw_lines, "Skills") if line.startswith("- ")]
    certifications = [line[2:] for line in section(raw_lines, "Certifications") if line.startswith("- ")]
    education = [line[2:] for line in section(raw_lines, "Education") if line.startswith("- ")]

    styles = getSampleStyleSheet()
    name_style = ParagraphStyle(
        "Name", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=22,
        textColor=BLUE, spaceAfter=3,
    )
    contact_style = ParagraphStyle(
        "Contact", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=11.5,
        textColor=DARK, spaceAfter=6,
    )
    summary_style = ParagraphStyle(
        "Summary", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=12.5,
        textColor=DARK, spaceAfter=6,
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=14,
        textColor=BLUE, spaceBefore=4, spaceAfter=4,
    )
    role_style = ParagraphStyle(
        "Role", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=12,
        textColor=DARK,
    )
    date_style = ParagraphStyle(
        "Date", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=11,
        textColor=MUTED, alignment=TA_LEFT,
    )
    bullet_style = ParagraphStyle(
        "Bullet", parent=styles["BodyText"], fontName="Helvetica", fontSize=10, leading=12.4,
        textColor=DARK, spaceAfter=1.2,
    )
    column_style = ParagraphStyle(
        "Column", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.7, leading=12,
        textColor=DARK, spaceAfter=3,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = ROOT / "tmp/pdfs"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{output_path.stem}.working.pdf"

    document = BaseDocTemplate(
        str(temp_path), pagesize=letter, leftMargin=0.43 * inch, rightMargin=0.43 * inch,
        topMargin=0.36 * inch, bottomMargin=0.32 * inch,
        title="Andrew Malvani Resume", author="Andrew Malvani", subject="Professional resume",
    )
    frame = Frame(document.leftMargin, document.bottomMargin, document.width, document.height, id="resume")
    document.addPageTemplates(PageTemplate(id="resume", frames=[frame]))

    story = [
        Paragraph(html.escape(name), name_style),
        Paragraph(inline_links(contact), contact_style),
        Paragraph(html.escape(summary), summary_style),
        Paragraph("Experience", section_style),
    ]

    for title, company, details, bullets in roles:
        heading = Table(
            [[Paragraph(f"<b>{html.escape(title)}</b> | {html.escape(company)}", role_style), Paragraph(html.escape(details), date_style)]],
            colWidths=[document.width * 0.56, document.width * 0.44],
            hAlign="LEFT",
        )
        heading.setStyle(TableStyle([
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1.5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(KeepTogether([heading, bullet_list(bullets, bullet_style), Spacer(1, 2.5)]))

    def column(title: str, entries: list[str]) -> list[object]:
        flowables: list[object] = [Paragraph(title, section_style)]
        flowables.extend(Paragraph(html.escape(entry), column_style) for entry in entries)
        return flowables

    bottom = Table(
        [[column("Skills", skills), column("Credentials", certifications), column("Education", education)]],
        colWidths=[document.width * 0.34, document.width * 0.34, document.width * 0.32],
        hAlign="LEFT",
    )
    bottom.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("LEFTPADDING", (1, 0), (-1, 0), 12),
        ("RIGHTPADDING", (0, 0), (-2, 0), 10),
        ("RIGHTPADDING", (-1, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(bottom)
    document.build(story)

    reader = PdfReader(str(temp_path))
    if len(reader.pages) != 1:
        raise RuntimeError(f"Expected one page, generated {len(reader.pages)} pages")
    link_count = sum(
        1
        for annotation in (reader.pages[0].get("/Annots") or [])
        if annotation.get_object().get("/Subtype") == "/Link"
    )
    if link_count < 2:
        raise RuntimeError(f"Expected email and LinkedIn links, found {link_count} PDF link annotations")
    os.replace(temp_path, output_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    build(args.source.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
