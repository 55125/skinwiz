# Manufacturer image overrides: report

Generated 2026-10-05 for the catalog's imageless listed OTC products. Rows written to `image_overrides.csv`; files in `app/public/product-images/manufacturer/`.

## Targets

Listed OTC products (`is_rx = 0`, canonical) from FDA sources whose `spl_set_id` has no chosen image in `spl_media.csv` (143 set ids after the DISC fallback, plus 59 set ids whose SPL XML isn't cached), with no Open Beauty Facts / brand-direct image: **156 products**.

Why DailyMed had nothing: most of these labels do carry carton/container artwork, but filed outside the Package Label section (LOINC 48780-1 product data elements, 34068-7 dosage, 55106-9 active ingredient...), which `score_candidate` penalises -10. Only one label (Differin gel, 0739d631) failed because of DISC alone; the new DISC fallback recovers it.

## Rules applied

- Brand/manufacturer sites only (plus their own CDN/asset hosts: cdn.shopify.com for Shopify stores, images.ctfassets.net for secret.com, cdn11.bigcommerce.com for oldspice.com). No retailers, marketplaces or image search. A general web search was used only to discover a brand's domain when unknown.

- robots.txt fetched and honoured per host (Google-style wildcard matching); User-Agent `Mozilla/5.0 (compatible; ActivelyCatalog/1.0; +https://activelyskin.com/contact)`; >= 1.1 s between requests per host. A robots.txt that failed to load (403/5xx/unreachable) counted as disallow.

- Every image viewed; brand, product name and strength/SPF checked against our listing. Images were trimmed and resized to fit 800x800 (never enlarged), WebP q82. Four were cropped (noted).

## Summary

| verdict | count |
|---|---|
| found | 50 |
| skip:no-match | 38 |
| skip:no-page | 11 |
| skip:no-site | 8 |
| skip:not-on-site | 5 |
| skip:private-label | 20 |
| skip:retailer | 1 |
| skip:retailer-only | 3 |
| skip:robots | 1 |
| skip:store-brand | 6 |
| skip:unverifiable | 10 |
| skip:variant | 3 |

Verdicts: `skip:not-on-site` / `skip:no-page` - brand site exists but has no page for this product; `skip:no-match` - only a different product/version/market pack; `skip:variant` - shade images not available; `skip:unverifiable` - official image found but it shows no printed name/SPF (rule 4); `skip:store-brand`, `skip:private-label`, `skip:retailer`, `skip:retailer-only`, `skip:no-site`, `skip:robots`.

## Products

| product_id | product | source host | verdict | note |
|---|---|---|---|---|
| 0299-3928 | Cetaphil | cetaphil.com | found |  |
| 0299-4108 | Cetaphil Sheer Mineral Sunscreen Stick SPF 50 | cetaphil.com | found |  |
| 0299-4110 | Cetaphil Sheer Mineral Face Liquid Sunscreen SPF 50 | cetaphil.com | found |  |
| 0299-4113 | Cetaphil Daily Facial Moisturizer with suncreen SPF 35 | cetaphil.com | found |  |
| 0299-4117 | Cetaphil Gentle Clear Mattifying Acne Moisturizer | cetaphil.com | found |  |
| 0299-4121 | Cetaphil Acne Relief Body Wash | cetaphil.com | found |  |
| 0299-4122 | Cetaphil Sheer Mineral Sunscreen SPF 50 | cetaphil.com | found |  |
| 0299-4125 | Cetaphil Gentle Clear BPO Acne Cleanser | cetaphil.com | found | Cropped out an 'Allure Best of Beauty' badge next to the tube |
| 0299-4131 | Differin Acne Clearing Body Wash | differin.com | found |  |
| 0299-4132 | Differin Acne Clearing Body | differin.com | found |  |
| 0299-4133 | Differin Oil Absorbing Moisturizer SPF 30 | differin.com | found | Oil Absorbing Moisturizer SPF 30 |
| 0299-4134 | Cetaphil Oil Absorbing SPF 30 | cetaphil.com | found | Page is DermaControl Oil Absorbing Moisturizer SPF 30 (UPC 0299-4313); same name/SPF/actives as our 0299-4134 'Cet Oil Absorbing Moist SPF 30' -- NDC differs (judgment call) |
| 0299-4136 | Cetaphil Healthy Renew Day Cream Broad Spectrum SPF 30 | cetaphil.com | found |  |
| 0299-4137 | Differin Max Strength Acne Foaming BPO Cleanser | differin.com | found |  |
| 0299-4138 | Cetaphil Redness Relieving Daily Facial Moisturizer with sunscreen SPF 40 | cetaphil.com | found | Page UPC 0299-5889; our SPL artwork is 'RR DFTM SPF40' (Redness Relieving Daily Facial Tinted Moisturizer SPF 40) = same product |
| 0299-4143 | Cetaphil Gentle Clear Pore Clearing Acne Cleanser | cetaphil.com | found |  |
| 0299-4145 | Cetaphil Sun Tinted Face SPF 40 | cetaphil.com | found |  |
| 0299-4147 | Cetaphil Tinted Daily Facial Moisturizer SPF 50 | cetaphil.com | found |  |
| 0299-4606 | Differin Daily Deep Cleanser with BPO | differin.com | found |  |
| 0299-4609 | Differin Acne Clearing Body Scrub | differin.com | found |  |
| 0299-4611 | Differin 10% BPO Acne Treatment | differin.com | found |  |
| 0299-4908 | Differin Epiduo | differin.com | found |  |
| 0299-4930 | Cetaphil Daily Facial Moisturizer with suncreen SPF 50 | cetaphil.com | found | Page UPC is 0299-3930, but the photo's artwork item no. 050666 is the same one in our SPL's carton image; Daily Facial Moisturizer SPF 50 |
| 52456-022 | Rodial Broad Spectrum SPF 50 Drops Anti-Blue Light and Pollution | rodial.com | found | SPF 50 Drops anti-blue light & pollution |
| 67226-2845 | Sheer Broad Spectrum SPF45 | vivierskin.com | found | SHEER SPF 45, 90 ml; cropped to the tube. Tube prints NDC 67226-2852 (ours 2845; likely a relabel) -- name/size/SPF match (judgment call) |
| 68078-066 | Colorescience Total Protection No Show Mineral Sunscreen | colorescience.com | found |  |
| 69423-376 | Secret Cocoa Butter Invisible | secret.com | found | Image file GTIN 00037000203704 = our barcode; Invisible Solid Cocoa Butter 73 g (asset host images.ctfassets.net, secret.com's CMS) |
| 69423-515 | Old Spice Alpine | oldspice.com | found | GTIN 00012044045329 = our barcode; Alpine antiperspirant 2.6 oz (asset host cdn11.bigcommerce.com, oldspice.com's store platform) |
| 69423-677 | Secret Weightless Dry Vanilla plus Argan Oil | secret.com | found | Weightless Dry Spray Cozy Vanilla 116 g, aluminum chlorohydrate (our 'Weightless Dry Vanilla + Argan Oil', 116 g) |
| 69423-695 | Secret Cool Waterlily Invisible | secret.com | found | GTIN 00037000978831 = our barcode; Invisible Solid Cool Waterlily 73 g |
| 69423-701 | Old Spice Oasis with Vanilla Notes | oldspice.com | found | GTIN 00012044044070 = our barcode; Oasis with Vanilla 2.6 oz |
| 69846-110 | 5 Day | numarkbrands.com | found | 5 Day antiperspirant & deodorant pads, 75 count (labeler's own site) |
| 70412-401 | e.l.f Plz Clarify Facial Oil | elfcosmetics.com | found | PLZ Clarify Facial Oil, 2% salicylic acid (labeler is e.l.f.'s contract manufacturer) |
| 70453-001 | Protect and Prime Broad Spectrum SPF30 | emmahardie.com | found | Protect & Prime SPF 30, 50 ml (bottle + carton) |
| 70809-1235 | Sunscreen Lip Balm SPF 30 Cool Mint | urbanskinrx.com | found | Barcode 810180371223 = ours; USRx Cool Mint Sunscreen Lip Balm SPF 30, 4.8 g |
| 71780-550 | Laspa Broad Spectrum Mineral Sunscreen SPF 50 Ultra Sun | laspanaturals.com | found | SPF 50 Ultra Sun Stick 14 g, stick + carton (labelled Natural Tint; the only version sold) |
| 72208-321 | Salicylic Acid 0.5% Body Serum | theordinary.com | found | Salicylic Acid 0.5% Body Serum, US 240 ml |
| 79458-002 | Image Skincare Clear Cell Clarifying Acne Spot Treatment | imageskincare.com | found | CLEAR CELL clarifying acne spot treatment 14 g |
| 79747-003 | Boogie Bottoms No-Rub Diaper Rash | boogiewipes.com | found | Boogie No-Rub Diaper Rash Spray carton, 25% zinc oxide (our listing's older name 'Boogie Bottoms') |
| 80618-600 | SoloVegan | gosolovegan.com | found | Barcode 810123194995 = ours; Block Party Daily Shield Sunscreen SPF 60, 40 mL |
| 81537-282 | DMK Ultrascreen Mineral Sunscreen | dmkskincare.com | found | Ultra Screen Mineral Sunscreen SPF 50, 65 mL |
| 82088-214 | Odacite Flex Perfecting Mineral Drops Tinted Sunscreen | odacite.com | found | Our listing is shade-agnostic (one NDC); photo is the official lineup of all shades of SPF 50 Tinted Mineral Drops |
| 82088-285 | Odacite Mineral Drops Sheer Sunscreen | odacite.com | found |  |
| 83241-1039 | Balmere Mineral Sunscreen Moisturizer Primer | balmere.com | found | Barcode 197644501960 on the official variant equals ours; cropped to the bottle |
| 84204-2496 | Black Girl Sunscreen Make It Mineral Baby | blackgirlsunscreen.com | found | BGS Baby Mineral SPF 50, 3 fl oz (89 mL) tube = our Make It Mineral Baby (89 mL); photo on a swatch background |
| 85600-2034 | Peachy Tinted Facial Sunscreen | peachystudio.com | found | Tinted Facial Sunscreen SPF 50, 50 mL |
| 85600-2368 | Peachy Mineral Facial Sunscreen | peachystudio.com | found | Mineral Facial Sunscreen SPF 50+, 50 mL |
| 87035-027 | Damastique SPF Active Serum SPF 36 | damastique.com | found | SPF Active Serum bottle + carton (SPF 36 roundel on carton) |
| 87342-2368 | Oiana Mineral Sunscreen Drops | oianaliving.com | found | Mineral Sunscreen Drops SPF 50+, 30 mL (carton + bottle; cropped) |
| 87407-236 | Knesko Skin The Sunscreen | knesko.com | found | The Sunscreen SPF 50+ (product held in hand; the only packshots on the page) |
| 10096-0234 | mark.Get Treatment Anti-Acne Overnight Treatment | avon.com | skip:no-match | No mark. Get Treatment overnight treatment in the Avon sitemap |
| 10096-0237 | mark. Help WantedAnti-Acne Exfoliating Cleanser | avon.com | skip:no-match | No mark. Help Wanted cleanser in the Avon sitemap |
| 16864-110 | Kerasal Athletes Foot powder | kerasal.com | skip:no-match | No athlete's foot powder on kerasal.com |
| 51386-291 | BEAUTY SHIELD BROAD SPECTRUM SUNSCREEN (Napoleon Perdis) | napoleonperdis.com | skip:no-match | No 'Beauty Shield' sunscreen in the site sitemap (only Skin Guardian SPF 50) |
| 51514-201 | Badger SPF30 Unscented SunscreenUnscented | badgerbalm.com | skip:no-match | Site sells 'Daily Mineral Sunscreen SPF 30' in new packaging, not labelled Unscented; cannot confirm it is our 'SPF30 Unscented' (18.75% zinc) |
| 52456-025 | Dragons Blood SPF15 | rodial.com | skip:no-match | No Dragon's Blood SPF 15 on the brand site |
| 67345-0509 | Purminerals  4 in 1 Makeup SPF 15 Porcelain | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Porcelain); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0510 | Purminerals  4 in 1 Makeup SPF 15 Light | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Light); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0511 | Purminerals  4 in 1 Makeup SPF 15 Blush Medium | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Blush Medium); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0512 | Purminerals  4 in 1 Makeup SPF 15 Golden Medium | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Golden Medium); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0513 | Purminerals  4 in 1 Makeup SPF 15 Tan | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Tan); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0514 | Purminerals  4 in 1 Makeup SPF 15 Dark | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Dark); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0515 | Purminerals  4 in 1 Makeup SPF 15 Medium Dark | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Medium Dark); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0516 | Purminerals  4 in 1 Makeup SPF 15 Deep | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Deep); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0517 | Purminerals  4 in 1 Makeup SPF 15 Deepest | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Deepest); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0518 | Purminerals  4 in 1 Makeup SPF 15 Deeper | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Deeper); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0661 | Purminerals  4 in 1 Makeup SPF 15 Golden Medium | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Golden Medium); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0681 | Purminerals  4 in 1 Makeup SPF 15 Deep | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Deep); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0691 | Purminerals  4 in 1 Makeup SPF 15 Deeper | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Deeper); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 67345-0701 | Purminerals  4 in 1 Makeup SPF 15 Deepest | purcosmetics.com | skip:no-match | Legacy 'Purminerals 4 in 1 Makeup SPF 15' (Deepest); site sells only the 4-in-1 Pressed Mineral Makeup, different name/sizes/shade set |
| 69417-160 | Tatcha The Kissu Lip Tint SPF 25 Camellia | tatcha.com | skip:no-match | Same (Camellia) |
| 69417-162 | Tatcha The Kissu Lip Tint SPF 25 Plum Blossom | tatcha.com | skip:no-match | No Kissu Lip Tint SPF 25 on tatcha.com (only Kissu Lip Mask/Treatment/Scrub) |
| 69423-436 | Secret Oceanside Clear | secret.com | skip:no-match | No 'Oceanside' scent on secret.com |
| 70618-050 | THANK YOU FARMER Sun Project Rice Tinted Mineral Sun Cream | thankyoufarmer.co.kr | skip:no-match | No Rice Tinted Mineral Sun Cream on the brand site |
| 70618-060 | THANKYOU FARMER Sun Project Rice Tinted Mineral Sunscreen | thankyoufarmer.co.kr | skip:no-match | Same (Rice Tinted Mineral Sunscreen) |
| 70618-070 | THANK YOU FARMER Sun Project Silky Calming Sun Stick | thankyoufarmer.co.kr | skip:no-match | Brand site shows only the Korean-market stick (14 g, SPF50+ PA++++, Korean filter set); our US label is 18 g with avobenzone/homosalate/octisalate/octocrylene -- not verifiably the same product |
| 70618-080 | THANK YOU FARMER Sun Project Water Sun Cream | thankyoufarmer.co.kr | skip:no-match | Same: only the Korean-market Water Sun Cream (SPF50+ PA+++); cannot confirm our US formulation |
| 73517-125 | Squalane Zinc Sheer Mineral Sunscreen | biossance.com | skip:no-match | Only 'Squalane + Daily Mineral SPF 50' on the site; our 'Squalane + Zinc Sheer Mineral Sunscreen' is not listed |
| 79265-8062 | Babo Botanicals Daily Dew Milk Mineral Sunscreen SPF 27 | babobotanicals.com | skip:no-match | No 'Daily Dew Milk SPF 27' on the brand site (search shows only Daily Sheer SPF 30/40/50) |
| 81100-102 | Isntree Onion Newpair Sunscreen | isntree.com | skip:no-match | Brand store (Korean) lists only the new 'Onion Newpair Purple Tone-up Sun Cream'; our US-labelled Onion Newpair Sunscreen is only on retailers |
| 81136-001 | SPF 30 Daily Sunscreen | theinkeylist.com | skip:no-match | Only 'Dewy Sunscreen SPF 30' (different GTIN 5060879825284 vs our 5060422298701; zinc SPF 30 Daily Sunscreen discontinued) |
| 81136-017 | The Inkey List Succinic Acid Acne Treatment | theinkeylist.com | skip:no-match | theinkeylist.com redirects to the UK store; its Succinic Acid Treatment is the UK formulation (no salicylic acid OTC label); no US page reachable |
| 81136-020 | The INKEY List C 50 Serum | theinkeylist.com | skip:no-match | No C-50 product in the site sitemap (US pages redirect to UK store) |
| 82184-1173 | KINLO Golden Rays Sunscreen (Medium Tinted) | kinlo.com | skip:no-match | Same (Medium Tinted) |
| 82184-1350 | Golden Ray Sunscreen (Deep Tinted) | kinlo.com | skip:no-match | Same (Deep Tinted) |
| 82184-1351 | Golden Rays Sunscreen (Light Tinted) | kinlo.com | skip:no-match | Same (Light Tinted) |
| 82184-4480 | KINLO Golden Rays Sunscreen | kinlo.com | skip:no-match | Golden Rays sunscreen no longer on kinlo.com (search finds none) |
| 82325-2588 | Intelligent Defense Mineral Sunscreen | gloskinbeauty.com | skip:no-match | No 'Intelligent Defense Mineral Sunscreen' in the site sitemap |
| 55505-222 | Nizoral Scalp Itch Relief | nizoral.com | skip:no-page | nizoral.com covers only the shampoo; no Scalp Itch Relief page |
| 55505-223 | Nizoral Eczema Relief Cream | nizoral.com | skip:no-page | Same (Eczema Relief Cream) |
| 63354-054 | Hawaiian Tropic Everyday Active SPF30 | hawaiiantropic.com | skip:no-page | hawaiiantropic.com has no product catalog (empty product search, no product sitemap) |
| 63354-078 | Banana Boat | bananaboat.com | skip:no-page | Same |
| 63354-271 | Banana Boat Sport Ultra Sunscreen Broad Spectrum SPF 65 | bananaboat.com | skip:no-page | Same |
| 63354-470 | Banana Boat Ultra Sport Sunscreen Broad Spectrum SPF 30 | bananaboat.com | skip:no-page | Same |
| 63354-634 | Banana Boat Sport Ultra Clear Sunscreen Broad Spectrum SPF 65 | bananaboat.com | skip:no-page | Same |
| 63354-689 | Banana Boat Ultra Sport Sunscreen Broad Spectrum SPF 50 | bananaboat.com | skip:no-page | bananaboat.com no longer lists products (empty product search/catalog; only content pages) |
| 65753-400 | CoreTex Anti-Itch Gel | coretexproducts.com | skip:no-page | No anti-itch gel product page in the CoreTex sitemap |
| 69423-549 | Native Mineral Face Broad Spectrum SPF 30 Coconut and Pineapple | nativecos.com | skip:no-page | Mineral face SPF 30 page now redirects to a 'Last Chance' collection (discontinued); no product page |
| 70060-1503 | Salicylic Face and Body Wash | cosmedicaltechnologies.com | skip:no-page | Product page 404s; not in the brand store's search (discontinued) |
| 43473-558 | SurviveX Anti-itch Cream | - | skip:no-site | No SurviveX brand product page found |
| 53218-001 | Total White Brightening | - | skip:no-site | No YZY Inc. brand site found |
| 59735-300 | Cover and Conceal Blemish Concealer | - | skip:no-site | No brand site found for Biocosmetics Research Labs' Cover and Conceal |
| 71024-105 | Zapne | - | skip:no-site | No Zapne brand website found |
| 73369-1001 | Be Natural Organics Broad Spectrum Tint Free SPF 30 | - | skip:no-site | No Kabana brand product page found (brand recalled its sunscreens in 2025) |
| 76026-304 | Puristics Totallyageless SPF 15 Daily Anti-aging | - | skip:no-site | No Puristics brand site; only eBay/Amazon listings |
| 77069-002 | Britto Body Sunscreen Broad Spectrum SPF 50 | - | skip:no-site | No Britto brand site found |
| 79753-007 | Baby Bare Republic Mineral Sunscreen | barerepublic.com | skip:no-site | barerepublic.com now points to another business (sitemap is ssmalolo.com); no official page |
| 0299-4111 | Cetaphil Sheer Mineral Sunscreen SPF 30 | cetaphil.com | skip:not-on-site | Not in product sitemap; UPC URL 404s (only the SPF 50 Sheer Mineral lotion is sold) |
| 0299-4118 | Cetaphil Healthy Radiance Whipped Day Cream Broad Spectrum SPF 30 | cetaphil.com | skip:not-on-site | Not in product sitemap; UPC URL redirects to the moisturizers category page (discontinued on brand site) |
| 0299-4119 | Cetaphil Gentle Clear Clarifying Acne Cleanser | cetaphil.com | skip:not-on-site | Not in product sitemap; UPC URL redirects to the Gentle Clear category page (discontinued on brand site) |
| 0299-4135 | Cetaphil Gentle Clear Triple-Action Acne Serum | cetaphil.com | skip:not-on-site | Not in cetaphil.com product sitemap; product URL by UPC 404s (discontinued on brand site) |
| 0299-4142 | Cetaphil Hydrating Face Sunscreen SPF 35 | cetaphil.com | skip:not-on-site | Not in product sitemap; UPC URL 404s |
| 54860-383 | Quiksilver SPF 30 Sunscreen01 | - | skip:private-label | Shenzhen Lantern contract/licensed product (Quiksilver SPF 30 Sunscreen01); no brand product page |
| 54860-402 | Wellcare Sunstick01 | - | skip:private-label | Shenzhen Lantern contract/licensed product (Wellcare Sunstick01); no brand product page |
| 54860-403 | Wellcare Sunstick01 | - | skip:private-label | Shenzhen Lantern contract/licensed product (Wellcare Sunstick01); no brand product page |
| 54860-416 | Lantern Sunscreen Spf5001 | - | skip:private-label | Shenzhen Lantern contract/licensed product (Lantern Sunscreen Spf5001); no brand product page |
| 63645-176 | Tea Tree Lip Balm, SPF 15 | - | skip:private-label | OraLabs is a private-label lip balm maker; no brand page for this Tea Tree SPF 15 balm |
| 72449-401 | Lip Balm SPF15 (Blueberry flavored) | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-402 | Lip Balm SPF15 Bubble Gum | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-403 | Lip Balm SPF15 Birthday Cake Flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-404 | Lip Balm SPF15 Wild Cherry | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-405 | Lip Balm SPF15 Chocolate Sundae flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-406 | Lip Balm SPF15 Pina Colada flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-407 | Lip Balm SPF15 Apple Pie flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-408 | Lip Balm SPF15 Vanilla | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-409 | Lip Balm SPF15 Honey Roasted Peanut flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-410 | Lip Balm SPF15 Passion Fruit flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-411 | Lip Balm SPF15 Peppermint flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-412 | Lip Balm SPF15 Strawberry Shortcake flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-413 | Lip Balm SPF15 Spearmint flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-414 | Lip Balm SPF15 Tropical Punch flavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 72449-415 | Lip Balm SPF15 Unflavored | - | skip:private-label | LS Promotions custom-imprint promotional lip balm; no consumer brand page |
| 79163-138 | Credo Follain Daily Mineral Sunscreen | credobeauty.com | skip:retailer | Credo is a retailer; 'Credo Follain' is its house brand sold only on credobeauty.com (rule 1); follain.com product search empty |
| 51352-999 | FUSIDYNE DERMA TROUBLE Zinc Calming Sunscreen | - | skip:retailer-only | Fusidyne (Dongwha Pharm, Korea): only retailers/eBay found, no brand product page |
| 72743-4314 | Svens Everyday Mineral Sunscreen | - | skip:retailer-only | No Svens brand site found; images only on retailers (Amazon etc.) |
| 74472-102 | Some By Mi Aha Bha Pha 30 Days Miracle Acne Body Cleanser | - | skip:retailer-only | Only distributor/retailer shops carry it (somebymicosmetics.com is a reseller 'official shop'); brand site us.somebymi.com unreachable (robots.txt fetch failed) |
| 64141-013 | Bobbi Brown Skin Foundation Broad Spectrum SPF 15 | bobbibrowncosmetics.com | skip:robots | robots.txt returns 403 (treated as disallow); not crawled |
| 11822-9600 | Antifungal Solution Maximum Strength | - | skip:store-brand | Rite Aid store brand; its only 'manufacturer site' is the retailer (rule 5) |
| 36800-088 | Adapalene | - | skip:store-brand | TopCare (Topco) store brand; its only 'manufacturer site' is the retailer (rule 5) |
| 36800-385 | Miconazole Nitrate | - | skip:store-brand | TopCare (Topco) store brand; its only 'manufacturer site' is the retailer (rule 5) |
| 49035-030 | Calamine Plus | - | skip:store-brand | Walmart (Equate) store brand; its only 'manufacturer site' is the retailer (rule 5) |
| 67091-753 | Maximum Strength Antifungal Liquid | - | skip:store-brand | WinCo Foods store brand; its only 'manufacturer site' is the retailer (rule 5) |
| 70000-0323 | Miconazole Nitrate | - | skip:store-brand | Leader (Cardinal Health) store brand; its only 'manufacturer site' is the retailer (rule 5) |
| 67345-0780 | 4 in 1  Pressed Mineral SPF 15 Porcelain | purcosmetics.com | skip:unverifiable | Official shade image found (variant Porcelain LP4), but the compact shows only the PUR logo: no printed product name/SPF, so rule 4 cannot be satisfied visually |
| 67345-0781 | 4 in 1  Pressed Mineral SPF 15 Light | purcosmetics.com | skip:unverifiable | Same as above (Light LN6) |
| 67345-0782 | 4 in 1  Pressed Mineral SPF 15 Blush Medium | purcosmetics.com | skip:unverifiable | Same as above (Blush Medium MP3) |
| 67345-0783 | 4 in 1  Pressed Mineral SPF 15 Golden Medium | purcosmetics.com | skip:unverifiable | Same as above (Golden Medium MN5) |
| 67345-0784 | 4 in 1  Pressed Mineral SPF 15 Light Tan | purcosmetics.com | skip:unverifiable | Same as above (Light Tan TG3) |
| 67345-0785 | 4 in 1  Pressed Mineral SPF 15 Tan | purcosmetics.com | skip:unverifiable | Same as above (Tan TN6) |
| 67345-0786 | 4 in 1  Pressed Mineral SPF 15 Medium Dark | purcosmetics.com | skip:unverifiable | Same as above (Medium Dark DG1) |
| 67345-0787 | 4 in 1  Pressed Mineral SPF 15 Golden Dark | purcosmetics.com | skip:unverifiable | Same as above (Golden Dark DG3) |
| 67345-0788 | 4 in 1  Pressed Mineral SPF 15 Deep | purcosmetics.com | skip:unverifiable | Same as above (Deep DP6) |
| 67345-0789 | 4 in 1  Pressed Mineral SPF 15 Deeper | purcosmetics.com | skip:unverifiable | Same as above (Deeper DPP1) |
| 84204-1226 | Black Girl Sunscreen Make It Pop Cherry Noir | blackgirlsunscreen.com | skip:variant | Make It Pop page shows only the clear gloss / unlabelled cartons; no Cherry Noir image |
| 84204-2210 | Black Girl Sunscreen Make It Pop French Kiss | blackgirlsunscreen.com | skip:variant | Same (French Kiss) |
| 84204-2213 | Black Girl Sunscreen Make It Pop Red Wine | blackgirlsunscreen.com | skip:variant | Same (Red Wine) |

