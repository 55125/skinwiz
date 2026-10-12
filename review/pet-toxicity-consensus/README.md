# Pet species-toxicity list: consensus check (2026-10-12)

The warnings in `app/src/db/pet.ts` (`PET_TOXICITY`) were checked by three
independent reviews. Each was limited to one family of sources, and a
warning ships only where at least 2 of the 3 families say the ingredient is
dangerous for that species. `brief.md` is the shared brief; the JSON files
hold each review's verdicts, with every source it opened.

| Family | File | Sources |
|---|---|---|
| Vet references | `vet_refs.json` | MSD/Merck Veterinary Manual, PubMed/PMC, dvm360, Clinician's Brief, VIN |
| Poison control | `poison_control.json` | ASPCA Animal Poison Control, Pet Poison Helpline |
| Regulators and vet schools | `regulators_schools.json` | FDA, EPA, NPIC, Cornell, Tufts, VCA |

S = supported, `safe` = the family says it is fine as labelled, `-` = not found.

| Ingredient | Cats (vet / poison / reg) | Dogs (vet / poison / reg) | In the list |
|---|---|---|---|
| Permethrin and pyrethroids | S S S | - safe safe | cats, dog-labelled products only |
| Tea tree, pennyroyal, cinnamon, pine oil | S S S (pennyroyal, cinnamon: - S S) | S S S (cinnamon, pine: - S S) | cats and dogs |
| Eucalyptus, peppermint, clove, ylang-ylang, citrus oil | S S S (citrus) / - S S | mostly 1 of 3 | cats |
| Wintergreen, birch (methyl salicylate) | S S S | S S S | cats and dogs |
| Minoxidil | S S S | S S - | cats and dogs |
| 5-fluorouracil | S S S | S S S | cats and dogs |
| Calcipotriene | - S S | S S S | cats and dogs |
| Diclofenac, flurbiprofen | S S S | - S - | cats |
| Zinc oxide | - S S | S S S | cats and dogs, 10% and up (placeholder, no source threshold) |
| Xylitol | safe - - | S S S | dogs |
| Phenol, coal tar | S S S | - - safe | cats |
| Benzocaine, lidocaine | S S - (lidocaine safe) | S S - | both, only if not labelled for the species |
| DEET | S S S | S S S | both, only if not labelled for the species (Bravecto uses it as a solvent) |
| Salicylic acid | S S safe | S S safe | both, only if not labelled for the species |
| Selenium sulfide | S - S | - - safe | cats, only if not labelled for cats |
| Amitraz | S S S | S - S | cats (small, young and diabetic dogs named in the text) |
| Organophosphates | S S - | - S - | cats, only if not labelled for cats |
| Alpha-lipoic acid | - S S | - S S | cats and dogs |

**Not added (fewer than 2 families, or considered safe):**
- etofenprox
- natural pyrethrins
- fipronil
- hydrocortisone up to 1%
- benzoyl peroxide
- lime sulfur
- tretinoin
- topical ivermectin
- camphor
- menthol
- neem
- benzalkonium chloride (cats: 2 families, but only above about 0.1%, and cat products use it at that level; left for the vet)

Hydrogen peroxide (an oral emetic risk) and nicotine are outside skin care.

**Caveats for the veterinary reviewer:**
- The families overlap. Pet Poison Helpline and ASPCA toxicologists write some MSD pages, papers and VCA pages.
- "Supported" means the source names the risk, usually for concentrated or human products. It does not mean every pet product with the ingredient is unsafe at its labelled use.
