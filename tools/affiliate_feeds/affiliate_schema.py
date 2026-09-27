"""
Normalized affiliate-product schema, plus adapters that map each network's
real bulk-feed field names into it. No live API calls here — see README.md
for why (no affiliate accounts approved yet) and what changes once one is.

Field names below match each network's actual publicly-documented product
feed spec (Awin's "Product Feed" datafeed, CJ's Product Catalog Search /
bulk feed, Impact's Catalog Items schema) — these are standard, publicly
documented formats, not guesses. Amazon's PA API is JSON over a signed
REST call, not a bulk feed, and is intentionally not adapted here — see
README.md.

Impact is the highest-priority network for this catalog (see
README.md#which-network-to-actually-target) — Target, Walmart, CVS, and
Ulta are all hosted there, covering most of where these products are
actually sold.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class NormalizedProduct:
    network: str
    external_id: str
    title: str
    brand: str
    description: str
    price: str
    currency: str
    image_url: str
    buy_url: str  # the actual affiliate deep link — this is what gets disclosed + clicked
    gtin_or_upc: str  # empty string if the feed didn't provide one
    category: str
    in_stock: str


def from_awin_row(row: dict) -> NormalizedProduct:
    """Awin 'Product Feed' spec: https://wiki.awin.com/index.php/Product_Feed"""
    return NormalizedProduct(
        network="awin",
        external_id=row.get("aw_product_id", ""),
        title=row.get("product_name", ""),
        brand=row.get("brand_name", ""),
        description=row.get("description", ""),
        price=row.get("search_price", ""),
        currency=row.get("currency", ""),
        image_url=row.get("aw_image_url") or row.get("merchant_image_url", ""),
        buy_url=row.get("aw_deep_link", ""),
        gtin_or_upc=row.get("ean") or row.get("upc") or row.get("isbn", ""),
        category=row.get("merchant_category", ""),
        in_stock=row.get("in_stock", ""),
    )


def from_cj_row(row: dict) -> NormalizedProduct:
    """CJ (Commission Junction) Product Catalog Search / bulk feed spec."""
    return NormalizedProduct(
        network="cj",
        external_id=row.get("catalog-id", ""),
        title=row.get("name", ""),
        brand=row.get("manufacturer", ""),
        description=row.get("description", ""),
        price=row.get("price", ""),
        currency=row.get("currency", ""),
        image_url=row.get("image-url", ""),
        buy_url=row.get("buy-url", ""),
        gtin_or_upc=row.get("upc") or row.get("isbn", ""),
        category=row.get("advertiser-category", ""),
        in_stock=row.get("in-stock", ""),
    )


def from_impact_row(row: dict) -> NormalizedProduct:
    """Impact.com Catalog Items schema: https://integrations.impact.com/brand-api-reference/reference/catalogs/catalog-items

    Note: Impact's raw catalog feed gives the merchant's destination Url, not
    a ready-to-click affiliate link — the actual tracking/deep link is
    generated per-publisher (via Impact's Deep Link Generator or link-build
    API) at integration time, not baked into the product feed itself. buy_url
    below is a placeholder for that until a real Impact account exists.
    """
    return NormalizedProduct(
        network="impact",
        external_id=row.get("CatalogItemId", ""),
        title=row.get("Name", ""),
        brand=row.get("Manufacturer", ""),
        description=row.get("Description", ""),
        price=row.get("CurrentPrice", ""),
        currency=row.get("Currency", ""),
        image_url=row.get("ImageUrl", ""),
        buy_url=row.get("Url", ""),  # placeholder — needs Impact's deep-link step, see docstring
        gtin_or_upc=row.get("Gtin", ""),
        category=row.get("Category", ""),
        in_stock=row.get("StockAvailability", ""),
    )


ADAPTERS = {
    "awin": from_awin_row,
    "cj": from_cj_row,
    "impact": from_impact_row,
}
