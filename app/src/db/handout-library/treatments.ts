// Treatment-use and prevention patient-education handouts for the clinician handout library.
// DRAFTED BY CLAUDE (AI), NOT YET REVIEWED: every handout here goes to the
// dermatologist's approve / edit / cut review (review/handout-library-review.html)
// and shows a "draft" marker until reviewed=true.
import type { HandoutTemplate } from "@/db/handout-templates";

export const TREATMENT_HANDOUTS: HandoutTemplate[] = [
  {
    id: "tx-topical-steroids",
    name: "Topical steroids: using them safely",
    title: "Using your steroid cream or ointment safely",
    summary: "Fingertip units, where to be careful (face, folds), how long to use, tapering, and side effects to watch for.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Topical steroids (corticosteroids) are creams, ointments, lotions and solutions that calm redness, swelling and itch. They come in many strengths, from mild to very strong. We chose the strength for the part of your body being treated.\n\nUsed the way we showed you, they are safe and work well. Using too little, or stopping too soon, is a common reason a rash doesn't get better.",
      },
      {
        heading: "How much to use: the fingertip unit",
        body:
          "A fingertip unit is the amount squeezed from the tube in a line from the tip of an adult's index finger to the first crease. One fingertip unit covers an area about the size of two adult palms (with the fingers together).\n\n- Rub a thin layer in gently until it disappears.\n- Put it only on the rash, not on clear skin, unless we told you otherwise.\n- Wash your hands afterward, unless you are treating your hands.",
      },
      {
        heading: "Face, skin folds and children",
        body:
          "Some skin is thinner and absorbs more medicine: the face, eyelids, armpits, groin, under the breasts and the diaper area. Use only the product we prescribed for these areas.\n\n- Do not use a body-strength steroid on the face or folds unless we said to.\n- Keep it away from the eyes unless we prescribed it for the eyelids.\n- Don't cover treated skin with plastic, tight bandages or a diaper unless we told you to. Covering makes the medicine stronger.\n- For children, use exactly the amount and areas we discussed.",
      },
      {
        heading: "How long to use it",
        body:
          "Use it as prescribed, usually until the rash is smooth and the itch is gone, and for no longer than the time we set. Stronger steroids are usually used for shorter periods.\n\nIf you have used a steroid every day for several weeks, don't stop suddenly unless we told you to. We may have you taper: use it less often (for example, every other day, then only a few days a week) before stopping. This helps keep the rash from bouncing back.\n\nKeep using your moisturizer every day, even when the skin is clear.",
      },
      {
        heading: "Side effects to watch for",
        body:
          "Most people have no problems. With too much use for too long, the skin can change:\n\n- Thin, shiny or fragile skin, or easy bruising\n- Stretch marks\n- Small visible blood vessels (spider veins)\n- Acne-like bumps or redness around the mouth on the face\n- Lighter skin where the steroid was used\n\nThese are much less likely when you use the right amount, in the right place, for the right length of time.",
      },
    ],
    steps: [],
    stopRules: [
      "Thinning skin, stretch marks, easy bruising or spider veins where you use the steroid.",
      "The rash is no better after 2 weeks, or comes back quickly every time you stop.",
      "Signs of infection: yellow crusts, pus, spreading redness, warmth or fever.",
      "Red bumps around the mouth or eyes, or burning when you try to stop using it on the face.",
      "You need more refills than we planned, or you are unsure how much or how long to use it.",
    ],
    notes: "",
    sources: [
      "Long CC, Finlay AY. The fingertip unit: a new practical measure. Clin Exp Dermatol 1991",
      "Sidbury R et al. Guidelines of care for the management of atopic dermatitis in adults with topical therapies. J Am Acad Dermatol 2023 (AAD)",
      "DermNet, \"Topical corticosteroids\" and \"Fingertip unit\" (patient information)",
      "American Academy of Dermatology, eczema treatment with topical corticosteroids (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "tx-topical-retinoids",
    name: "Topical retinoids: getting started",
    title: "Starting your retinoid cream or gel",
    summary: "How to apply a topical retinoid, building up slowly, handling irritation, sun care and pregnancy cautions.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Retinoids are vitamin A medicines that you put on the skin. They unclog pores, help prevent new acne, and over time can even out skin tone and texture. Tretinoin, adapalene and tazarotene are common examples.\n\nRetinoids work slowly. Most people see real improvement after 8 to 12 weeks of regular use.",
      },
      {
        heading: "How to use it",
        body:
          "- Use it at night, unless we told you otherwise.\n- Wash with a gentle cleanser and pat dry. Waiting until your skin is fully dry can reduce stinging.\n- Use a pea-sized amount for the whole face. Dot it on the forehead, cheeks and chin, then spread a thin layer.\n- Treat the whole area where acne appears, not just single spots.\n- Keep it away from the corners of the eyes, nose and mouth.\n- Put on a moisturizer afterward if your skin feels dry.",
      },
      {
        heading: "Starting slowly and handling irritation",
        body:
          "Dryness, peeling, redness and mild stinging are common in the first few weeks. They usually ease as your skin adjusts. Some people also get a few extra breakouts at first.\n\n- Many people start every second or third night, then use it more often as their skin allows, unless we gave you a different plan.\n- If your skin gets very irritated, skip a night or two, use moisturizer, then start again less often.\n- Avoid scrubs, toners with alcohol, and other peeling products unless we said they are OK.\n- Don't wax areas where you use a retinoid. The skin can tear or peel.",
      },
      {
        heading: "Sun and other products",
        body:
          "Retinoids can make your skin burn more easily. Use a broad-spectrum sunscreen SPF 30 or higher every morning.\n\nSome retinoids are broken down by benzoyl peroxide. Unless your product is made to be used with it, or we told you otherwise, use benzoyl peroxide in the morning and the retinoid at night.",
      },
      {
        heading: "Pregnancy and breastfeeding",
        body:
          "Retinoids are generally not used during pregnancy. If you are pregnant, trying to become pregnant, or breastfeeding, tell us before you start. If you become pregnant while using it, stop and let us know.",
      },
    ],
    steps: [],
    stopRules: [
      "Redness, burning, swelling or peeling that is severe, or doesn't settle after a few days off the medicine.",
      "You become pregnant, are planning a pregnancy, or are breastfeeding.",
      "A bad sunburn on treated skin.",
      "No improvement after about 12 weeks of regular use.",
    ],
    notes: "",
    sources: [
      "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024 (AAD)",
      "FDA labels: tretinoin, adapalene and tazarotene topical products (dosage and administration; pregnancy)",
      "American Academy of Dermatology, \"Acne: Tips for managing\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "tx-benzoyl-peroxide",
    name: "Benzoyl peroxide: how to use it",
    title: "Using benzoyl peroxide",
    summary: "Washes vs leave-on products, avoiding dryness, bleaching of fabric and hair, pairing with other acne medicines.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Benzoyl peroxide is an acne medicine that kills the bacteria involved in acne and helps unclog pores. Bacteria don't become resistant to it. That's why it is often used together with antibiotic creams or pills.\n\nIt comes as washes, gels, creams and lotions. Lower strengths often work about as well as higher ones and are less irritating.",
      },
      {
        heading: "How to use it",
        body:
          "Wash or cleanser:\n- Lather onto damp skin and leave it on for 1 to 2 minutes before rinsing, so it has time to work.\n- It works well for the chest, back and shoulders.\n\nLeave-on gel or cream:\n- Apply a thin layer to the whole area where acne appears, not just single spots.\n- Use it as directed on the label, or as we told you.\n\nResults usually take 6 to 8 weeks or longer.",
      },
      {
        heading: "Dryness and irritation",
        body:
          "Dryness, peeling and mild redness are common at first.\n\n- Start once a day. Use it more often only if your skin is comfortable.\n- Use a fragrance-free moisturizer.\n- If it stings or burns, use it less often or switch to a wash.\n\nA small number of people are allergic to it. Signs are an itchy, red, swollen rash where you applied it. If that happens, stop and call us.",
      },
      {
        heading: "It bleaches fabric and hair",
        body:
          "Benzoyl peroxide can leave white or orange spots on towels, sheets, pillowcases and clothes. It can also lighten hair, including eyebrows.\n\n- Use white towels and pillowcases.\n- Let leave-on products dry fully before you get dressed or go to bed.\n- Rinse washes off well, including the hairline.",
      },
      {
        heading: "Using it with other medicines",
        body:
          "Some retinoids are broken down by benzoyl peroxide. Unless your product is made to be used with it, or we told you otherwise, use benzoyl peroxide in the morning and the retinoid at night.\n\nUse a broad-spectrum sunscreen SPF 30 or higher every morning.",
      },
    ],
    steps: [
      {
        label: "Benzoyl peroxide wash",
        slot: "am",
        kind: "otc",
        search: "benzoyl peroxide wash",
        directions: "Lather onto damp skin, leave on for 1 to 2 minutes, then rinse. It can bleach towels and pillowcases.",
      },
      {
        label: "Moisturizer",
        slot: "am",
        kind: "otc",
        search: "fragrance-free moisturizer",
        directions: "A fragrance-free, non-comedogenic moisturizer after washing.",
      },
      {
        label: "Sunscreen",
        slot: "am",
        kind: "otc",
        search: "SPF 30",
        directions: "Every morning as the last step: broad-spectrum SPF 30 or higher.",
      },
    ],
    stopRules: [
      "An itchy, red, swollen or blistering rash where you put the benzoyl peroxide.",
      "Dryness or burning that is severe, or doesn't settle when you use it less often.",
      "Painful, deep bumps or new scarring.",
      "No improvement after 12 weeks of regular use.",
    ],
    notes: "",
    sources: [
      "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024 (AAD)",
      "FDA OTC acne drug monograph: benzoyl peroxide directions and warnings",
      "American Academy of Dermatology, \"Acne: Tips for managing\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "tx-5-fluorouracil",
    name: "5-fluorouracil cream for sun damage",
    title: "Your 5-fluorouracil (5-FU) cream treatment",
    summary: "How to apply 5-FU for precancers (actinic keratoses), the expected reaction phases, healing, pets and pregnancy.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "5-fluorouracil (5-FU) is a cream that treats actinic keratoses. These are rough, scaly spots caused by sun damage that can sometimes turn into skin cancer. The cream also finds and treats damaged spots you can't see or feel yet.\n\nThe treated skin will look worse before it looks better. That reaction is expected and means the cream is working.",
      },
      {
        heading: "How to use it",
        body:
          "- Use it on the area and for the number of days or weeks we prescribed.\n- Wash and dry the skin, then rub in a thin layer with a fingertip or cotton swab.\n- Keep it away from the eyes, inside the nose and the mouth.\n- Wash your hands well right after, unless we told you to use gloves.\n- Don't cover the area with a bandage unless we told you to.\n- Avoid the sun and tanning beds during treatment. Wear a hat and stay in the shade.",
      },
      {
        heading: "What to expect: the reaction phases",
        body:
          "Everyone reacts a little differently, but most people go through these phases:\n\n- First days: little change, maybe mild pinkness.\n- About week 1 to 2: redness, burning or itching, and the rough spots stand out.\n- About week 2 to 4: more redness, crusting, scabs, oozing or raw spots. It may be sore. This is often the peak.\n- After you stop: the skin usually heals over 1 to 3 weeks, and may stay pink for a few weeks more.\n\nIf the reaction is too uncomfortable, call us. We may change your plan.",
      },
      {
        heading: "Caring for your skin",
        body:
          "- Wash gently with a mild cleanser and lukewarm water.\n- Cool, damp cloths can ease burning.\n- Ask us before using any other creams on the area. After you finish, a plain moisturizer or petroleum jelly usually helps healing.\n- Don't pick at scabs.\n- Plan social events and photos for after you have healed.",
      },
      {
        heading: "Safety: pregnancy and pets",
        body:
          "Do not use 5-FU if you are pregnant or could become pregnant. Tell us if you are pregnant, planning a pregnancy or breastfeeding.\n\nThis cream is very dangerous to dogs and cats, even in tiny amounts. Store the tube where pets can't reach it. Throw away used tissues and swabs safely. Don't let pets lick your treated skin or hands.",
      },
    ],
    steps: [],
    stopRules: [
      "Pain, blistering or raw skin that is much worse than we described, or that you can't manage.",
      "Signs of infection: pus, spreading redness, warmth or fever.",
      "Feeling sick all over during treatment: mouth sores, vomiting, diarrhea, fever or chills.",
      "The skin hasn't healed within about 4 weeks of stopping.",
      "You become pregnant, or a pet may have licked or swallowed any cream.",
    ],
    notes: "",
    sources: [
      "FDA label: fluorouracil cream (dosage and administration; contraindications in pregnancy; warnings including DPD deficiency)",
      "FDA consumer warning on pet exposure to topical fluorouracil cream",
      "DermNet, \"Fluorouracil cream\" (patient information)",
      "Eisen DB et al. Guidelines of care for the management of actinic keratosis. J Am Acad Dermatol 2021 (AAD)",
    ],
    reviewed: false,
  },
  {
    id: "tx-imiquimod",
    name: "Imiquimod cream",
    title: "Your imiquimod cream treatment",
    summary: "How to apply imiquimod, the expected skin reaction, flu-like symptoms, rest breaks, and cautions for genital use.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Imiquimod is a cream that helps your immune system attack abnormal skin cells. It is used for some sun-damage spots (actinic keratoses), some shallow skin cancers, and warts on the genitals.\n\nThe treated skin usually gets red and irritated. That reaction is expected and often means the cream is working.",
      },
      {
        heading: "How to use it",
        body:
          "- Use it on the days and for the number of weeks we prescribed. More is not better.\n- Apply it at bedtime, unless we told you otherwise.\n- Wash and dry the area. Rub in a thin layer until it disappears.\n- Leave it on overnight, then wash it off with mild soap and water in the morning, or after the time we told you.\n- Don't cover it with a tight or airtight bandage unless we told you to.\n- Wash your hands before and after.\n- If it comes in single-use packets, throw away any leftover cream in an opened packet.",
      },
      {
        heading: "What to expect",
        body:
          "Common reactions where you apply it:\n\n- Redness, swelling, itching or burning\n- Flaking, crusting, scabs or small open sores\n\nSome people feel like they have the flu: tired, achy, headache or a low fever. Treated skin may also become lighter or darker, and this can be permanent.\n\nIf the reaction becomes too strong, call us. We may have you take a few days off (a rest period) before starting again. Don't stop or restart on your own without checking with us.",
      },
      {
        heading: "Helpful tips",
        body:
          "- Protect treated skin from the sun with clothing, a hat and shade.\n- Keep the cream away from the eyes, lips and inside the nose.\n- For genital warts: avoid sexual contact while the cream is on the skin. The cream can weaken condoms and diaphragms.\n- Tell us if you are pregnant, planning a pregnancy or breastfeeding.\n- Healing usually takes a few weeks after you finish. We will check the area to make sure the treatment worked.",
      },
    ],
    steps: [],
    stopRules: [
      "Open sores, bleeding, or pain that is much worse than we described.",
      "Flu-like symptoms (fever, chills, aches, tiredness) that are strong or last more than a few days.",
      "Signs of infection: pus, spreading redness, warmth or swelling.",
      "Pain or swelling that makes it hard to urinate, if you are treating the genital area.",
      "The treated spot is still there after healing, or comes back.",
    ],
    notes: "",
    sources: [
      "FDA label: imiquimod cream 5% (dosage and administration; local skin reactions; flu-like symptoms; condom and diaphragm warning)",
      "DermNet, \"Imiquimod cream\" (patient information)",
      "Eisen DB et al. Guidelines of care for the management of actinic keratosis. J Am Acad Dermatol 2021 (AAD)",
    ],
    reviewed: false,
  },
  {
    id: "tx-calcineurin-inhibitors",
    name: "Tacrolimus / pimecrolimus (topical calcineurin inhibitors)",
    title: "Using tacrolimus ointment or pimecrolimus cream",
    summary: "Non-steroid eczema creams: burning at first, sun care, and what the boxed warning means in plain words.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Tacrolimus ointment and pimecrolimus cream are non-steroid medicines that calm eczema and some other rashes. They are called topical calcineurin inhibitors.\n\nThey do not thin the skin the way steroids can. That makes them a good choice for the face, eyelids, neck and skin folds, and for longer-term use on areas that tend to flare.",
      },
      {
        heading: "How to use it",
        body:
          "- Apply a thin layer to the rash as prescribed, and rub it in gently.\n- Use it only on the areas we discussed.\n- Your plan may include using it on areas that often flare, even when they look clear. Follow the schedule we gave you.\n- Use your moisturizer every day. Ask us whether to put it on before or after.\n- Wash your hands afterward, unless you are treating your hands.\n- Don't use it on skin that looks infected.",
      },
      {
        heading: "Burning at first is common",
        body:
          "Many people feel warmth, burning, stinging or itching where they apply it in the first days. This usually fades within about a week as the skin heals. Applying it to fully dry skin may help.\n\nSome people get a red, flushed face if they drink alcohol while using these medicines.",
      },
      {
        heading: "The boxed warning, in plain words",
        body:
          "The labels carry a boxed warning. It says that rare cases of cancer, including skin cancer and lymphoma (a cancer of the immune system), were reported in people using these medicines. It does not say the medicine caused them.\n\nThe warning was based mainly on animal studies with high doses and a small number of reports. Large studies of people since then have been reassuring, and dermatology guidelines continue to recommend these medicines. To use them safely:\n\n- Use them only where and as long as we prescribed.\n- Protect treated skin from the sun and avoid tanning beds.\n- Keep regular follow-up so we can check how it's going.",
      },
    ],
    steps: [],
    stopRules: [
      "Burning or stinging that is severe or doesn't settle after about a week.",
      "Painful blisters or clusters of punched-out sores, or yellow crusts (possible infection: call the same day).",
      "Swollen glands (lumps in the neck, armpits or groin) that don't go away.",
      "The rash is no better after about 6 weeks, or gets worse.",
    ],
    notes: "",
    sources: [
      "Sidbury R et al. Guidelines of care for the management of atopic dermatitis in adults with topical therapies. J Am Acad Dermatol 2023 (AAD)",
      "FDA labels: tacrolimus ointment and pimecrolimus cream (boxed warning; dosage and administration; adverse reactions)",
      "National Eczema Association, topical calcineurin inhibitors (patient information)",
    ],
    reviewed: false,
  },
  {
    id: "tx-wet-wraps",
    name: "Wet wrap therapy",
    title: "Wet wrap therapy for eczema",
    summary: "Step-by-step wet wraps for eczema flares: bathing, medicine and moisturizer, damp and dry layers, safety tips.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Wet wraps are a way to calm a bad eczema flare. After a bath, you put on medicine and moisturizer, then cover the skin with a damp layer of clothing or gauze and a dry layer on top. The wraps cool the skin, ease itch, help the skin hold water, and help the medicine work.\n\nWet wraps are usually used for a few days to a week or two during a flare, as we direct.",
      },
      {
        heading: "What you need",
        body:
          "- Your prescribed medicine and a thick, fragrance-free moisturizer\n- Damp layer: cotton pajamas, a long-sleeved shirt and leggings, tube socks for arms and legs, or gauze\n- Dry layer: a second, dry set of cotton pajamas or clothes that fits over the damp layer\n- A bowl of lukewarm water",
      },
      {
        heading: "How to do it",
        body:
          "- Take a short, lukewarm bath or shower. Gently pat the skin until it is just damp.\n- Apply the medicine to the rash, exactly where and how we prescribed.\n- Apply moisturizer everywhere else.\n- Soak the damp layer in lukewarm water and wring it out until it's damp, not dripping.\n- Put on the damp layer, then the dry layer right over it.\n- Leave the wraps on for several hours or overnight, as we told you. Re-wet the damp layer if it dries out.\n- When you take the wraps off, put on moisturizer again.",
      },
      {
        heading: "Helpful tips",
        body:
          "- Keep the room warm, and use a blanket so you or your child don't get chilled.\n- For children, distraction helps: a movie, a story or a favorite toy.\n- Wraps make the medicine absorb more. Use only the medicine and amount we prescribed under the wraps.\n- Don't use wet wraps on skin that looks infected.\n- Wash the wraps after each use.",
      },
    ],
    steps: [
      {
        label: "Moisturizer (every day)",
        slot: "both",
        kind: "otc",
        search: "fragrance-free moisturizer",
        directions: "A thick fragrance-free cream or ointment, all over, on damp skin after bathing and when the wraps come off.",
      },
    ],
    stopRules: [
      "Signs of infection: yellow crusts, pus, spreading redness, fever, or painful clusters of punched-out sores (call the same day).",
      "Shivering or feeling cold that doesn't improve after removing the wraps.",
      "Skin that gets more red, sore or itchy under the wraps.",
      "The flare is no better after a few days of wraps.",
    ],
    notes: "",
    sources: [
      "National Eczema Association, \"Wet wrap therapy\" (patient information)",
      "National Jewish Health, wet wrap therapy instructions (patient information)",
      "Sidbury R et al. Guidelines of care for the management of atopic dermatitis in adults with topical therapies. J Am Acad Dermatol 2023 (AAD)",
    ],
    reviewed: false,
  },
  {
    id: "tx-bleach-baths",
    name: "Dilute bleach baths",
    title: "How to take a bleach bath",
    summary: "Dilute bleach baths for eczema with frequent infections: mixing safely, soaking, rinsing and moisturizing.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "A bleach bath is a bath with a very small amount of household bleach mixed into the water. It is about as strong as a swimming pool. It can lower the number of bacteria on the skin and may help eczema that often gets infected.\n\nUse bleach baths only if we recommended them, and as often as we told you. Many people take them 2 to 3 times a week.",
      },
      {
        heading: "Mixing the bath",
        body:
          "Use plain, unscented household bleach. Do not use splash-less, scented or color-safe bleach. Use the amount we gave you.\n\nA commonly used recipe for regular-strength bleach:\n\n- Full standard bathtub: about half a cup of bleach\n- Half-full bathtub: about a quarter cup\n- Baby bathtub: about 1 teaspoon per gallon of water\n\nSome bleach is labeled concentrated and is stronger. Ask us how much to use if your bottle says concentrated.\n\nFill the tub with lukewarm water first, then pour in the bleach and stir before anyone gets in.",
      },
      {
        heading: "Taking the bath",
        body:
          "- Soak for about 10 minutes, unless we told you otherwise.\n- Keep the head out of the water. Keep bath water away from the eyes and mouth.\n- Rinse off with fresh lukewarm water, then gently pat the skin dry.\n- Right away, apply any prescribed medicine to the rash, and moisturizer everywhere else.",
      },
      {
        heading: "Safety tips",
        body:
          "- Never put undiluted bleach on the skin.\n- Never mix bleach with other cleaners, especially ones with ammonia. This makes a dangerous gas.\n- Always stay with children in the bath.\n- Store bleach out of reach of children.\n- Very raw or cracked skin may sting. Tell us if it hurts.",
      },
    ],
    steps: [
      {
        label: "Moisturizer after the bath",
        slot: "as-directed",
        kind: "otc",
        search: "fragrance-free moisturizer",
        directions: "Right after patting dry: a thick fragrance-free cream or ointment all over, after any prescribed medicine.",
      },
    ],
    stopRules: [
      "Burning, stinging or redness that lasts after the bath, or skin that seems worse.",
      "Wheezing, coughing or trouble breathing during or after the bath.",
      "Bleach water got into the eyes and they stay red or painful after rinsing with clean water.",
      "Signs of infection keep coming back: yellow crusts, pus or spreading redness.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, eczema treatment: bleach bath therapy (patient education)",
      "National Eczema Association, bathing and bleach baths (patient information)",
    ],
    reviewed: false,
  },
  {
    id: "tx-antifungal-shampoo",
    name: "Medicated (antifungal) shampoo",
    title: "Using your medicated shampoo",
    summary: "How to use antifungal shampoo on the scalp, face, beard or body: contact time, maintenance, and avoiding dryness.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Antifungal shampoos lower the amount of yeast on the skin. They are used for dandruff and seborrheic dermatitis (flaky, red, itchy skin on the scalp, face or chest). They are also used as a body wash for tinea versicolor (light or dark patches on the chest and back), and sometimes to help stop the spread of scalp ringworm.\n\nCommon ingredients include ketoconazole, selenium sulfide, ciclopirox and zinc pyrithione.",
      },
      {
        heading: "How to use it",
        body:
          "The key is letting the shampoo sit before you rinse it off.\n\n- Wet your hair and skin.\n- Massage the shampoo into the scalp, not just the hair. It can also go on a beard, eyebrows, sides of the nose, behind the ears or the chest if we told you to.\n- Leave it on for about 5 minutes, or as long as the label or we said.\n- Rinse well.\n\nFor tinea versicolor, spread it over the patches and the skin around them, leave it on as directed, then rinse.",
      },
      {
        heading: "How often",
        body:
          "Use it as often as we prescribed or as the label directs. Often this is a few times a week until things clear up, then about once a week to keep it from coming back.\n\nSeborrheic dermatitis and tinea versicolor tend to come back. A regular maintenance wash is the best way to keep them quiet.",
      },
      {
        heading: "Helpful tips",
        body:
          "- Medicated shampoos can dry the hair. Use your regular conditioner afterward.\n- You can use your regular shampoo on other days.\n- Keep it out of your eyes. If it gets in, rinse with water.\n- Selenium sulfide can discolor light, gray or color-treated hair. Rinse very well.\n- Mild itching or irritation can happen. Tell us if it doesn't settle.",
      },
    ],
    steps: [
      {
        label: "Medicated shampoo",
        slot: "as-directed",
        kind: "otc",
        search: "antifungal shampoo",
        directions: "Lather into the scalp and any flaky areas, leave on about 5 minutes, then rinse. Use as often as directed.",
      },
    ],
    stopRules: [
      "Redness, burning or itching that gets worse with the shampoo.",
      "Hair loss, or sore, swollen or pus-filled areas on the scalp.",
      "No improvement after about 4 weeks of regular use.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Seborrheic dermatitis: Self-care\" (patient education)",
      "American Academy of Dermatology, \"Tinea versicolor: Diagnosis and treatment\" (patient education)",
      "Clark GW, Pope SM, Jaboori KA. Diagnosis and treatment of seborrheic dermatitis. Am Fam Physician 2015",
    ],
    reviewed: false,
  },
  {
    id: "tx-oral-antibiotics-acne-rosacea",
    name: "Oral antibiotics for acne or rosacea",
    title: "Taking an antibiotic pill for acne or rosacea",
    summary: "Tetracycline-class antibiotics: how to take them (water, stay upright), sun sensitivity, what to separate them from, side effects.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Antibiotics such as doxycycline and minocycline are used for acne and rosacea. They calm redness and swelling, and lower the bacteria involved in acne.\n\nThey are usually used for a limited time, often a few months, together with creams or gels. When your skin is better, we will usually stop the pill and keep you on the creams to keep it clear.",
      },
      {
        heading: "How to take it",
        body:
          "- Take it as prescribed. Don't take extra or skip doses.\n- Swallow it with a full glass of water.\n- Stay upright (sitting or standing) for at least 30 minutes after. Don't take it right before bed. This helps keep the pill from irritating your food pipe.\n- If it upsets your stomach, taking it with food may help, unless we told you otherwise.\n- Take it a few hours apart from antacids, calcium, iron, magnesium, zinc and multivitamins. These can stop it from being absorbed. Ask your pharmacist about your own timing.",
      },
      {
        heading: "Sun sensitivity",
        body:
          "These antibiotics, especially doxycycline, can make you sunburn much more easily, even with short time outdoors.\n\n- Use broad-spectrum sunscreen SPF 30 or higher every day.\n- Wear a hat and clothing that covers your skin.\n- Seek shade, and avoid tanning beds.",
      },
      {
        heading: "Other things to know",
        body:
          "- Most people improve slowly over 6 to 12 weeks.\n- Mild stomach upset is common.\n- Some people get a vaginal yeast infection.\n- You do not need to take probiotics with this medicine.\n- Do not take these antibiotics if you are pregnant. Tell us right away if you become pregnant.\n- They are not usually used in children under 8, because they can stain growing teeth.\n- Tell us and your pharmacist about all other medicines you take.",
      },
    ],
    steps: [],
    stopRules: [
      "Pain or burning in the chest or when swallowing.",
      "A bad sunburn or a rash on sun-exposed skin.",
      "A severe headache, especially with blurred or double vision.",
      "Severe or watery diarrhea, or diarrhea with blood or stomach cramps.",
      "Dizziness, joint pain, fever, or blue-gray or dark color changes in the skin, nails or gums.",
      "You become pregnant.",
    ],
    notes: "",
    sources: [
      "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024 (AAD)",
      "FDA labels: doxycycline and minocycline (dosage and administration; warnings: esophageal irritation, photosensitivity, tooth discoloration, intracranial hypertension, C. difficile)",
      "Thiboutot D et al. Standard management options for rosacea: the 2019 update by the National Rosacea Society Expert Committee. J Am Acad Dermatol 2020",
    ],
    reviewed: false,
  },
  {
    id: "tx-spironolactone",
    name: "Spironolactone for acne",
    title: "Taking spironolactone for acne",
    summary: "How spironolactone helps hormonal acne, timeline, common side effects, no use in pregnancy, potassium and labs.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Spironolactone is a pill first used for blood pressure and fluid. In lower amounts it is also used to treat acne in women. It blocks the effects of hormones called androgens. Androgens make oil glands more active, which can lead to acne along the jaw, chin and neck.",
      },
      {
        heading: "What to expect",
        body:
          "- Take it as prescribed. Don't change the amount on your own.\n- It works slowly. Most people start to see improvement after about 3 months.\n- Keep using your acne creams or gels unless we told you to stop.\n- If you stop the medicine, acne often comes back over time.",
      },
      {
        heading: "Common side effects",
        body:
          "- Needing to urinate more often\n- Feeling lightheaded or dizzy, especially when you stand up quickly. Get up slowly and drink enough fluids.\n- Changes in your period, such as spotting between periods\n- Breast tenderness\n- Feeling tired, or mild headache\n\nThese are often mild and may settle with time. Tell us if they bother you.",
      },
      {
        heading: "Pregnancy",
        body:
          "Do not take spironolactone if you are pregnant. It could affect the development of a baby. If you could become pregnant, talk with us about birth control while you take it.\n\nIf you become pregnant, stop taking it and call us. Also tell us if you are breastfeeding.",
      },
      {
        heading: "Potassium and lab tests",
        body:
          "Spironolactone can raise the level of potassium in your blood. For most healthy young people this is not a problem. If we order blood tests, please get them done when we asked.\n\n- Don't take potassium supplements or use salt substitutes (which often contain potassium) unless we said it's OK.\n- Tell us about all your medicines, especially for blood pressure, heart or kidney problems.\n- Tell us if you have kidney disease.",
      },
    ],
    steps: [],
    stopRules: [
      "You become pregnant or are planning a pregnancy.",
      "Fainting, or dizziness that doesn't improve when you sit or lie down.",
      "Muscle weakness, a slow or irregular heartbeat, or numbness or tingling.",
      "Severe vomiting or diarrhea, or you can't keep fluids down.",
      "A breast lump.",
    ],
    notes: "",
    sources: [
      "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024 (AAD)",
      "FDA label: spironolactone tablets (warnings: hyperkalemia; use in pregnancy; adverse reactions)",
      "American Academy of Dermatology, \"Acne: Diagnosis and treatment\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "tx-minoxidil",
    name: "Minoxidil for hair loss",
    title: "Using minoxidil for hair loss",
    summary: "How to apply topical minoxidil, the early shedding phase, why consistency matters, side effects, pets and pregnancy.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Minoxidil helps hair grow by lengthening the growing phase of hair and making thin hairs thicker. It comes as a liquid or foam that you put on the scalp. It is used most often for pattern hair loss in men and women.\n\nIt works best to keep the hair you have and regrow some thinning hair. It does not usually regrow hair on fully bald areas.",
      },
      {
        heading: "How to use it",
        body:
          "- Use it as directed on the label or as we told you.\n- Apply it to a dry scalp, on the thinning areas, not to the hair itself.\n- Spread it with your fingertips, then wash your hands well.\n- Let it dry fully before you style your hair, put on a hat or go to bed. This keeps it from rubbing onto your face or pillow.\n- Don't use more than directed. More does not work better.",
      },
      {
        heading: "What to expect: early shedding",
        body:
          "In the first few weeks to 2 months, many people notice more hair shedding. This is a normal sign. Old resting hairs are being pushed out by new growing ones. Keep going.\n\n- It usually takes at least 4 to 6 months to see results.\n- It can take about a year to see the full effect.",
      },
      {
        heading: "Consistency matters",
        body:
          "Minoxidil only works while you use it. If you stop, the hair it helped usually falls out over several months, and hair loss continues as before.\n\nUse it every day as directed. If you miss a dose, just restart. Don't double up.",
      },
      {
        heading: "Side effects and safety",
        body:
          "- Itchy, dry or flaky scalp. The foam may be less irritating than the liquid. Tell us if this bothers you.\n- Unwanted hair growth on the face or forehead, often from product spreading there. It usually goes away after stopping.\n- Do not use it if you are pregnant or breastfeeding.\n- Minoxidil is very toxic to cats, even in small amounts. Keep it away from pets, and don't let them touch or lick treated skin, hands or bedding.\n- If we prescribed minoxidil pills instead, take them only as prescribed.",
      },
    ],
    steps: [],
    stopRules: [
      "Chest pain, a fast or pounding heartbeat, fainting or dizziness.",
      "Sudden weight gain, or swelling of the hands, feet, ankles or face.",
      "Redness, burning or rash on the scalp that doesn't settle.",
      "Shedding that is still heavy after 2 months, or no improvement after 6 months.",
      "You become pregnant or are breastfeeding.",
    ],
    notes: "",
    sources: [
      "FDA OTC Drug Facts labels: minoxidil topical solution and foam (directions; warnings; stop use)",
      "American Academy of Dermatology, \"Hair loss: Diagnosis and treatment\" (patient education)",
      "DermNet, \"Minoxidil\" (patient information)",
    ],
    reviewed: false,
  },
  {
    id: "tx-hydroquinone",
    name: "Hydroquinone for dark spots",
    title: "Using hydroquinone for dark spots",
    summary: "How to apply hydroquinone, using it in cycles with breaks, irritation, sun protection, and stopping if skin darkens.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Hydroquinone is a cream that lightens dark spots. It slows the skin's production of melanin (the pigment that gives skin its color). It is used for melasma, dark marks left after acne or rashes, and some sun spots.\n\nIt works slowly. Most people start to see lightening after about 1 to 3 months.",
      },
      {
        heading: "How to use it",
        body:
          "- Use it as prescribed, usually at night.\n- Wash and dry your skin first.\n- Apply a thin layer to the dark spots only. It can lighten the normal skin around them.\n- Keep it away from the eyes, lips and inside the nose.\n- Wash your hands afterward.",
      },
      {
        heading: "Using it in cycles",
        body:
          "Hydroquinone is not meant to be used every day without end. It is usually used for a few months at a time, followed by a break, as we direct.\n\n- Follow the schedule we gave you.\n- Keep your follow-up visits so we can decide when to pause or restart.\n- During breaks, sunscreen and any other products we suggested help keep spots from coming back.",
      },
      {
        heading: "Irritation and sun protection",
        body:
          "Some redness, dryness or stinging can happen. If it is mild, using it less often and adding a gentle moisturizer may help.\n\nSun makes dark spots darker and can undo your progress. Use a broad-spectrum sunscreen SPF 30 or higher every day, all year. A tinted mineral sunscreen can help with melasma. Wear a hat outdoors.",
      },
      {
        heading: "Important cautions",
        body:
          "- Stop and call us if the treated skin gets darker, or turns gray or blue-black. This is rare, but it can happen with long-term use.\n- Do not use it if you are pregnant or breastfeeding unless we said it's OK.\n- Do not buy skin lighteners online or from stores outside the U.S. Some contain mercury, strong steroids or unlisted ingredients.",
      },
    ],
    steps: [],
    stopRules: [
      "The treated area turns darker, gray or blue-black (stop the cream and call us).",
      "Redness, burning, itching, blistering or a rash where you apply it.",
      "No lightening after about 3 months of regular use.",
      "You become pregnant or are breastfeeding.",
    ],
    notes: "",
    sources: [
      "FDA consumer warning on skin-lightening products containing hydroquinone and mercury (2022)",
      "American Academy of Dermatology, \"Melasma: Diagnosis and treatment\" (patient education)",
      "Rajaratnam R et al. Interventions for melasma. Cochrane Database Syst Rev 2010",
    ],
    reviewed: false,
  },
  {
    id: "tx-biologic-injections",
    name: "Starting a biologic injection",
    title: "Starting your biologic injections",
    summary: "General self-injection tips, storage and travel, injection-site reactions, and infections and other changes to report.",
    category: "treatments",
    sections: [
      {
        heading: "What it is",
        body:
          "Biologics are medicines made from living cells. They block specific parts of the immune system that drive skin conditions such as psoriasis, eczema or hidradenitis suppurativa. Most are given as a shot under the skin with a prefilled pen or syringe.\n\nYour medicine comes with Instructions for Use from the maker. Follow those, and your schedule as prescribed. The tips below apply to most biologics.",
      },
      {
        heading: "Storing your medicine",
        body:
          "- Keep it in the refrigerator, in its original box to protect it from light, unless the label says otherwise.\n- Never freeze it. Don't use it if it has been frozen.\n- Don't shake it.\n- Some products can be kept at room temperature for a set number of days. Check your label.\n- When traveling, keep it cool (not frozen) in an insulated bag with an ice pack. Carry it with you, not in checked luggage.",
      },
      {
        heading: "Injection-day tips",
        body:
          "- Take it out of the fridge and let it reach room temperature for the time the label says. This makes the shot more comfortable. Don't warm it any other way.\n- Check the expiration date. Look at the liquid if there is a window: it should match what the label describes.\n- Wash your hands. Clean the skin with an alcohol wipe and let it dry.\n- Common sites are the front of the thighs and the belly (staying about 2 inches from the belly button). Someone else can use the back of your upper arm.\n- Change sites each time. Avoid skin that is bruised, tender, scarred or affected by your skin condition.\n- Put used pens and syringes in a sharps container.",
      },
      {
        heading: "What to expect",
        body:
          "Mild redness, swelling, itching or a small bruise where you inject is common. It usually fades within a few days. A cool compress can help.\n\nMost biologics take weeks to months to reach their full effect. Keep taking it on schedule.\n\nIf you miss a dose, follow the label or call us. Don't double up.",
      },
      {
        heading: "Before vaccines, surgery or pregnancy",
        body:
          "- Check with us before getting any vaccine. Live vaccines are usually avoided while on a biologic.\n- Tell us before any surgery or dental procedure.\n- Tell us if you are pregnant, planning a pregnancy or breastfeeding.\n- Tell every doctor and pharmacist that you take a biologic.",
      },
    ],
    steps: [],
    stopRules: [
      "Fever, chills, or feeling very unwell.",
      "Cough that won't go away, night sweats or weight loss you can't explain.",
      "Burning when you urinate, or a painful, red, warm or swollen area of skin.",
      "An injection-site reaction that spreads, gets worse after a few days, or blisters.",
      "Any new or unusual symptoms after starting the medicine.",
      "You have an infection and a dose is coming up (ask us whether to hold it).",
    ],
    notes: "",
    sources: [
      "Menter A et al. Joint AAD-NPF guidelines of care for the management and treatment of psoriasis with biologics. J Am Acad Dermatol 2019",
      "National Psoriasis Foundation, biologics and self-injection (patient information)",
      "Product Instructions for Use and FDA labels for injectable biologics (storage, administration, infections, live vaccines)",
    ],
    reviewed: false,
  },
  {
    id: "tx-sunscreen",
    name: "Sunscreen: choosing and using it",
    title: "How to choose and use sunscreen",
    summary: "SPF 30+, broad spectrum, water resistance, how much to apply, reapplying, and other sun protection.",
    category: "treatments",
    sections: [
      {
        heading: "Choosing a sunscreen",
        body:
          "Look for these three things on the label:\n\n- SPF 30 or higher. SPF measures protection from sunburn.\n- Broad spectrum. This means it protects against both UVA rays (which age the skin) and UVB rays (which burn). Both can cause skin cancer.\n- Water resistant (40 or 80 minutes), if you will swim or sweat. No sunscreen is waterproof.\n\nMineral sunscreens (zinc oxide, titanium dioxide) and chemical sunscreens both work. Mineral types may be gentler for sensitive skin. The best sunscreen is one you like enough to use every day.",
      },
      {
        heading: "How much to use",
        body:
          "Most people use far too little.\n\n- Body: about 1 ounce for an adult, about enough to fill a shot glass.\n- Face and neck: about a teaspoon.\n- Don't forget the ears, back of the neck, tops of the feet, the scalp where hair is thin, and the lips (use an SPF lip balm).\n\nApply it about 15 minutes before you go outside. With sprays, spray until the skin looks wet, then rub it in. Don't spray directly on the face or breathe it in.",
      },
      {
        heading: "Reapplying",
        body:
          "- Reapply at least every 2 hours when outdoors.\n- Reapply right after swimming, heavy sweating or towel drying.\n- Use it every day, even when it's cloudy. UV rays pass through clouds.\n- Water, sand and snow reflect sunlight and raise your exposure.\n- Check the expiration date. If there is none, most sunscreens are made to last about 3 years.",
      },
      {
        heading: "More ways to protect your skin",
        body:
          "Sunscreen works best with other protection:\n\n- Seek shade, especially between 10 a.m. and 4 p.m.\n- Wear long sleeves, pants, a wide-brimmed hat and UV-blocking sunglasses.\n- Avoid tanning beds.\n- Babies under 6 months: keep them out of direct sun. Use shade and clothing. Ask us before using sunscreen on a young baby.",
      },
    ],
    steps: [
      {
        label: "Sunscreen",
        slot: "am",
        kind: "otc",
        search: "SPF 30",
        directions: "Every morning as the last step: broad-spectrum SPF 30 or higher. Reapply every 2 hours outdoors and after swimming or sweating.",
      },
      {
        label: "Lip balm with SPF",
        slot: "am",
        kind: "otc",
        search: "lip balm SPF 30",
        directions: "On the lips whenever you are outdoors. Reapply often, and after eating or drinking.",
      },
    ],
    stopRules: [
      "A rash, itching or burning where you put sunscreen (you may be sensitive to an ingredient).",
      "A sunburn that blisters, covers a large area, or comes with fever, chills or feeling faint.",
      "A new spot, or a spot that is changing, bleeding or not healing.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"How to select a sunscreen\" and \"How to apply sunscreen\" (patient education)",
      "U.S. Food and Drug Administration, \"Sun protection / sunscreen\" consumer information",
      "Skin Cancer Foundation, sunscreen and sun protection guidance (patient information)",
    ],
    reviewed: false,
  },
  {
    id: "tx-sun-protection-after-skin-cancer",
    name: "Sun protection after skin cancer",
    title: "Protecting your skin after skin cancer",
    summary: "Why risk of new skin cancers is higher, daily sun habits, scar care, follow-up visits and self-checks.",
    category: "treatments",
    sections: [
      {
        heading: "Why it matters",
        body:
          "Having had one skin cancer means you are more likely to get another one. This is usually because of past sun damage. It is not your fault, and it is never too late to protect your skin. Good sun habits lower your risk from here on, and regular checks help find any new spot early, when it is easiest to treat.",
      },
      {
        heading: "Every day",
        body:
          "- Use a broad-spectrum sunscreen SPF 30 or higher on your face, neck, ears, scalp if hair is thin, and the backs of your hands. Do this every day, even when it's cloudy or you'll only be out a short time.\n- Reapply every 2 hours outdoors, and after swimming or sweating.\n- Use a lip balm with SPF.\n- UVA rays pass through car side windows and many home windows. Sunscreen or UV-protective clothing helps when you drive a lot or sit by a window.",
      },
      {
        heading: "Outdoors",
        body:
          "- Plan outdoor time for early morning or late afternoon when you can. The sun is strongest between 10 a.m. and 4 p.m.\n- Seek shade.\n- Wear a wide-brimmed hat (baseball caps leave the ears and neck uncovered).\n- Wear long sleeves and pants. Clothing labeled UPF 30 or higher gives reliable protection.\n- Wear UV-blocking sunglasses.\n- Never use tanning beds.",
      },
      {
        heading: "Your scar",
        body:
          "A new scar can darken if it gets sun while it heals. Once it has fully healed, cover it with clothing or sunscreen whenever you go outside, usually for at least a year.",
      },
      {
        heading: "Follow-up and self-checks",
        body:
          "- Keep your skin check visits on the schedule we set.\n- Check your own skin once a month, including your scalp, ears and back. Ask someone to help with hard-to-see areas.\n- If you are worried about vitamin D from avoiding the sun, ask us. Food or supplements are safer than sun exposure.",
      },
    ],
    steps: [
      {
        label: "Sunscreen",
        slot: "am",
        kind: "otc",
        search: "SPF 30",
        directions: "Every morning on all exposed skin: broad-spectrum SPF 30 or higher. Reapply every 2 hours outdoors and after swimming or sweating.",
      },
    ],
    stopRules: [
      "A new spot, or a spot that is growing or changing in size, shape or color.",
      "A sore that bleeds, crusts or doesn't heal within a few weeks.",
      "A shiny or pearly bump, or a firm, red or scaly spot that keeps coming back.",
      "A new lump or bump in or near your scar.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Prevent skin cancer\" (patient education)",
      "Skin Cancer Foundation, sun protection guidance for skin cancer survivors (patient information)",
      "U.S. Food and Drug Administration, \"Sun protection / sunscreen\" consumer information",
    ],
    reviewed: false,
  },
  {
    id: "tx-skin-self-exam",
    name: "Monthly skin self-exam",
    title: "How to check your skin each month",
    summary: "A step-by-step monthly self-exam, the ABCDEs of melanoma, the ugly duckling sign, and other spots to report.",
    category: "treatments",
    sections: [
      {
        heading: "Why check your skin",
        body:
          "Skin cancer is easiest to treat when it is found early. Checking your skin once a month helps you learn what's normal for you, so you notice when something new or changing appears.\n\nYou'll need a bright room, a full-length mirror, a hand mirror and a chair. A partner or family member can help check your back and scalp.",
      },
      {
        heading: "Step by step",
        body:
          "- Face, including the nose, lips, mouth and ears (front and back).\n- Scalp: part your hair in sections with a comb or hair dryer. Ask someone to help.\n- Hands: palms, backs, between the fingers and under the nails.\n- Arms, elbows and underarms.\n- Neck, chest and belly. Lift the breasts to check underneath.\n- Back, buttocks and backs of the legs, using the hand mirror and full-length mirror.\n- Sit down to check the legs, tops and soles of the feet, between the toes and under the toenails.\n- Genital area, using the hand mirror.",
      },
      {
        heading: "The ABCDEs of melanoma",
        body:
          "Melanoma is a serious type of skin cancer. Look for moles or spots with:\n\n- A, Asymmetry: one half doesn't match the other.\n- B, Border: the edge is uneven, jagged or blurry.\n- C, Color: more than one color, or uneven shades of brown, black, tan, red, white or blue.\n- D, Diameter: bigger than about 6 millimeters (the size of a pencil eraser). Melanomas can be smaller.\n- E, Evolving: the spot is changing in size, shape or color, or starts to itch, crust or bleed.\n\nEvolving, or changing, is one of the most important signs.",
      },
      {
        heading: "The ugly duckling sign",
        body:
          "Most of your moles tend to look like each other. A mole that looks different from all the others, the ugly duckling, deserves a closer look. It may be bigger, darker, lighter, a different shape, or just look out of place.",
      },
      {
        heading: "Other spots to report and helpful tips",
        body:
          "Not all skin cancers are dark. Also watch for:\n\n- A shiny, pearly or pink bump\n- A rough, scaly or crusted red patch\n- A sore that bleeds or doesn't heal\n- A new dark streak in a fingernail or toenail\n\nTips: take photos of your skin, with a ruler next to spots you are watching. Pick the same day each month, such as your birthday date.",
      },
    ],
    steps: [],
    stopRules: [
      "A mole or spot with any of the ABCDE warning signs.",
      "An ugly duckling: a spot that looks different from your other moles.",
      "A new spot that keeps growing, or any spot that is changing.",
      "A sore that bleeds, crusts or doesn't heal within a few weeks.",
      "A new dark line in a nail, or a dark spot on the palm, sole or under a nail.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"How to perform a skin self-exam\" and \"What to look for: ABCDEs of melanoma\" (patient education)",
      "Grob JJ, Bonerandi JJ. The 'ugly duckling' sign: identification of the common characteristics of nevi in an individual as a basis for melanoma screening. Arch Dermatol 1998",
      "Skin Cancer Foundation, skin self-exam guidance (patient information)",
    ],
    reviewed: false,
  },
];
