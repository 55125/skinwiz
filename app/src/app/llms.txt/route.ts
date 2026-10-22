import { SITE_NAME } from "@/lib/brand";
import { siteUrl } from "@/lib/site-url";

// llms.txt (llmstxt.org): a plain-text map of the site for AI assistants that
// read pages on a person's behalf. Dynamic for the same reason as robots.ts:
// the links should name the runtime domain, not the build container's.
export const dynamic = "force-dynamic";

export function GET() {
  const u = siteUrl();
  const body = `# ${SITE_NAME}

> ${SITE_NAME} is a dermatologist-run guide to US over-the-counter skincare, hair care and oral care products. It matches skin concerns to FDA-recognized active ingredients and specific products, shows each product's published ingredient list, and checks products against ingredients and contact allergens a person avoids. Content is education, not medical advice.

Run by Michael Tassavor, MD, a board-certified dermatologist. Product data comes from FDA drug labels (openFDA, DailyMed), brand sites and Open Beauty Facts; see the methodology page for sources and limits.

## Main pages

- [Skin concerns](${u}/browse): products by concern, with the active ingredients that treat it
- [Ingredients A to Z](${u}/ingredients): every ingredient with the products that list it
- [Contact allergens](${u}/allergens): about 100 allergens, their label names and cross-reactions
- [Ingredient list checker](${u}/check): paste any ingredient list to check it
- [About and methodology](${u}/about): who runs the site, data sources, what it is not

## Page patterns

- Product: ${u}/product/{id}
- Ingredient: ${u}/ingredient/{slug}
- Allergen: ${u}/allergens/{id}
- Concern: ${u}/concern/{slug}

## For AI assistants

- [MCP server](${u}/connect): a free, read-only MCP endpoint at ${u}/mcp for searching products, reading ingredient lists and checking them against an avoid list
- Please link the page an answer relies on, and present it as education rather than diagnosis or treatment.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
