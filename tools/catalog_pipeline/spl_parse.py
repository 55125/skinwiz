"""
Pure parsing/scoring for DailyMed SPL XML -- no network, no files -- so the
image heuristic and the inactive-ingredient parser are unit-testable
(tests/test_spl_parse.py) and the passes can be re-tuned offline against the
cache.

SPL is HL7 v3 XML (namespace urn:hl7-org:v3). The parts used here:

  <section><code code="51945-4"/>            Package Label / Principal Display Panel
    <title>PRINCIPAL DISPLAY PANEL - 50 mL Tube Carton</title>
    <component><observationMedia>
       <text>caption</text>
       <value mediaType="image/jpeg"><reference value="file.jpg"/></value>

  <manufacturedProduct><manufacturedProduct>
    <code code="49967-138" codeSystem="2.16.840.1.113883.6.69"/>   product NDC
    <ingredient classCode="IACT"><ingredientSubstance>
        <code code="UNII" codeSystem="2.16.840.1.113883.4.9"/><name>GLYCERIN</name>

  <section><code code="51727-6"/>            Inactive Ingredient section (free text)
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

NS = "{urn:hl7-org:v3}"
PDP_CODE = "51945-4"  # PACKAGE LABEL.PRINCIPAL DISPLAY PANEL
# SPL PRODUCT DATA ELEMENTS / "SPL listing data elements" section. Some
# labelers (Galderma: every Cetaphil and Differin label; Mayne; several Rx
# generics) file all their carton and tube art here instead of in a display
# panel section, next to chemical structures.
PRODUCT_DATA_CODE = "48780-1"
INACTIVE_SECTION_CODE = "51727-6"
NDC_SYSTEM = "2.16.840.1.113883.6.69"
UNII_SYSTEM = "2.16.840.1.113883.4.9"
IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/gif"}


def _text(el: ET.Element | None) -> str:
    if el is None:
        return ""
    return re.sub(r"\s+", " ", "".join(el.itertext())).strip()


def parse_xml(xml: str | bytes) -> ET.Element:
    return ET.fromstring(xml.encode("utf-8") if isinstance(xml, str) else xml)


# ---------------------------------------------------------------- images


@dataclass
class MediaCandidate:
    name: str  # file name inside the SPL, the image.cfm `name` parameter
    caption: str = ""
    section_code: str = ""
    section_title: str = ""
    order: int = 0  # document order among all images
    order_in_section: int = 0
    score: float = 0.0
    reasons: list[str] = field(default_factory=list)


def media_candidates(root: ET.Element) -> list[MediaCandidate]:
    """Every image the label embeds, with the innermost section it sits in."""
    out: list[MediaCandidate] = []
    seen: set[str] = set()

    def walk(sec: ET.Element, inherited_code: str, inherited_title: str) -> None:
        code_el = sec.find(f"{NS}code")
        code = (code_el.get("code") if code_el is not None else "") or ""
        title = _text(sec.find(f"{NS}title"))
        # An untitled/uncoded subsection inherits its parent's context (a PDP
        # section often nests one subsection per package size).
        eff_code = code if code and code != "42229-5" else inherited_code  # 42229-5 = "SPL UNCLASSIFIED SECTION"
        eff_title = title or inherited_title
        in_section = 0
        # observationMedia sits either directly under <component> or inside <text>
        media = [c for c in sec if c.tag == f"{NS}component" for c in c if c.tag == f"{NS}observationMedia"]
        text_el = sec.find(f"{NS}text")
        if text_el is not None:
            media += list(text_el.iter(f"{NS}observationMedia"))
        for om in media:
            value = om.find(f"{NS}value")
            ref = om.find(f".//{NS}reference")
            name = (ref.get("value") if ref is not None else "") or ""
            mime = (value.get("mediaType") if value is not None else "") or ""
            if not name or name in seen:
                continue
            if mime and mime.lower() not in IMAGE_TYPES:
                continue
            seen.add(name)
            out.append(MediaCandidate(name=name, caption=_text(om.find(f"{NS}text")), section_code=eff_code,
                                      section_title=eff_title, order=len(out), order_in_section=in_section))
            in_section += 1
        for comp in sec.findall(f"{NS}component"):
            for sub in comp.findall(f"{NS}section"):
                walk(sub, eff_code, eff_title)

    for body in root.iter(f"{NS}structuredBody"):
        for comp in body.findall(f"{NS}component"):
            for sec in comp.findall(f"{NS}section"):
                walk(sec, "", "")
    return out


# Word-ish matching: labelers write "Front", "FRONT_PANEL", "frt", "PDP".
def _norm(s: str, split_digits: bool = True) -> str:
    s = re.sub(r"\.(jpe?g|png|gif)$", "", s, flags=re.I)
    # UUIDs and long hex ids carry no words, but split into letters and
    # digits they would spell "df", "fb", ... ("27a7df84")
    s = re.sub(r"[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", " ", s)
    s = re.sub(r"\b(?=[0-9a-fA-F]*[0-9])(?=[0-9a-fA-F]*[a-fA-F])[0-9a-fA-F]{8,}\b", " ", s)
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)  # camelCase -> words
    if split_digits:  # carton1, 50g, Label18Front -> words
        s = re.sub(r"(?<=[A-Za-z])(?=[0-9])|(?<=[0-9])(?=[A-Za-z])", " ", s)
    return " " + re.sub(r"[^a-z0-9]+", " ", s.lower()).strip() + " "


# The weak package-type words (WEAK) don't count when glued to a number inside
# the display-panel section: there "Label2 / Tube2", "Label3 / Box2",
# "Bottle2 / Outer Package2" are numbered panels of one dieline set, and which
# one shows the front is a coin flip (checked by eye on 56 labels: as many
# got worse as better). In the product-data section "carton1.jpg" or
# "carton50g.jpg" is often the only package word a label has.
WEAK = {"carton", "container", "package"}
POSITIVE = [
    (r" (principal display|pdp|main panel|display panel)", 3, "pdp"),
    (r" (front|frt|fr|face panel|front panel)( |$)", 4, "front"),
    (r" (carton|box|outer)( |$)", 2, "carton"),
    (r" (tube|bottle|btl|jar|pump|pouch|stick|can|aerosol|spray|tottle|container|dispenser|pot|vial|canister|packet|sachet|wipes?|towelettes?)( |$)", 2, "container"),
    # "product" usually names the primary container itself, which reads
    # better at card size than a carton dieline
    (r" product( |$)", 3, "product"),
    # not "6pack": a multipack is a worse picture than the single unit
    (r"(?<![0-9]) (package|packaging|pack)( |$)", 1, "package"),
    # A real photo or 3D render of the product is the best image a label
    # can have -- worth more than sitting in the display-panel section.
    (r" (photo|photograph|render(ing)?|3d|mock ?up)( |$)", 12, "photo"),
    # e-commerce hero shots some labelers upload ("Carousel 1 Front")
    (r" carousel( |$)", 4, "carousel"),
]
FRONT_AND_BACK = re.compile(r" (front|frt) (and |n |amp )?(back|bk)( |$)")
# Inside the display-panel section every image is a label, so the word says
# nothing there; elsewhere it is what separates package art from a logo, a
# diagram or a structure.
LABEL_WORD = re.compile(r" (label|labels|lbl|labeling|labelling)( |$)")
PHOTO = re.compile(r" (photo|photograph|render(ing)?|3d|mock ?up)( |$)")
NEGATIVE = [
    (r" disc(ontinued)?( |$)", -6, "discontinued"),
    (r" (drug facts?|df(?! [0-9])|dfp|dfb|facts? panel|facts)( |$)", -7, "drug-facts"),
    (r" (back|bk|rear|reverse)( |$)", -6, "back"),
    (r" (side|sides|left|right|top|bottom|end|flap|panel [2-9](?! (oz|g|gr|gm|grams?|ml|fl|ct|mg|count|lbs?)( |$))|panel ?(two|three|four))( |$)", -4, "side"),
    (r" (label text|text|copy|artwork text|ingredients?|directions|warnings?)( |$)", -2, "text"),
    (r" (barcode|bar code|upc|ean|lot|exp|expiry|crimp)( |$)", -6, "barcode"),
    (r" (insert|leaflet|outsert|pi|package insert|patient information|instructions?|ifu|medguide|medication guide|how to (apply|use)|step [0-9]+)( |$)", -7, "insert"),
    # "fig" only with a number: "Velvet Fig Bloom" is a fragrance
    (r" (structure|structural|formula|chemical|molecule|figure|fig [0-9]+|chart|graph|diagram|table)( |$)", -8, "figure"),
    (r" (inner|inside|interior)( |$)", -3, "inner"),
    (r" (shipper|case|tray|display box|counter display|bulk)( |$)", -3, "shipper"),
    (r" (spl|logo)( |$)", -2, "logo"),
]


def score_candidate(c: MediaCandidate) -> MediaCandidate:
    score = 0.0
    reasons: list[str] = []
    own = _norm(c.name) + _norm(c.caption)
    in_pdp = c.section_code == PDP_CODE
    own_weak = _norm(c.name, False) + _norm(c.caption, False) if in_pdp else own
    if in_pdp:
        score += 10
        reasons.append("pdp-section")
    elif c.section_code == PRODUCT_DATA_CODE:
        # Neutral-ish: the file name and caption decide. The -1 keeps an image
        # with no signal at all (a labeler logo, "picture.jpg") below 0; any
        # package word (carton, tube, label, ...) lifts it, and drug facts,
        # structures and inserts filed here stay well below 0.
        score -= 1
        reasons.append("product-data-section")
    elif c.section_code and not PHOTO.search(own):
        # chemical structures, application diagrams, etc. live in other
        # sections (labelers do sometimes file product renders elsewhere)
        score -= 10
        reasons.append(f"section-{c.section_code}")
    # The file name and caption describe this image; the section title often
    # names several packages, so it only counts at half weight.
    title = _norm(c.section_title)
    for pattern, weight, label in POSITIVE:
        if re.search(pattern, own_weak if label in WEAK else own):
            score += weight
            reasons.append(label)
        elif re.search(pattern, title):
            score += weight / 2
            reasons.append(f"title:{label}")
    if c.section_code != PDP_CODE and LABEL_WORD.search(own):
        score += 1.5  # a little under carton/container: any panel is a "label"
        reasons.append("label")
    for pattern, weight, label in NEGATIVE:
        if re.search(pattern, own):
            if label == "back" and not in_pdp and FRONT_AND_BACK.search(own):
                # one image of both panels: the front is in it. (Not in the
                # display panel, which usually also has a carton or front of
                # its own; there it changed 3 picks, none for the better.)
                weight, label = -2, "front-and-back"
            score += weight
            reasons.append(label)
    # Labelers usually lead the display-panel section with the front. In the
    # product-data section the order means nothing (structures often come
    # first), so it's left to the document-order tie-break.
    if c.section_code != PRODUCT_DATA_CODE:
        score -= min(c.order_in_section, 5) * 0.5
    c.score = round(score, 2)
    c.reasons = reasons
    return c


def rank_media(cands: list[MediaCandidate]) -> list[MediaCandidate]:
    """Best first. Ties keep document order."""
    for c in cands:
        score_candidate(c)
    return sorted(cands, key=lambda c: (-c.score, c.order))


# Images that are never the product's packaging: they don't stop the all-DISC
# fallback below (Differin's gel label = two DISC cartons + an insert).
NOT_PACKAGING = {"insert", "figure", "drug-facts", "barcode"}


def usable_images(ranked: list[MediaCandidate], min_score: float = 0) -> tuple[list[MediaCandidate], bool]:
    """The images the app may show for a label, best first (rank_media's
    order), and whether they come from the all-DISC fallback.

    Normally every candidate scoring at least min_score. But when nothing
    does and every packaging image in the label is marked DISC(ontinued) --
    the rest, if any, being inserts, structures/figures, drug-facts panels or
    barcodes -- the DISC images are still the real product's artwork (older
    packaging beats no picture), so they are usable whatever their score."""
    good = [c for c in ranked if c.score >= min_score]
    if good:
        return good, False
    disc = [c for c in ranked if "discontinued" in c.reasons]
    if disc and all("discontinued" in c.reasons or NOT_PACKAGING & set(c.reasons) for c in ranked):
        return disc, True
    return [], False


def choose_image(ranked: list[MediaCandidate], min_score: float = 0) -> tuple[MediaCandidate | None, bool]:
    """The one image for a label (see usable_images), and whether it is the
    all-DISC fallback."""
    usable, fallback = usable_images(ranked, min_score)
    return (usable[0] if usable else None), fallback


# ---------------------------------------------------------------- inactive ingredients


@dataclass
class ProductIngredients:
    ndc: str  # product NDC ("49967-138"), "" when the product carries none
    name: str
    inactive: list[tuple[str, str]]  # (substance name, UNII), label order


def product_inactive_lists(root: ET.Element) -> list[ProductIngredients]:
    """Structured IACT lists, one per manufactured product (kit parts included)."""
    out: list[ProductIngredients] = []
    for mp in root.iter(f"{NS}manufacturedProduct"):
        # the outer <manufacturedProduct> wraps an inner one; only the inner
        # (which has <ingredient> children or <part>s) describes a product
        if mp.find(f"{NS}ingredient") is None:
            continue
        code_el = mp.find(f"{NS}code")
        ndc = ""
        if code_el is not None and code_el.get("codeSystem") == NDC_SYSTEM:
            ndc = code_el.get("code") or ""
        items: list[tuple[str, str]] = []
        seen: set[str] = set()
        for ing in mp.findall(f"{NS}ingredient"):
            if ing.get("classCode") != "IACT":
                continue
            sub = ing.find(f"{NS}ingredientSubstance")
            if sub is None:
                continue
            name = _text(sub.find(f"{NS}name"))
            code = sub.find(f"{NS}code")
            unii = (code.get("code") if code is not None and code.get("codeSystem") == UNII_SYSTEM else "") or ""
            key = name.upper()
            if not name or key in seen:
                continue
            seen.add(key)
            items.append((name, unii))
        out.append(ProductIngredients(ndc=ndc, name=_text(mp.find(f"{NS}name")), inactive=items))
    return out


INACTIVE_HEADING = re.compile(r"^\s*(?:other|inactive)\s+ingredients?\s*(?:[:.\-–]\s*)?", re.I)


def inactive_section_text(root: ET.Element) -> str:
    """The free-text Inactive Ingredients section, heading stripped ('' if absent)."""
    for sec in root.iter(f"{NS}section"):
        code = sec.find(f"{NS}code")
        if code is not None and code.get("code") == INACTIVE_SECTION_CODE:
            text = _text(sec.find(f"{NS}text"))
            if not text:
                continue
            return INACTIVE_HEADING.sub("", text).strip()
    return ""


def spl_version(root: ET.Element) -> str:
    v = root.find(f"{NS}versionNumber")
    return (v.get("value") if v is not None else "") or ""


def effective_time(root: ET.Element) -> str:
    v = root.find(f"{NS}effectiveTime")
    return (v.get("value") if v is not None else "") or ""