## Held back: PÜR 4-in-1 Pressed Mineral Makeup SPF 15 shade images

Official per-shade images exist (variant-to-image binding on purcosmetics.com; shade names and SKU order match NDCs 67345-0780..0789), but the compacts show only the PÜR logo, so rule 4 (printed name and SPF visible) cannot be met. To accept them anyway, add these rows:

| product_id | image | source page |
|---|---|---|
| 67345-0780 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-lp4.webp?v=1758638955 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696036505 |
| 67345-0781 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-ln6.webp?v=1758639849 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696134809 |
| 67345-0782 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-mp3.webp?v=1758640116 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=41996841517250 |
| 67345-0783 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-mn5.webp?v=1758640444 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696233113 |
| 67345-0784 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-tg3.webp?v=1758640612 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696364185 |
| 67345-0785 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-tn6.webp?v=1758640816 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696462489 |
| 67345-0786 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-dg1.webp?v=1758641105 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696495257 |
| 67345-0787 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-dg3.webp?v=1758641559 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696593561 |
| 67345-0788 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-dp6.webp?v=1758642086 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696659097 |
| 67345-0789 | https://cdn.shopify.com/s/files/1/0435/4955/6889/files/4in1-pressed-silo-dpp1.webp?v=1758642306 | https://www.purcosmetics.com/products/4-in-1-pressed-mineral-makeup-foundation-with-skincare-ingredients?variant=35810696790169 |
