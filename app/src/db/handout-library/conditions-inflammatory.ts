// Skin-condition patient-education handouts (adult general dermatology:
// inflammatory conditions, infections, common complaints) for the clinician
// handout library.
// DRAFTED BY CLAUDE (AI), NOT YET REVIEWED: every handout here goes to the
// dermatologist's approve / edit / cut review (review/handout-library-review.html)
// and shows a "draft" marker until reviewed=true.
import type { HandoutTemplate } from "@/db/handout-templates";

export const CONDITIONS_INFLAMMATORY_HANDOUTS: HandoutTemplate[] = [
  {
    id: "cond-acne",
    name: "Acne: overview and what to expect",
    title: "Understanding your acne treatment",
    summary: "What causes acne, how long treatment takes, early side effects, daily care and why maintenance matters.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Acne starts in the pores. Oil and dead skin cells plug a pore, bacteria that normally live on the skin grow inside it, and the skin around it gets inflamed (red and swollen). That makes blackheads, whiteheads, red bumps, pus bumps and sometimes deep, painful lumps.\n\nHormones, genes, some medicines and heavy skin or hair products can all play a part. Acne is not caused by dirty skin, and scrubbing does not help.",
      },
      {
        heading: "What to expect from treatment",
        body: "Acne treatment works slowly because it prevents new spots rather than drying up the ones you have.\n\n- Most people start to see a change at 6 to 8 weeks and real improvement at about 12 weeks.\n- In the first few weeks, skin can be dry, red or flaky, and some people have a short burst of new spots. This usually settles.\n- Use your treatment on the whole area where you break out, not just on single spots.\n- Once your skin is clear, keep going with a maintenance plan. Stopping completely often lets acne come back.",
      },
      {
        heading: "Caring for your skin",
        body: "- Wash twice a day and after sweating with a gentle cleanser and your fingertips. Pat dry.\n- Use a moisturizer and sunscreen labeled non-comedogenic (won't clog pores).\n- Don't pick, pop or squeeze. It makes spots last longer and can leave dark marks or scars.\n- Skip scrubs, rough cloths and harsh toners.\n- Benzoyl peroxide can bleach towels, sheets and clothes. Use white linens if you can.\n- Some acne treatments make you sunburn more easily. Use sunscreen every day.",
      },
      {
        heading: "Medicines and pregnancy",
        body: "Take any acne pill exactly as prescribed. Some antibiotic pills need a full glass of water and should not be taken right before lying down; follow the instructions you were given.\n\nSome acne medicines, including retinoid creams, some antibiotic pills and some hormone-blocking pills, are not safe in pregnancy. Tell us if you are pregnant, trying to get pregnant or breastfeeding.",
      },
      {
        heading: "About dark marks and scars",
        body: "Flat pink, red or brown marks left after a spot heals are not scars. They usually fade over months, faster with daily sunscreen. Pitted or raised scars are different. If you are getting scars, tell us: controlling acne early is the best way to prevent more.",
      },
    ],
    steps: [],
    stopRules: [
      "Redness, burning or peeling that is severe, or doesn't settle after a few days off the treatment.",
      "You become pregnant or are planning a pregnancy.",
      "Deep, painful lumps, or new scars forming.",
      "No improvement after 12 weeks of using your treatment every day as directed.",
      "On an acne pill: a bad headache with vision changes, a new rash, or severe stomach upset.",
    ],
    notes: "",
    sources: [
      "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024 (AAD)",
      'American Academy of Dermatology, "Acne: Tips for managing" (patient education)',
      'American Academy of Dermatology, "Acne: Diagnosis and treatment" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-rosacea",
    name: "Rosacea: overview",
    title: "Living with rosacea",
    summary: "Types of rosacea, common triggers, gentle skin care, sun protection, eye symptoms and treatment options.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Rosacea is a long-lasting skin condition of the face. It often causes flushing (sudden redness), lasting redness, small visible blood vessels, and acne-like bumps. Skin may sting or burn easily. In some people the eyes feel gritty or dry, and over time the nose can thicken.\n\nRosacea is common, especially after age 30. It is not caused by poor hygiene and is not contagious. There is no cure, but treatment controls it well for most people.",
      },
      {
        heading: "Know your triggers",
        body: "Many people find certain things bring on flushing or flares. Common triggers include:\n\n- Sun, heat and hot weather\n- Hot drinks, spicy food and alcohol (especially red wine)\n- Stress and strong emotions\n- Hard exercise\n- Wind and cold\n- Some skin and hair products\n\nTriggers are different for everyone. Keeping a simple diary for a few weeks can show you which ones matter for you.",
      },
      {
        heading: "Caring for your skin",
        body: "- Wash with lukewarm water and a gentle, fragrance-free cleanser. Pat dry.\n- Moisturize every day. Let medicine dry first if you use a cream.\n- Use broad-spectrum SPF 30 or higher daily. Mineral sunscreens (zinc oxide or titanium dioxide) are often less stinging.\n- Avoid scrubs, rough cloths, alcohol-based toners, menthol, camphor and witch hazel.\n- Test a new product on a small patch first.\n- A hat, shade and cooling off quickly help with flushing.",
      },
      {
        heading: "Treatment options",
        body: "Treatment depends on what bothers you most.\n\n- Bumps: prescription creams or gels, and sometimes a low-strength antibiotic pill taken for its anti-inflammatory effect.\n- Redness and flushing: some creams calm redness for several hours. Laser or light treatments can reduce visible blood vessels.\n- Eyes: warm compresses, gentle eyelid cleaning and sometimes an eye doctor visit.\n\nMost treatments take 8 to 12 weeks to show their full effect. Many people need ongoing treatment to keep rosacea calm. Some rosacea pills are not used in pregnancy, so tell us if you are pregnant or trying.",
      },
    ],
    steps: [],
    stopRules: [
      "Eye pain, red or gritty eyes that don't settle, sensitivity to light, or any change in vision.",
      "Burning, stinging or redness that gets worse with treatment instead of better.",
      "Thickening or swelling of the nose or other skin.",
      "No improvement after 12 weeks of using your treatment as directed.",
    ],
    notes: "",
    sources: [
      "Thiboutot D et al. Standard management options for rosacea: the 2019 update by the National Rosacea Society Expert Committee. J Am Acad Dermatol 2020",
      'American Academy of Dermatology, "Rosacea: Tips for managing" (patient education)',
      'National Rosacea Society, "Rosacea triggers" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-atopic-dermatitis-adult",
    name: "Atopic dermatitis (eczema) in adults",
    title: "Managing eczema as an adult",
    summary: "Why eczema flares, bathing and moisturizing, using flare creams safely, newer treatments, and infection warning signs.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Atopic dermatitis is the most common type of eczema. The skin's protective outer layer (the skin barrier) does not hold in water well, so skin gets dry, itchy and irritated easily. Scratching damages the skin more and makes the itch worse.\n\nIt often runs in families and is linked to asthma, hay fever and food allergy. It can last from childhood or start in adulthood. It is not contagious. It tends to come and go, with flares and calmer times.",
      },
      {
        heading: "Common triggers",
        body: "- Dry air, cold weather, or heat and sweating\n- Hot showers and harsh or scented soaps\n- Fragrance in skin, laundry and cleaning products\n- Wool and rough fabrics\n- Stress and poor sleep\n- Dust mites, pollen or pet dander for some people\n\nIf your eczema is in an unusual spot or keeps getting worse despite treatment, an allergy to something touching your skin may be involved. We may suggest patch testing.",
      },
      {
        heading: "Daily skin care",
        body: "- Take a short (5 to 10 minute) lukewarm bath or shower.\n- Use a mild, fragrance-free cleanser only where needed.\n- Pat dry and put on moisturizer within 3 minutes, while skin is still damp.\n- Moisturize at least twice a day, all over, even when your skin is clear.\n- Thick creams and ointments work better than lotions.\n- Wear soft, breathable fabrics like cotton.\n- Keep nails short. Try pressing or cooling an itchy spot instead of scratching.",
      },
      {
        heading: "Using your treatment",
        body: "Flare creams calm red, itchy patches. Use them exactly as prescribed: on active patches only and for the length of time we discussed. Used this way, steroid creams are safe. Overuse on the same spot for a long time can thin the skin.\n\nNon-steroid creams can be used on the face, eyelids and folds, and some can be used to prevent flares. For eczema that stays moderate or severe, there are other options, such as light therapy, injections and pills. Ask us if your eczema is not well controlled.",
      },
    ],
    steps: [
      {
        label: "Moisturizer (every day)",
        slot: "both",
        kind: "otc",
        search: "fragrance-free moisturizer",
        directions: "At least twice a day, all over, and within 3 minutes of bathing. A thick, fragrance-free cream or ointment works best.",
      },
      {
        label: "Gentle cleanser",
        slot: "pm",
        kind: "otc",
        search: "gentle cleanser",
        directions: "A short lukewarm bath or shower. Use a fragrance-free cleanser only where needed, then pat dry.",
      },
    ],
    stopRules: [
      "Signs of infection: yellow crusts, pus, spreading redness, or fever.",
      "Painful clusters of small punched-out sores or blisters on eczema (call the same day).",
      "Thinning skin, stretch marks or easy bruising where you use a steroid cream.",
      "No improvement after 2 weeks of your flare treatment, or flares that come back quickly.",
      "Itch is keeping you awake most nights or affecting work or mood.",
    ],
    notes: "",
    sources: [
      "Sidbury R et al. Guidelines of care for the management of atopic dermatitis in adults with topical therapies. J Am Acad Dermatol 2023 (AAD)",
      "Davis DMR et al. Guidelines of care for the management of atopic dermatitis in adults with phototherapy and systemic therapies. J Am Acad Dermatol 2024 (AAD)",
      'American Academy of Dermatology, "Eczema types: Atopic dermatitis self-care" (patient education)',
      'National Eczema Association, "Atopic dermatitis" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-allergic-contact-dermatitis",
    name: "Allergic contact dermatitis and patch-test results",
    title: "Living with a skin allergy: your patch-test results",
    summary: "What a contact allergy is, what positive patch tests mean day to day, how to read ingredient labels, and how long healing takes.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Allergic contact dermatitis is an itchy rash caused by an allergy to something that touches your skin. Common causes include fragrance, preservatives, nickel, hair dye, rubber chemicals, some glues and some ingredients in creams and medicines.\n\nThe rash usually appears 1 to 3 days after contact, sometimes later. That delay is why the cause is often hard to spot. Once you are allergic to something, the allergy usually lasts for life. You can be allergic to a product you have used for years without problems.",
      },
      {
        heading: "What your patch-test results mean",
        body: "Each positive result is a chemical your skin reacted to. Not every positive explains your rash. We will go over which ones are likely relevant to you.\n\n- You will need to avoid each relevant allergen for good, not just during flares.\n- Very small amounts can be enough to cause a rash.\n- Some allergens have several names, or are related to other chemicals that can also cause a reaction.\n- A negative result means you are unlikely to be allergic to that chemical. It does not rule out allergy to things that were not tested.\n- Keep your results list and bring it to other doctors, dentists and hair stylists.",
      },
      {
        heading: "Reading labels",
        body: "- Read the full ingredient list every time, even on products you have bought before. Formulas change.\n- Words like hypoallergenic, natural, organic, dermatologist-tested and sensitive skin do not mean a product is free of your allergen.\n- Unscented products can still contain a masking fragrance. Look for fragrance-free, and still check the list.\n- Plant extracts and essential oils can contain fragrance chemicals.\n- Check everything that touches your skin: soap, shampoo, conditioner, makeup, sunscreen, wipes, creams, laundry products and medicines.\n- If you have a safe-product list from us, start with it.",
      },
      {
        heading: "What to expect",
        body: "Once you fully avoid your allergen, the rash usually improves over several weeks. It can take 6 weeks or longer to clear completely. A short course of a prescribed cream may help while it heals.\n\nIf your rash keeps coming back, look again at all your products, hobbies and workplace exposures. Gloves help with many work exposures, but some allergens pass through certain glove materials. Ask us which gloves suit your allergen.",
      },
    ],
    steps: [],
    stopRules: [
      "No improvement after 6 to 8 weeks of strict avoidance.",
      "The rash spreads, blisters or affects your eyelids or face badly.",
      "Signs of infection: yellow crusts, pus, spreading redness or fever.",
      "You are unsure whether a product, medicine or work material contains your allergen.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Contact dermatitis: Diagnosis and treatment" (patient education)',
      "American Contact Dermatitis Society, patient resources and Contact Allergen Management Program (safe-product lists)",
      'DermNet, "Allergic contact dermatitis" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-irritant-contact-dermatitis",
    name: "Irritant contact dermatitis",
    title: "Irritant skin rash: protecting your skin",
    summary: "How wet work, soaps and chemicals damage the skin barrier, protecting skin at home and work, and healing time.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Irritant contact dermatitis is a rash caused by something that damages the skin's outer layer. It is not an allergy. It can happen to anyone with enough exposure.\n\nCommon causes are frequent hand washing, water, soaps, detergents, cleaning products, solvents, oils, friction and some foods. Harsh chemicals can cause a rash quickly. Milder irritants cause it slowly, after days or weeks of repeated contact. It is very common in health care, cleaning, food work, hairdressing, construction and parenting young children.",
      },
      {
        heading: "What to expect",
        body: "Skin may be dry, red, cracked, scaly or sore, and it can burn or sting more than it itches. Once the skin barrier is damaged, it takes time to repair, often weeks to months, even after the cause is removed. It can flare again quickly with new exposure, so protection needs to continue after the skin looks better.",
      },
      {
        heading: "Protecting your skin",
        body: "- Wear waterproof gloves for wet work and cleaning. Cotton liners underneath help with sweat.\n- Keep glove use short, and take gloves off if water gets inside.\n- Use lukewarm water and a mild, fragrance-free cleanser. Rinse well and pat dry.\n- Moisturize after every wash and before bed. Thick, fragrance-free creams or ointments work best.\n- Use tools instead of hands for solvents, oils and harsh cleaners.\n- Take rings off for washing and wet work. Soap trapped under rings is a common cause.\n- Barrier creams are not a substitute for gloves.",
      },
      {
        heading: "Helpful tips",
        body: "If the rash keeps coming back despite good protection, or it spreads to places that did not touch the irritant, you may also have a contact allergy. We may suggest patch testing.\n\nIf your rash is related to your job, talk with us about a note for your workplace about gloves or changes to your tasks.",
      },
    ],
    steps: [],
    stopRules: [
      "Deep, painful cracks, bleeding, or skin that weeps.",
      "Signs of infection: yellow crusts, pus, spreading redness or fever.",
      "The rash spreads beyond the area that touched the irritant.",
      "No improvement after 4 weeks of protecting your skin and using your treatment.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Contact dermatitis: Diagnosis and treatment" (patient education)',
      'DermNet, "Irritant contact dermatitis" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-hand-eczema",
    name: "Hand eczema",
    title: "Caring for hand eczema",
    summary: "Causes of hand eczema, hand washing and glove tips, overnight moisturizing, and using prescribed creams.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Hand eczema is a red, dry, itchy, cracked or blistered rash on the hands. It is very common. It can be caused by irritation from water and soap, by an allergy to something you touch, by the tendency to eczema, or a mix of these.\n\nHands are hard to rest, so hand eczema can last a long time. Protecting your skin every day is the most important part of treatment.",
      },
      {
        heading: "Washing your hands",
        body: "- Use lukewarm water, not hot.\n- Use a mild, fragrance-free soap or soap substitute. Rinse it off well.\n- Pat dry gently, including between the fingers.\n- Moisturize right after washing, every time.\n- When your hands are not visibly dirty, an alcohol hand sanitizer is often gentler than soap and water. It may sting on cracked skin.\n- Take rings off before washing and wet work.",
      },
      {
        heading: "Protecting your hands",
        body: "- Wear waterproof gloves for dishes, cleaning, hair washing, peeling fruit and vegetables, and other wet work.\n- Put thin cotton gloves on underneath, and change them when damp.\n- Wear warm gloves outside in cold weather.\n- Wear work gloves for gardening, building or handling chemicals.\n- At bedtime, put on a thick layer of ointment and cover with cotton gloves overnight.\n- Keep a tube of moisturizer by every sink, in your bag and at work.",
      },
      {
        heading: "Using your treatment",
        body: "Use any prescribed cream or ointment exactly as directed, usually on the rash only and for a set time. Keep moisturizing even when the eczema clears.\n\nHand eczema often improves slowly, over weeks. If your rash does not improve, we may suggest patch testing to look for an allergy, or other treatments such as light therapy or pills.",
      },
    ],
    steps: [
      {
        label: "Hand moisturizer",
        slot: "both",
        kind: "otc",
        search: "fragrance-free hand cream",
        directions: "After every hand wash and whenever your hands feel dry. A thick, fragrance-free cream or ointment.",
      },
      {
        label: "Overnight ointment",
        slot: "pm",
        kind: "otc",
        search: "petrolatum",
        directions: "At bedtime, a thick layer on both hands, then cotton gloves overnight.",
      },
    ],
    stopRules: [
      "Deep, painful cracks, or cracks that bleed.",
      "Signs of infection: yellow crusts, pus, increasing pain, spreading redness or fever.",
      "Painful clusters of small punched-out sores or blisters.",
      "No improvement after 4 weeks of your treatment and hand protection.",
      "Your hand eczema is making it hard to work.",
    ],
    notes: "",
    sources: [
      "Thyssen JP et al. Guidelines for diagnosis, prevention, and treatment of hand eczema. Contact Dermatitis 2022 (European Society of Contact Dermatitis)",
      'American Academy of Dermatology, "Hand eczema: How to treat" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-seborrheic-dermatitis",
    name: "Seborrheic dermatitis: overview",
    title: "Understanding seborrheic dermatitis",
    summary: "Dandruff and flaky red patches on the scalp, face and chest: causes, medicated shampoos and keeping it under control.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Seborrheic dermatitis is a common rash that causes flaking and redness in oily areas: the scalp (dandruff), eyebrows, sides of the nose, behind the ears, beard area and center of the chest. It can itch.\n\nIt is linked to a yeast that normally lives on everyone's skin, along with the skin's reaction to it. It is not caused by poor hygiene, is not an allergy and is not contagious.",
      },
      {
        heading: "What to expect",
        body: "Seborrheic dermatitis tends to come and go. It is often worse in winter, in dry air, and with stress or lack of sleep. Treatment controls it well, but it usually comes back if you stop completely. Most people do best with a regular maintenance routine.",
      },
      {
        heading: "Using medicated shampoo",
        body: "Shampoos with ketoconazole, selenium sulfide, zinc pyrithione, salicylic acid or coal tar can help. Use them as directed on the label or by us.\n\n- Lather into the scalp, not just the hair.\n- Leave the lather on for about 5 minutes, then rinse.\n- The same lather can be used on the beard, eyebrows, face and chest. Rinse well.\n- Use it more often during a flare. Once it clears, keep using it about once a week.\n- Switching between two types of shampoo can help if one stops working.\n- Coal tar and selenium sulfide can discolor light or color-treated hair.",
      },
      {
        heading: "Helpful tips",
        body: "- Soften thick scalp scale with a little oil before washing, then shampoo it out.\n- Don't scratch or pick at scale.\n- Wash your face with a gentle cleanser and use a light, fragrance-free moisturizer.\n- Use any prescribed cream only as directed. Steroid creams on the face are usually for short courses only.\n- Shaving a beard often helps beard-area flares.",
      },
    ],
    steps: [
      {
        label: "Medicated shampoo",
        slot: "as-directed",
        kind: "otc",
        search: "dandruff shampoo",
        directions: "As directed on the label: lather into the scalp and other flaky areas, leave on about 5 minutes, then rinse. Once clear, about once a week to keep it away.",
      },
    ],
    stopRules: [
      "No improvement after 4 weeks of regular treatment.",
      "Hair loss, or thick, crusted scale that keeps coming back.",
      "Rash on the eyelids that makes your eyes red, sore or gritty.",
      "Thinning skin or new redness where you use a steroid cream.",
    ],
    notes: "",
    sources: [
      "Clark GW, Pope SM, Jaboori KA. Diagnosis and treatment of seborrheic dermatitis. Am Fam Physician 2015",
      'American Academy of Dermatology, "Seborrheic dermatitis: Self-care" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-psoriasis",
    name: "Psoriasis: overview",
    title: "Living with psoriasis",
    summary: "What psoriasis is, triggers, skin care, joint symptoms to watch for, linked health conditions and treatment options.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Psoriasis is a long-term condition where the immune system speeds up the growth of skin cells. This causes thick, red or dark patches with silvery or white scale, often on the elbows, knees, scalp, lower back and nails. It can itch or hurt.\n\nPsoriasis is not contagious. It often runs in families. There is no cure, but many effective treatments can clear or nearly clear the skin for most people.",
      },
      {
        heading: "Common triggers",
        body: "- Stress\n- Infections, especially strep throat\n- Injury to the skin, such as cuts, scrapes, tattoos or sunburn (new patches can form there)\n- Cold, dry weather\n- Smoking and heavy drinking\n- Some medicines. Tell us about all medicines you take, and do not stop a prescribed medicine without asking the doctor who prescribed it.",
      },
      {
        heading: "Caring for your skin",
        body: "- Moisturize every day, especially after bathing. Thick creams and ointments help soften scale.\n- Take lukewarm baths or showers. Soaking can soften scale; pat dry afterwards.\n- Don't scratch, pick or scrape off scale. This can cause new patches.\n- Medicated shampoos with salicylic acid or coal tar can help the scalp.\n- Small amounts of sun can help some people, but sunburn can trigger flares. Ask us before using sun or tanning as treatment.",
      },
      {
        heading: "Your whole health",
        body: "Psoriasis affects more than the skin. Some people get psoriatic arthritis: joint pain, swelling or stiffness, especially in the morning, or a swollen finger or toe. Finding it early helps prevent joint damage.\n\nPeople with psoriasis also have a higher chance of heart disease, diabetes, high blood pressure and depression. Regular checkups with your primary care doctor, staying active, not smoking and limiting alcohol all help.",
      },
      {
        heading: "Treatment options",
        body: "Treatment depends on how much skin is involved and how it affects your life. Options include prescription creams and foams, light therapy, pills, and injected medicines called biologics. Use your treatment exactly as prescribed.\n\nIf you take a medicine that affects the immune system, tell us about any infection, surgery, pregnancy plans or new vaccines.",
      },
    ],
    steps: [],
    stopRules: [
      "Joint pain, swelling or morning stiffness, or a swollen finger or toe.",
      "Redness that spreads over most of your body, or new pus bumps on red skin (get seen the same day).",
      "On a pill or injection: fever, cough, burning when you urinate, or any infection that isn't getting better.",
      "No improvement after 8 weeks of using your treatment as directed.",
      "Feeling low, anxious or hopeless.",
    ],
    notes: "",
    sources: [
      "Elmets CA et al. Joint AAD-NPF guidelines of care for the management and treatment of psoriasis with topical therapy and alternative medicine modalities. J Am Acad Dermatol 2021",
      "Menter A et al. Joint AAD-NPF guidelines of care for the management and treatment of psoriasis with biologics. J Am Acad Dermatol 2019",
      'American Academy of Dermatology, "Psoriasis: Tips for managing" (patient education)',
      'National Psoriasis Foundation, "About psoriasis" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-hidradenitis-suppurativa",
    name: "Hidradenitis suppurativa (HS)",
    title: "Living with hidradenitis suppurativa",
    summary: "What HS is, flare care, daily habits that help, treatment options, and support.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Hidradenitis suppurativa (HS) is a long-term condition that causes painful lumps, boils and tunnels under the skin. It usually affects areas where skin rubs together: the armpits, groin, buttocks, inner thighs and under the breasts.\n\nHS starts in the hair follicles. It is not caused by poor hygiene and is not contagious. It often runs in families. It tends to come and go in flares. Treatment can reduce flares, pain and scarring, and starting early helps most.",
      },
      {
        heading: "During a flare",
        body: "- Warm compresses for 10 minutes a few times a day can ease pain.\n- Do not squeeze, pop or cut lumps yourself.\n- Cover draining areas with soft, absorbent dressings that don't stick. Change them when wet.\n- Over-the-counter pain relievers can help if they are safe for you. Use them as directed on the label.\n- Some flares can be treated in our office with an injection or by draining a lump.",
      },
      {
        heading: "Daily habits that help",
        body: "- Wash affected areas with an antiseptic wash such as benzoyl peroxide or chlorhexidine, if we suggest it. Benzoyl peroxide can bleach fabric.\n- Wear loose, soft, breathable clothing and underwear.\n- Reduce shaving in affected areas, or trim instead. Ask us about laser hair removal.\n- If you smoke, quitting is one of the most helpful things you can do for HS.\n- For people with extra weight, weight loss can lessen flares.\n- Keep skin folds cool and dry.",
      },
      {
        heading: "Treatment options",
        body: "Treatment is matched to how active your HS is. Options include antiseptic washes, antibiotic creams or pills, hormone treatments, injected biologic medicines and other immune-calming pills. Procedures can remove tunnels and scarred areas that keep coming back.\n\nUse all treatment exactly as prescribed. Some HS medicines are not safe in pregnancy, so tell us if you are pregnant or planning to be.\n\nHS can be hard to live with. If it affects your mood, relationships or work, please tell us. Support groups can help too.",
      },
    ],
    steps: [],
    stopRules: [
      "A lump that is very painful, growing fast, or has red, warm skin spreading around it.",
      "Fever or chills with a flare.",
      "New flares despite treatment, or new draining tunnels.",
      "On a biologic or other immune medicine: signs of infection or a cough that won't go away.",
      "Feeling low, anxious or hopeless.",
    ],
    notes: "",
    sources: [
      "Alikhan A et al. North American clinical management guidelines for hidradenitis suppurativa. J Am Acad Dermatol 2019 (Parts I and II)",
      'American Academy of Dermatology, "Hidradenitis suppurativa: Self-care" (patient education)',
      'Hidradenitis Suppurativa Foundation, "What is HS?" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-urticaria",
    name: "Hives (urticaria)",
    title: "Understanding hives",
    summary: "Short-term and chronic hives, common triggers, how to take antihistamines, and when swelling needs urgent care.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Hives are raised, itchy welts on the skin. Each welt usually fades within 24 hours without leaving a mark, while new ones may appear elsewhere. Some people also get deeper swelling of the lips, eyelids, hands or feet, called angioedema.\n\nHives are caused by a chemical called histamine being released in the skin. They are not contagious.",
      },
      {
        heading: "Short-term and long-term hives",
        body: "Hives that last less than 6 weeks are called acute. They often follow a virus or cold, and sometimes a food, medicine or insect sting.\n\nHives that keep coming back for more than 6 weeks are called chronic. In most adults with chronic hives, no outside cause is found. The immune system is set off from within. Allergy testing is usually not helpful for chronic hives. The good news is that chronic hives often go away on their own over time, and treatment controls them well while they last.",
      },
      {
        heading: "Taking your antihistamine",
        body: "Non-drowsy antihistamines are the main treatment.\n\n- Take it every day, not just when hives appear. Daily use works much better for chronic hives.\n- Take it as directed on the label, or as we told you. Sometimes we advise taking more than the label says. Only do this if we have told you to.\n- Tell us if you are pregnant or breastfeeding so we can choose the best option.\n- If antihistamines are not enough, other prescription treatments, including an injection, can help.",
      },
      {
        heading: "Helpful tips",
        body: "Things that can make hives worse:\n\n- Heat, hot showers and sweating\n- Tight clothing, belts and pressure on the skin\n- Alcohol\n- Stress\n- Aspirin and anti-inflammatory pain relievers such as ibuprofen and naproxen. Ask us before stopping a medicine another doctor prescribed.\n\nCool compresses and loose, light clothing can ease itch. Taking photos of your hives can help us at your next visit.",
      },
    ],
    steps: [],
    stopRules: [
      "Single welts that last more than 24 to 48 hours, burn more than itch, or leave bruise-like marks.",
      "Hives with fever, joint pain or feeling unwell.",
      "Hives that are not controlled by your antihistamine, or that disturb your sleep.",
      "Swelling of the eyelids, hands or feet that keeps coming back.",
      "Hives that started after a new medicine.",
    ],
    notes: "",
    sources: [
      "Zuberbier T et al. The international EAACI/GA2LEN/EuroGuiDerm/APAAACI guideline for the definition, classification, diagnosis, and management of urticaria. Allergy 2022",
      'American Academy of Dermatology, "Hives: Diagnosis and treatment" (patient education)',
      'American Academy of Allergy, Asthma & Immunology, "Hives (urticaria)" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-lichen-planus",
    name: "Lichen planus",
    title: "Understanding lichen planus",
    summary: "Skin, mouth, genital, scalp and nail lichen planus: what to expect, mouth care and follow-up.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Lichen planus is an inflammatory condition where the immune system attacks the skin or the lining of the mouth or genitals. It is not contagious and is not caused by anything you did.\n\n- Skin: flat, itchy, purple or dark bumps, often on the wrists, ankles and lower back.\n- Mouth: white, lacy patches inside the cheeks, or red, sore areas.\n- Genitals: white patches, soreness or sores.\n- Scalp and nails: patchy hair loss, or thin, ridged or split nails.\n\nSometimes a medicine causes a similar rash. Tell us about all medicines you take. We may also check your blood for hepatitis C, which is linked to lichen planus.",
      },
      {
        heading: "What to expect",
        body: "Lichen planus on the skin often clears on its own, usually within about 1 to 2 years. Treatment helps with itch and speeds healing. Dark marks often remain after the bumps flatten. They fade slowly over months.\n\nLichen planus in the mouth, genitals, scalp or nails tends to last longer and may need ongoing treatment. Treating the scalp early can help prevent permanent hair loss.",
      },
      {
        heading: "Caring for your skin and mouth",
        body: "- Use your prescribed treatment exactly as directed.\n- Use gentle, fragrance-free soap and moisturize daily.\n- Try not to scratch. Cool compresses can ease itch.\n- For mouth lichen planus: brush gently with a soft toothbrush and keep up with dental checkups.\n- A mild toothpaste without strong flavors may sting less.\n- Avoid foods that sting, such as spicy, salty, acidic or crunchy foods, during flares.\n- Avoid tobacco and limit alcohol.",
      },
      {
        heading: "Follow-up",
        body: "Lichen planus in the mouth or genitals needs regular checks, because over many years there is a small increased risk of skin cancer in long-lasting sore areas. Keep your follow-up visits, and show us or your dentist any area that changes.",
      },
    ],
    steps: [],
    stopRules: [
      "A sore, lump or thickened area in the mouth or genitals that doesn't heal within 3 weeks.",
      "Mouth pain that makes it hard to eat or drink.",
      "Pain with urination or sex, or genital sores.",
      "New patchy hair loss or nail changes.",
      "Itch or rash that keeps getting worse despite treatment.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Lichen planus: Diagnosis and treatment" (patient education)',
      'British Association of Dermatologists, "Lichen planus" (patient information leaflet)',
      'DermNet, "Lichen planus" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-lichen-sclerosus",
    name: "Lichen sclerosus",
    title: "Understanding lichen sclerosus",
    summary: "Genital lichen sclerosus: symptoms, long-term steroid ointment use, gentle care, and why regular checks matter.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Lichen sclerosus is a long-term inflammatory skin condition. It most often affects the skin of the vulva and around the anus, and in men the foreskin and tip of the penis. It can occur at any age.\n\nThe skin may look white, shiny, thin or wrinkled, and can itch, tear, bruise or hurt. Some people have pain with sex or when urinating.\n\nIt is not an infection, not a sexually transmitted disease and not contagious. It is not caused by poor hygiene.",
      },
      {
        heading: "Treatment",
        body: "The main treatment is a strong steroid ointment, used exactly as prescribed. It is safe on this skin when used as directed, and it works well for most people.\n\n- Usually there is a first course to calm the skin, then a lower amount to keep it calm.\n- Many people need some ointment for the long term, even when the skin feels better.\n- Treatment relieves symptoms and helps prevent scarring and changes in the shape of the skin.\n- Use a fingertip amount only, unless we told you otherwise.",
      },
      {
        heading: "Gentle care",
        body: "- Wash with plain water or a soap substitute. Avoid soap, bubble bath, scented wipes and douches.\n- Pat dry gently.\n- A plain barrier ointment such as petroleum jelly can protect the skin, and can be put on before urinating if urine stings.\n- Wear loose cotton underwear and avoid tight clothing.\n- Use a water-based lubricant for sex if helpful.\n- Don't scratch. A cool compress can ease itch.",
      },
      {
        heading: "Why regular checks matter",
        body: "Over many years, people with genital lichen sclerosus have a small increased risk of skin cancer in the affected area. Keeping the condition well controlled is thought to lower this risk.\n\nWe will usually see you at least once a year once it is stable. Look at the area with a hand mirror from time to time so you notice any changes.",
      },
    ],
    steps: [],
    stopRules: [
      "A lump, thickened patch, or sore that doesn't heal with treatment.",
      "Bleeding, or new pain that doesn't settle with your ointment.",
      "Trouble passing urine, or a weak or spraying stream.",
      "Pain with sex, or narrowing of the skin opening.",
      "Itch that comes back despite using the ointment as directed.",
    ],
    notes: "",
    sources: [
      "Lewis FM et al. British Association of Dermatologists guidelines for the management of lichen sclerosus. Br J Dermatol 2018",
      'British Association of Dermatologists, "Lichen sclerosus" (patient information leaflet)',
      'American Academy of Dermatology, "Lichen sclerosus: Diagnosis and treatment" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-perioral-dermatitis",
    name: "Perioral dermatitis",
    title: "Understanding perioral dermatitis",
    summary: "Small red bumps around the mouth, nose or eyes: common causes including steroid creams, stopping heavy products, and treatment time.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Perioral dermatitis is a rash of small red or skin-colored bumps, sometimes with tiny pus bumps or flaking, around the mouth. It can also appear around the nose and eyes. There is often a thin clear band of skin right next to the lips. It may burn or itch.\n\nIt is not contagious. A common cause is steroid creams on the face. Steroid nasal sprays and inhalers, heavy creams and makeup can also play a part.",
      },
      {
        heading: "What to expect",
        body: "- If you have been using a steroid cream on your face, we will usually ask you to stop it. Follow our instructions on how.\n- The rash often gets worse for a few weeks after stopping a steroid. This is expected. Do not restart the steroid cream.\n- Prescription treatment may be a cream or gel, and sometimes an antibiotic pill taken for its anti-inflammatory effect.\n- Improvement usually takes several weeks, and clearing can take 2 to 3 months.\n- It can come back, so keep your routine simple.\n\nSome treatment pills are not used in pregnancy. Tell us if you are pregnant or breastfeeding.",
      },
      {
        heading: "Caring for your skin",
        body: "- Keep your routine to the minimum: a gentle cleanser with lukewarm water, and your prescribed treatment.\n- Stop heavy creams, ointments, face oils, foundation and powders on the rash, unless we told you otherwise.\n- If your skin is dry, use only a light, fragrance-free moisturizer we have okayed.\n- Avoid scrubs and products with fragrance.\n- Don't put steroid creams on your face, including over-the-counter hydrocortisone, unless we prescribe it.\n- If you use a steroid nasal spray or inhaler, rinse your mouth and wipe your face after use. Don't stop it without asking your doctor.",
      },
    ],
    steps: [],
    stopRules: [
      "The rash is spreading or very uncomfortable after stopping a steroid cream.",
      "Rash near the eyes with eye pain, redness or blurred vision.",
      "No improvement after 8 weeks of treatment.",
      "On a pill for this: severe headache, vision changes, or a new rash after sun exposure.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Perioral dermatitis: Diagnosis and treatment" (patient education)',
      'DermNet, "Periorificial dermatitis" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-folliculitis",
    name: "Folliculitis",
    title: "Understanding folliculitis",
    summary: "Inflamed hair follicles from bacteria, yeast, hot tubs or shaving: home care, prevention and when a bump may be a boil.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Folliculitis is inflammation of the hair follicles, the tiny openings that hairs grow from. It looks like small red bumps or pus bumps around hairs, and can itch or feel tender. Common causes include:\n\n- Bacteria on the skin\n- Yeast, often itchy bumps on the chest, back and shoulders\n- Hot tubs or pools that are not well cleaned, a few days after use\n- Shaving, waxing or tight clothing that rubs\n- Sweat and heat\n\nMild folliculitis often clears in a week or two with good care. Some types keep coming back and need treatment.",
      },
      {
        heading: "Caring for it at home",
        body: "- Put a warm, wet cloth on the area for 10 to 15 minutes a few times a day.\n- Wash with a gentle cleanser, or an antibacterial wash such as benzoyl peroxide if we suggested it. Benzoyl peroxide can bleach fabric.\n- Don't squeeze, pick or scratch the bumps.\n- Use your own towel and washcloth and wash them in hot water.\n- Use any prescribed cream, wash or pill exactly as directed.",
      },
      {
        heading: "Preventing it",
        body: "- Shower soon after sweating or exercise.\n- Wear loose, breathable clothing.\n- Shave less often, or use an electric razor or trimmer. Shave in the direction the hair grows, with a clean, sharp blade and shaving gel.\n- Don't share razors or towels.\n- Avoid hot tubs that may not be well kept. Shower after using one.\n- For yeast folliculitis, an antifungal wash may help keep it away.",
      },
      {
        heading: "Boils",
        body: "Sometimes infection goes deeper and forms a boil: a painful, swollen lump that may fill with pus. Warm compresses can help it drain on its own. Do not cut or squeeze a boil. If you keep getting boils, tell us. We may test for the type of bacteria and suggest steps for you and your household.",
      },
    ],
    steps: [],
    stopRules: [
      "A painful lump that is growing, or a boil larger than a pea.",
      "Redness, warmth or swelling spreading around the bumps, or fever.",
      "Bumps that keep coming back, or boils in you or others at home.",
      "No improvement after 2 weeks of home care or your treatment.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Folliculitis" (patient education)',
      'DermNet, "Folliculitis" (patient information)',
      'American Academy of Dermatology, "Razor bumps: How to get rid of them" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-intertrigo",
    name: "Intertrigo (skin-fold rash)",
    title: "Caring for rash in skin folds",
    summary: "Rash in skin folds from rubbing, heat and moisture; keeping folds dry, barrier creams and signs of yeast or bacterial infection.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Intertrigo is a rash in places where skin touches skin: under the breasts, in the groin, armpits, belly folds, between the buttocks and between the toes. Rubbing, heat, sweat and trapped moisture irritate the skin. The skin becomes red, raw, itchy or sore, and may smell or ooze.\n\nWarm, moist skin is also a good home for yeast and bacteria, so the rash can become infected. It is more common in hot weather, with diabetes, with extra body weight, and in people who are less mobile.",
      },
      {
        heading: "What to expect",
        body: "Intertrigo usually improves within 1 to 2 weeks once the folds are kept dry and treatment is started. If yeast or bacteria are involved, we may prescribe an antifungal or antibacterial cream, or a short course of a mild anti-inflammatory cream. Use it exactly as prescribed. Because the folds stay the same, the rash can come back, so daily prevention matters.",
      },
      {
        heading: "Caring for it at home",
        body: "- Wash folds daily with lukewarm water and a gentle, fragrance-free cleanser. Rinse well.\n- Dry thoroughly. Pat gently, or use a hair dryer on the cool setting.\n- Keep folds apart with a thin layer of soft cotton or a moisture-wicking fabric made for skin folds.\n- A thin layer of zinc oxide or petrolatum barrier cream can protect raw skin.\n- Wear loose, breathable clothing, and change out of damp clothes quickly.\n- Wear a well-fitting, supportive bra if the rash is under the breasts.\n- Avoid scented products, and don't scrub.",
      },
    ],
    steps: [
      {
        label: "Barrier cream",
        slot: "both",
        kind: "otc",
        search: "zinc oxide cream",
        directions: "After washing and drying the fold, a thin layer on irritated skin, as directed on the label.",
      },
    ],
    stopRules: [
      "Bright red, raw skin with small red spots spreading outward (possible yeast infection).",
      "Yellow crusts, pus, a bad smell, or skin that keeps weeping.",
      "Spreading redness, warmth, pain or fever.",
      "No improvement after 2 weeks of keeping the area dry and using your treatment.",
    ],
    notes: "",
    sources: [
      "Kalra MG, Higgins KE, Kinney BS. Intertrigo and secondary skin infections. Am Fam Physician 2014",
      'DermNet, "Intertrigo" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-xerosis-itch",
    name: "Dry skin and itch (xerosis)",
    title: "Relief for dry, itchy skin",
    summary: "Why skin gets dry, bathing and moisturizing habits, what to look for in a moisturizer, itch relief, and when itch needs a check.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Dry skin (xerosis) happens when the skin's outer layer loses water and oils. Skin feels tight, rough, flaky or itchy, and can crack. It is often worst on the lower legs, arms and hands.\n\nIt is very common, especially in winter, in dry indoor heat, and as we get older. Hot showers, harsh soaps and some medicines can make it worse. Scratching dry skin can lead to rashes and more itch.",
      },
      {
        heading: "Bathing",
        body: "- Take short showers or baths, about 5 to 10 minutes.\n- Use lukewarm water, not hot.\n- Use a mild, fragrance-free cleanser, mainly on the underarms, groin and feet. Many areas only need water.\n- Pat dry gently. Don't rub.\n- Put on moisturizer within 3 minutes, while your skin is still damp.",
      },
      {
        heading: "Moisturizing",
        body: "- Moisturize at least once a day, all over, and again whenever skin feels dry.\n- Creams and ointments work better than lotions.\n- Look for fragrance-free products with ingredients such as petrolatum, glycerin, ceramides, shea butter or dimethicone.\n- For very rough, scaly skin, creams with urea or lactic acid can help. They may sting on cracked skin.\n- Use a humidifier in your bedroom in dry weather.",
      },
      {
        heading: "Easing the itch",
        body: "- Keep nails short. Press or pat an itchy spot instead of scratching.\n- A cool, damp cloth can calm itch quickly.\n- Itch-relief creams with pramoxine or menthol can help. Use them as directed on the label.\n- Wear soft, loose fabrics like cotton. Avoid wool against the skin.\n- Use fragrance-free laundry detergent and skip fabric softener.\n- Drink enough water, though skin care matters more than water for dry skin.",
      },
    ],
    steps: [
      {
        label: "Gentle cleanser",
        slot: "pm",
        kind: "otc",
        search: "gentle cleanser",
        directions: "A short lukewarm shower or bath. Use only where needed, then pat dry.",
      },
      {
        label: "Moisturizer",
        slot: "both",
        kind: "otc",
        search: "fragrance-free moisturizer",
        directions: "Within 3 minutes of bathing on damp skin, and at least once more each day. A thick, fragrance-free cream or ointment.",
      },
    ],
    stopRules: [
      "Itch that doesn't improve after 2 weeks of good skin care.",
      "Itch all over without a rash, especially with weight loss, night sweats, fever or tiredness.",
      "Itch that keeps you awake at night.",
      "Deep cracks that bleed, or signs of infection such as pus or spreading redness.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Dry skin: Tips for managing" (patient education)',
      'American Academy of Dermatology, "How to relieve itchy skin" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-stasis-dermatitis",
    name: "Stasis dermatitis and leg swelling",
    title: "Caring for your legs: stasis dermatitis",
    summary: "Poor vein circulation in the legs: swelling, skin changes, elevation, compression, skin care and warning signs.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Stasis dermatitis is a rash on the lower legs caused by poor blood flow in the veins. Valves inside the leg veins normally help push blood back up to the heart. When they weaken, blood and fluid pool in the lower legs.\n\nThis can cause ankle swelling that is worse at the end of the day, itch, scaly or red patches, brown discoloration, varicose veins, and skin that becomes hard or shiny. Without care, the skin can break down into slow-healing sores (leg ulcers).",
      },
      {
        heading: "Reduce swelling",
        body: "- Raise your legs above the level of your heart for about 30 minutes, several times a day, and when you sleep if you can.\n- Walk every day. Moving your calf muscles pumps blood upward.\n- When sitting or standing for long periods, flex your ankles up and down often.\n- Wear compression stockings or wraps if we recommended them. Put them on in the morning before swelling builds. If you have poor circulation in your arteries, diabetes or heart failure, check with us first.\n- Avoid sitting with legs crossed or standing still for long periods.",
      },
      {
        heading: "Caring for your skin",
        body: "- Wash gently with lukewarm water and a fragrance-free cleanser.\n- Moisturize the legs every day. Plain petroleum jelly or a simple fragrance-free cream is best.\n- Skin on the lower legs easily becomes allergic to creams. Avoid products with fragrance, lanolin and antibiotic ointments unless we suggest them.\n- Use prescribed creams for itchy patches exactly as directed.\n- Protect your legs from bumps and scrapes. Even small injuries can turn into slow-healing sores.\n- Don't scratch.",
      },
    ],
    steps: [
      {
        label: "Leg moisturizer",
        slot: "both",
        kind: "otc",
        search: "petrolatum",
        directions: "Once or twice a day, a thin layer on the lower legs, especially after bathing. Plain and fragrance-free.",
      },
    ],
    stopRules: [
      "An open sore or a scrape on the leg that isn't healing.",
      "Sudden swelling of one leg with pain, warmth or a tight calf (get seen the same day).",
      "Red, hot, painful skin that is spreading, or fever.",
      "Swelling with shortness of breath or chest pain: call 911.",
      "A new rash after starting a cream or ointment on your legs.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Stasis dermatitis: Overview" (patient education)',
      'DermNet, "Venous eczema" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-cold-sores",
    name: "Cold sores (herpes simplex)",
    title: "Managing cold sores",
    summary: "How cold sores start, spread and heal; early treatment, triggers, protecting others and before facial procedures.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Cold sores are small, painful blisters on or around the lips, caused by the herpes simplex virus. Most adults carry this virus. After the first infection, the virus stays quietly in the nerves and can wake up from time to time.\n\nAn outbreak often starts with tingling, burning or itching. Blisters appear within a day or so, break open, crust over and usually heal in 1 to 2 weeks without a scar.",
      },
      {
        heading: "Treatment",
        body: "- Prescription antiviral pills work best when started at the first tingle. If you get cold sores often, ask us about keeping a supply at home, or about a daily medicine to prevent them.\n- Over-the-counter docosanol cream can shorten an outbreak a little if started early. Use as directed on the label.\n- Cool compresses and over-the-counter pain relievers can ease discomfort.\n- Keep the sore clean and dry, and use a plain lip balm to keep crusts soft.\n- Don't pick at blisters or crusts.",
      },
      {
        heading: "Protecting others",
        body: "Cold sores are contagious from the first tingle until the skin is fully healed. The virus can also spread when no sore is showing, though less often.\n\n- Don't kiss or have oral sex during an outbreak.\n- Don't share cups, utensils, lip balm, razors or towels.\n- Wash your hands after touching the sore. Avoid touching your eyes.\n- Keep away from newborn babies, people with eczema and people with weak immune systems while you have a sore.",
      },
      {
        heading: "Helpful tips",
        body: "Common triggers include sun, wind, stress, illness, fever, tiredness, menstrual periods, dental work and injury to the lips.\n\n- Wear a lip balm with SPF 30 or higher outdoors.\n- If you are having a laser treatment, peel, filler or other procedure near the mouth, tell us you get cold sores. We may give you medicine to prevent an outbreak.",
      },
    ],
    steps: [],
    stopRules: [
      "Eye pain, redness, light sensitivity or blurred vision during an outbreak (get seen the same day).",
      "Sores spreading over eczema or other broken skin.",
      "A sore that hasn't healed after 2 weeks.",
      "Frequent outbreaks, or a weakened immune system.",
      "Fever or feeling very unwell with a first outbreak.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Herpes simplex: Diagnosis and treatment" (patient education)',
      'NHS, "Cold sores" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-shingles",
    name: "Shingles (herpes zoster)",
    title: "Recovering from shingles",
    summary: "What shingles is, early antiviral treatment, rash and pain care, protecting others, warning signs and the vaccine.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Shingles is a painful rash caused by the chickenpox virus. After chickenpox, the virus stays inactive in the nerves for years. Later, often with age, stress or a weakened immune system, it can wake up.\n\nShingles often starts with burning, tingling or pain on one side of the body. A few days later, a band or patch of blisters appears in the same area. The blisters crust over in about 7 to 10 days, and the rash usually heals in 2 to 4 weeks.",
      },
      {
        heading: "Treatment",
        body: "- Antiviral pills work best when started within 3 days of the rash appearing. Take them exactly as prescribed and finish the course.\n- Pain can be strong. Over-the-counter pain relievers, cool compresses and prescription pain medicine can help. Tell us if your pain is not controlled.\n- Some people have nerve pain that lasts after the rash heals. Early treatment may lower that risk, and there are treatments that help.",
      },
      {
        heading: "Caring for the rash",
        body: "- Keep the rash clean and dry. Wash gently with mild soap and water.\n- Cover blisters with a loose, non-stick dressing.\n- Cool, damp compresses can soothe pain and itch.\n- Wear loose, soft clothing.\n- Don't pick or scratch the blisters.\n- Avoid thick creams or adhesive bandages on open blisters, unless we told you otherwise.",
      },
      {
        heading: "Protecting others",
        body: "You can't give someone shingles, but until all blisters have crusted, you can give chickenpox to someone who has never had chickenpox or the vaccine.\n\n- Keep the rash covered.\n- Wash your hands often.\n- Until the blisters crust over, stay away from pregnant people who have not had chickenpox, newborn babies, and people with weak immune systems.\n\nA shingles vaccine is recommended for most adults aged 50 and older, and for some younger adults with weakened immune systems, even if you have already had shingles. Ask us or your primary care doctor.",
      },
    ],
    steps: [],
    stopRules: [
      "Rash on the forehead, near the eye or on the tip of the nose, or any eye pain, redness or vision change (same day).",
      "Weakness of the face, hearing loss, dizziness, severe headache or confusion (get seen the same day).",
      "Rash spreading beyond one area of the body, or a weakened immune system.",
      "Signs of infection: pus, spreading redness, or fever.",
      "Pain that is not controlled, or pain lasting after the rash has healed.",
    ],
    notes: "",
    sources: [
      'Centers for Disease Control and Prevention, "About Shingles (Herpes Zoster)" (patient information)',
      'Centers for Disease Control and Prevention, "Shingles Vaccination" (patient information)',
      'American Academy of Dermatology, "Shingles: Diagnosis and treatment" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-scabies",
    name: "Scabies (adult and household)",
    title: "Treating scabies in your household",
    summary: "How scabies spreads, treating everyone at once, cleaning bedding and clothes, and why itch can last after treatment.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Scabies is a very itchy rash caused by tiny mites that burrow into the top layer of skin. Itch is often worst at night. The rash is common between the fingers, on the wrists, elbows, waist, buttocks, genitals and around the nipples.\n\nScabies spreads mainly through close skin-to-skin contact that lasts a while, such as living together or sexual contact. It is not a sign of being dirty. Pets do not spread human scabies. Itch can start 2 to 6 weeks after you first get it, so others may have it without symptoms yet.",
      },
      {
        heading: "Treating everyone",
        body: "- Everyone in your household and close contacts, including sexual partners, should be treated at the same time, even if they don't itch.\n- Use your treatment exactly as prescribed. For cream, apply to clean, dry skin over the whole body as directed, usually from the neck down, including between fingers and toes, under nails, and the genitals.\n- Leave it on for the full time on the label, then wash it off.\n- Reapply to hands if you wash them during that time.\n- A second treatment is often needed. Follow the schedule we gave you.\n- Tell us if anyone is pregnant, breastfeeding, or a young child. Some treatments are not used for them.",
      },
      {
        heading: "Cleaning your home",
        body: "On the day of treatment:\n\n- Wash bedding, towels and clothes used in the past 3 days in hot water and dry them on a hot setting.\n- Items that can't be washed can be sealed in a plastic bag for at least 3 days.\n- Vacuum furniture, carpets and car seats.\n\nYou don't need to fumigate your home or treat pets.",
      },
      {
        heading: "What to expect",
        body: "Itch often continues for 2 to 4 weeks after successful treatment. This is the skin calming down, not a sign treatment failed. Cool compresses, moisturizer and an antihistamine can help. Don't re-treat on your own: too much treatment can irritate the skin.",
      },
    ],
    steps: [],
    stopRules: [
      "New burrows or new itchy bumps 2 or more weeks after finishing treatment.",
      "Itch that is getting worse, not better, 4 weeks after treatment.",
      "Sores with pus, crusting or spreading redness.",
      "Thick, crusted skin on anyone in the household, especially an older adult or someone with a weak immune system.",
    ],
    notes: "",
    sources: [
      'Centers for Disease Control and Prevention, "Scabies" (treatment and prevention information)',
      'American Academy of Dermatology, "Scabies: Diagnosis and treatment" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-tinea",
    name: "Tinea: athlete's foot, jock itch and ringworm",
    title: "Treating fungal skin infections",
    summary: "Athlete's foot, jock itch and body ringworm: how they spread, using antifungal creams correctly, and preventing return.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Tinea is a common skin infection caused by a fungus, not a worm. It has different names depending on where it is:\n\n- Athlete's foot: itchy, peeling or cracked skin between the toes or on the soles.\n- Jock itch: an itchy, red rash in the groin and inner thighs.\n- Ringworm: a round, scaly patch on the body, often clearer in the middle with a raised edge.\n\nThe fungus loves warm, damp places. It spreads by touching infected skin, pets (often cats and dogs), or damp floors in locker rooms and showers. It can spread from your feet to other parts of your body.",
      },
      {
        heading: "Treatment",
        body: "- Most tinea on the skin clears with an antifungal cream such as terbinafine, clotrimazole or miconazole. Use as directed on the label, or as we prescribed.\n- Spread the cream over the rash and a little beyond its edge.\n- Keep using it for the full time on the label or that we gave you, even if the rash looks gone sooner. Stopping early lets it come back.\n- If you have athlete's foot and jock itch, treat both at the same time.\n- Don't use steroid creams on a fungal rash unless we prescribed them. They can make it spread.\n- Tinea on the scalp, beard or nails needs prescription treatment.",
      },
      {
        heading: "Preventing it",
        body: "- Dry well after bathing, especially between the toes and in the groin.\n- Wear breathable socks and change them daily, or more often if they get damp.\n- Rotate shoes so each pair can dry out.\n- Wear sandals in locker rooms, public showers and pool areas.\n- Put your socks on before your underwear, so the fungus doesn't travel from feet to groin.\n- Don't share towels, shoes or razors.\n- If a pet has patches of hair loss, have it checked by a vet.",
      },
    ],
    steps: [
      {
        label: "Antifungal cream",
        slot: "as-directed",
        kind: "otc",
        search: "antifungal cream",
        directions: "As directed on the label: on the rash and a little beyond its edge, for the full time on the label even if it looks clear sooner.",
      },
    ],
    stopRules: [
      "No improvement after 2 weeks of using the cream as directed.",
      "The rash spreads, blisters or keeps coming back.",
      "Diabetes or poor circulation with cracked, red, swollen or painful feet.",
      "Red, warm, painful skin that is spreading, or fever.",
      "A rash on the scalp or beard, or thick, discolored nails.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Ringworm: Diagnosis and treatment" (patient education)',
      'American Academy of Dermatology, "Athlete\'s foot: Diagnosis and treatment" (patient education)',
      'Centers for Disease Control and Prevention, "Ringworm" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-tinea-versicolor",
    name: "Tinea versicolor",
    title: "Understanding tinea versicolor",
    summary: "Light or dark spots on the chest and back from a skin yeast: antifungal washes, slow return of skin color, and preventing return.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Tinea versicolor is a common skin condition caused by overgrowth of a yeast that normally lives on everyone's skin. It causes small spots or patches that can be lighter or darker than your skin, or pink. They are usually on the chest, back, shoulders and upper arms, and may be slightly scaly or itchy.\n\nIt is not contagious and is not caused by poor hygiene. It is more common in hot, humid weather, with sweating, and in teens and young adults.",
      },
      {
        heading: "Treatment",
        body: "- Antifungal shampoos with selenium sulfide or ketoconazole can be used as a body wash. Spread on the affected skin, leave on for the time on the label or that we told you, then rinse.\n- Antifungal creams work for small areas.\n- For widespread or stubborn cases, we may prescribe antifungal pills. Tell us about all your medicines, and if you are pregnant or breastfeeding.\n- Use your treatment exactly as directed.",
      },
      {
        heading: "What to expect",
        body: "The yeast is usually cleared within a few weeks. But your skin color can take several months to even out after the yeast is gone. Spots that stay lighter after treatment do not mean the treatment failed.\n\nTanning makes the spots stand out more, because the affected skin doesn't tan the same way. Daily sunscreen helps your skin tone stay even while it recovers.",
      },
      {
        heading: "Preventing it",
        body: "Tinea versicolor often comes back, especially in warm months.\n\n- Use the antifungal wash once or twice a month, or more often in hot weather, if we suggest it.\n- Wear loose, breathable clothing.\n- Shower after sweating.\n- Avoid heavy, oily skin products on the chest and back.",
      },
    ],
    steps: [
      {
        label: "Antifungal body wash",
        slot: "as-directed",
        kind: "otc",
        search: "selenium sulfide shampoo",
        directions: "As directed on the label or by us: spread on affected skin, leave on for the time given, then rinse well.",
      },
    ],
    stopRules: [
      "No improvement in scale or itch after 4 weeks of treatment.",
      "On antifungal pills: yellow skin or eyes, dark urine, stomach pain, or a new rash.",
      "Spots that change or spread despite treatment.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Tinea versicolor: Diagnosis and treatment" (patient education)',
      'DermNet, "Pityriasis versicolor" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-onychomycosis",
    name: "Fungal nail infection (onychomycosis)",
    title: "Treating nail fungus",
    summary: "Fungal nail infection: confirming the diagnosis, pill and topical options, how long nails take, and preventing return.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "A fungal nail infection makes nails thick, discolored (white, yellow or brown), crumbly or lifted from the nail bed. It is much more common in toenails. It often starts with athlete's foot and is more common with age, diabetes and poor circulation.\n\nOther conditions, such as psoriasis or injury to the nail, can look the same. We usually test a nail clipping to confirm fungus before starting treatment.",
      },
      {
        heading: "Treatment options",
        body: "- Antifungal pills work best for many people. We may check blood tests before or during treatment. Take them exactly as prescribed and tell us about all your other medicines.\n- Prescription nail solutions are painted on the nail as directed, usually every day for many months. They work best for mild infections.\n- Over-the-counter nail products rarely cure nail fungus.\n- Treatment is not always needed. If the nail doesn't bother you and you are healthy, waiting is a reasonable choice.\n\nTell us if you are pregnant, planning a pregnancy or breastfeeding.",
      },
      {
        heading: "What to expect",
        body: "Treatment kills the fungus, but the damaged nail does not heal. A healthy nail has to grow out to replace it. Fingernails take about 6 months and toenails 12 to 18 months to grow out fully. You may see clear nail growing in from the base first.\n\nEven after successful treatment, nail fungus often comes back, so prevention matters.",
      },
      {
        heading: "Helpful tips",
        body: "- Treat athlete's foot when you have it.\n- Keep feet clean and dry, and change socks daily.\n- Wear shoes that fit well and rotate pairs so they can dry.\n- Wear sandals in locker rooms and public showers.\n- Trim nails straight across and keep them short. Use separate clippers for infected nails.\n- An antifungal powder in shoes may help prevent return.",
      },
    ],
    steps: [],
    stopRules: [
      "Pain, redness, swelling or pus around a nail.",
      "Diabetes or poor circulation with any foot sore, crack or color change.",
      "On antifungal pills: yellow skin or eyes, dark urine, pale stools, ongoing nausea or stomach pain, or unusual tiredness.",
      "On antifungal pills: a new rash, loss of taste or smell, or low mood.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Nail fungus: Diagnosis and treatment" (patient education)',
      "FDA label: terbinafine tablets (warnings: liver injury, taste and smell disturbance, depressive symptoms)",
      "Lipner SR, Scher RK. Onychomycosis: Treatment and prevention of recurrence. J Am Acad Dermatol 2019",
    ],
    reviewed: false,
  },
  {
    id: "cond-keratosis-pilaris",
    name: "Keratosis pilaris",
    title: "Smoothing keratosis pilaris",
    summary: "Harmless rough bumps on the arms and thighs: gentle care, exfoliating moisturizers and realistic expectations.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Keratosis pilaris (KP) causes small, rough bumps that feel like sandpaper. They are most common on the backs of the upper arms, the thighs, buttocks and sometimes the cheeks. The bumps can be skin-colored, red or brown, and are occasionally itchy.\n\nThe bumps are plugs of keratin, a protein in skin, that block hair follicles. KP is harmless and very common. It often runs in families and is more common with dry skin and eczema.",
      },
      {
        heading: "What to expect",
        body: "There is no cure, but the skin can be made smoother and less red. KP is often worse in winter and better in summer. It often improves with age.\n\nTreatment takes time. It can take several weeks of daily use to notice a difference, and the bumps return if you stop. Think of it as an ongoing routine, like brushing your teeth.",
      },
      {
        heading: "Caring for your skin",
        body: "- Use a gentle, fragrance-free cleanser and lukewarm water.\n- After bathing, while skin is damp, apply a moisturizer containing urea, lactic acid or salicylic acid, as directed on the label. These gently loosen the plugs.\n- They may sting at first, especially on irritated skin. Use them every other day at first if so.\n- On days you don't use it, or if it stings, use a plain fragrance-free moisturizer.\n- Don't scrub hard, pick or squeeze the bumps. It makes redness worse.\n- Use a humidifier in dry weather.\n\nIf we prescribe a retinoid cream, do not use it if you are pregnant or trying to get pregnant.",
      },
    ],
    steps: [
      {
        label: "Exfoliating moisturizer",
        slot: "pm",
        kind: "otc",
        search: "urea lotion",
        directions: "After bathing, on damp skin over the bumpy areas, as directed on the label. If it stings, use it every other day.",
      },
      {
        label: "Gentle cleanser",
        slot: "pm",
        kind: "otc",
        search: "gentle cleanser",
        directions: "Lukewarm water and a fragrance-free cleanser. No scrubbing. Pat dry.",
      },
    ],
    stopRules: [
      "Bumps that become red, sore, filled with pus or spread quickly.",
      "Burning, redness or a rash from your exfoliating cream that doesn't settle after stopping it.",
      "No improvement after 2 to 3 months of daily care.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Keratosis pilaris: Diagnosis and treatment" (patient education)',
      'DermNet, "Keratosis pilaris" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-hyperhidrosis",
    name: "Hyperhidrosis (excessive sweating)",
    title: "Managing excessive sweating",
    summary: "Excessive sweating: causes, using clinical-strength antiperspirant, treatment options from wipes to injections, and daily tips.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body: "Hyperhidrosis means sweating much more than the body needs to stay cool. It most often affects the underarms, palms, soles of the feet or face. It usually starts in childhood or the teen years and often runs in families. It is a medical condition, not a sign of poor hygiene or nerves.\n\nLess often, heavy sweating is caused by another health problem or a medicine. This is more likely if the sweating is all over your body, started in adulthood, or happens during sleep. We may check for these causes.",
      },
      {
        heading: "Using antiperspirant",
        body: "Clinical-strength antiperspirant is usually the first treatment.\n\n- Apply it at bedtime to completely dry skin, then wash it off in the morning. Sweat glands are quiet at night, so it works better.\n- Don't apply it right after shaving or on broken skin.\n- It can also be used on hands and feet.\n- It may itch or sting. Using it less often, or a gentle moisturizer in the morning, can help.\n- Once sweating is controlled, many people only need it a few times a week.",
      },
      {
        heading: "Other treatment options",
        body: "If antiperspirant is not enough, other options include:\n\n- Prescription wipes or creams that block sweat signals. Wash your hands after use and keep away from the eyes.\n- Iontophoresis: soaking hands or feet in water while a gentle electric current passes through.\n- Injections of a muscle-relaxing toxin, which can reduce sweating for several months.\n- Pills that reduce sweating all over the body. They can cause dry mouth, constipation and blurred vision.\n- Procedures for the underarms.\n\nUse all treatments exactly as prescribed. Tell us if you are pregnant or breastfeeding.",
      },
      {
        heading: "Helpful tips",
        body: "- Wear loose, breathable or moisture-wicking fabrics.\n- Choose darker colors or patterns to hide sweat marks, or try underarm shields.\n- Wear moisture-wicking socks and change them during the day. Rotate shoes so they dry out.\n- Absorbent insoles and foot powder help with sweaty feet.\n- Carry a spare shirt or socks if it helps you feel at ease.\n- Sweating can affect confidence and daily life. Let us know how it affects you.",
      },
    ],
    steps: [
      {
        label: "Clinical-strength antiperspirant",
        slot: "pm",
        kind: "otc",
        search: "clinical strength antiperspirant",
        directions: "At bedtime on completely dry skin, as directed on the label. Wash off in the morning. Not on freshly shaved or broken skin.",
      },
    ],
    stopRules: [
      "Heavy sweating that started in adulthood, is all over your body, or soaks your sheets at night.",
      "Sweating with fever, weight loss you can't explain, or a racing heartbeat.",
      "Sweating with chest pain, shortness of breath or feeling faint: call 911.",
      "On a sweat-reducing pill or wipe: blurred vision, eye pain, trouble passing urine, or feeling overheated.",
      "Burning, rash or broken skin from antiperspirant that doesn't settle.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Hyperhidrosis: Diagnosis and treatment" (patient education)',
      "International Hyperhidrosis Society, patient education on treatment options (antiperspirants, iontophoresis, botulinum toxin)",
    ],
    reviewed: false,
  },
];
