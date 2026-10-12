# Pet topical-toxicity check: one independent reviewer

Actively Skin is adding a pet mode: dog and cat skin, ear and flea/tick products. Product pages warn when an ingredient is dangerous for a species. Each warning must be backed by a CONSENSUS of independent authorities. You are ONE of three reviewers, and each reviewer is restricted to a different family of sources (yours is given below). Work alone and do not guess: if your sources don't say it, answer "not_found".

## Rules
- Open every page or PDF you cite. Search snippets don't count.
- Use only sources in YOUR family. Record each source's title and URL.
- A claim counts as "supported" only if a source in your family states it explicitly: the ingredient is toxic, or contraindicated, for that species by skin exposure or by licking or grooming it off.
- Note any concentration or threshold a source gives. Never invent one.
- Note when a source says a dose or product IS considered safe for a species (e.g., low-dose pyrethrins in cat-labeled products, etofenprox in cat products).
- Be polite to sites: at most about 1 request per second per host.

## Ingredients to assess (existing rules first, then candidates)
1. permethrin and other pyrethroids (cypermethrin, cyphenothrin, deltamethrin, d-phenothrin, lambda-cyhalothrin), for cats. Is that true even when the product is labeled for cats? What about pyrethrins (natural) and etofenprox?
2. tea tree / melaleuca oil, for cats and dogs. Concentration?
3. other essential oils (pennyroyal, eucalyptus, peppermint, cinnamon, clove, pine, ylang-ylang, d-limonene/citrus, wintergreen, sweet birch), and which species. List per oil what your sources support.
4. methyl salicylate / wintergreen / birch oil, for cats (and dogs?)
5. minoxidil, for cats and dogs
6. 5-fluorouracil (topical), for cats and dogs
7. calcipotriene / calcipotriol, for cats and dogs
8. diclofenac (topical), for cats and dogs
9. zinc oxide, for dogs (and cats?). Is there a concentration threshold?
10. xylitol, for dogs (and cats?)
11. Candidates:
    - phenols / phenolic compounds / coal tar, for cats
    - benzocaine, for cats (methemoglobinemia)
    - DEET, for cats and dogs
    - salicylic acid topical, for cats
    - hydrogen peroxide (as an emetic, or on skin), for cats
    - lidocaine, for cats
    - benzoyl peroxide, for cats
    - selenium sulfide, for cats
    - lime sulfur, for cats or dogs
    - amitraz, for cats (and Chihuahuas/small dogs?)
    - organophosphates such as tetrachlorvinphos, for cats
    - ivermectin, for collies/MDR1 dogs topically?
    - alpha-lipoic acid
    - nicotine
    - retinoids (topical tretinoin)
    - topical NSAIDs other than diclofenac (flurbiprofen)
    - human-strength hydrocortisone? (Only if your sources flag it.)
    - Anything else your family's sources explicitly flag as a common topical or grooming-product danger for dogs or cats.

## Output
Write JSON to the file path given below. It is a list of objects:
{"ingredient": "...", "species": {"cat": "supported|not_found|considered_safe", "dog": "..."}, "threshold": "verbatim or null", "safe_exceptions": "verbatim or null", "effect": "short paraphrase", "sources": [{"title": "...", "url": "..."}], "notes": "..."}

Reply with a 150-word summary and the file path.
