// Cosmetic patient-education handouts for the clinician handout library.
// DRAFTED BY CLAUDE (AI), NOT YET REVIEWED: every handout here goes to the
// dermatologist's approve / edit / cut review (review/handout-library-review.html)
// and shows a "draft" marker until reviewed=true.
import type { HandoutTemplate } from "@/db/handout-templates";

export const COSMETIC_HANDOUTS: HandoutTemplate[] = [
  {
    id: "cos-botulinum-toxin",
    name: "Botulinum toxin injections: before and after",
    title: "Your botulinum toxin treatment",
    summary: "What botulinum toxin does, how to prepare, aftercare, when results show and how long they last.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Botulinum toxin is a medicine injected in tiny amounts into certain muscles. It relaxes those muscles for a while, which softens lines caused by movement, such as frown lines, forehead lines and crow's feet.\n\nThe effect wears off over time, so treatments are repeated if you want to keep the result.",
      },
      {
        heading: "Before your visit",
        body: "- Tell us about all medicines and supplements you take, including antibiotics and blood thinners.\n- Tell us if you have a nerve or muscle condition, such as myasthenia gravis.\n- Tell us if you are pregnant, may be pregnant or are breastfeeding. Treatment is usually postponed.\n- Fish oil, vitamin E and pain relievers like ibuprofen can make bruising more likely. Ask us before stopping anything. Never stop a prescribed blood thinner unless the doctor who prescribed it agrees.\n- If you have a big event coming up, plan treatment at least 2 weeks ahead in case of bruising.",
      },
      {
        heading: "What to expect",
        body: "The injections take a few minutes and feel like small pinches. Small bumps at the injection spots usually fade within an hour.\n\n- Results usually start in 3 to 5 days and reach their full effect in about 2 weeks.\n- Results usually last about 3 to 4 months, and this varies from person to person.\n- Mild bruising, tenderness or a headache can happen and usually settle in a few days.\n- Rarely, an eyelid or brow can droop for a few weeks. This wears off as the medicine does.",
      },
      {
        heading: "Caring for it at home",
        body: "Unless we told you otherwise:\n\n- Do not rub, press or massage the treated areas for the rest of the day.\n- Stay upright for about 4 hours. Avoid lying face down.\n- Skip hard exercise, saunas and hot tubs for the rest of the day.\n- A cold pack wrapped in a cloth can help with swelling or bruising. Hold it on gently.\n- You can usually wash your face and wear makeup later the same day, using a light touch.",
      },
      {
        heading: "Helpful tips",
        body: "Wait the full 2 weeks before judging your result. If something looks uneven at that point, let us know. Small adjustments are often possible.\n\nTell us before your next treatment if you started any new medicines.",
      },
    ],
    steps: [],
    stopRules: [
      "Trouble swallowing, speaking or breathing, or new muscle weakness away from the treated area, in the days or weeks after (get help right away; call 911 for trouble breathing).",
      "Double vision, blurred vision, or an eyelid that droops enough to block your vision.",
      "Eye dryness, irritation or trouble closing your eye fully.",
      "A bruise or swelling that keeps getting bigger or more painful after the first day.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Botulinum toxin therapy: FAQs" (patient education)',
      "FDA prescribing information for botulinum toxin products (boxed warning: distant spread of toxin effect; warnings and precautions)",
    ],
    reviewed: false,
  },
  {
    id: "cos-dermal-fillers",
    name: "Dermal fillers: before and after",
    title: "Your dermal filler treatment",
    summary: "Preparing for filler, normal swelling and bruising, aftercare, and urgent warning signs of a blocked blood vessel.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "A dermal filler is a gel injected under the skin to add volume or smooth lines. Common areas are the lips, cheeks, the lines from the nose to the mouth, and under the eyes.\n\nMost fillers we use are made of hyaluronic acid, a substance your skin makes naturally. Your body slowly breaks it down over months. If there is a problem with hyaluronic acid filler, it can often be dissolved with another injection.",
      },
      {
        heading: "Before your visit",
        body: "- Tell us about all medicines and supplements, and any past filler or other treatments in the area.\n- If you have ever had cold sores and are having lip or mouth-area filler, tell us. We may prescribe an antiviral medicine to take as prescribed.\n- Fish oil, vitamin E and pain relievers like ibuprofen can increase bruising. Ask us before stopping anything, and never stop a prescribed blood thinner on your own.\n- Many clinics suggest avoiding dental work for about 2 weeks before and after filler.\n- Treatment is usually postponed during pregnancy and breastfeeding.\n- Plan at least 2 weeks before a big event.",
      },
      {
        heading: "What to expect",
        body: "- Swelling, tenderness and redness are common. Swelling is often worst on day 1 to 3, especially in the lips, and usually settles within 1 to 2 weeks.\n- Bruising can happen and usually fades in 1 to 2 weeks.\n- The area may feel a little firm or lumpy at first. This usually softens over 2 weeks.\n- Your final look is easier to judge after about 2 weeks.",
      },
      {
        heading: "Caring for it at home",
        body: "Unless we told you otherwise:\n\n- Do not press on, massage or rub the area unless we showed you how.\n- Use a cold pack wrapped in a cloth for a few minutes at a time to ease swelling.\n- Avoid hard exercise, saunas, hot tubs and strong heat for 24 to 48 hours.\n- Keep makeup off the injection spots until the next day.\n- Sleep with your head a little raised the first night if you have swelling.",
      },
      {
        heading: "A rare but serious risk",
        body: "Very rarely, filler can block a blood vessel and cut off blood flow to the skin nearby or, even more rarely, to the eye. This usually shows up during treatment or within the first hours or days. Treating it quickly makes a big difference, so please read the warning signs at the end of this handout before you leave.",
      },
    ],
    steps: [],
    stopRules: [
      "Pain that is severe, getting worse, or much more than expected, especially away from the injection spots (call us right away).",
      "Skin near the filler that turns white, or a dusky, blue-gray, purple or blotchy net-like patch (call us right away).",
      "Any change in vision, eye pain, or a drooping eyelid after filler: this is an emergency. Call us and go to the nearest emergency room.",
      "Small blisters, scabs or open sores near the treated area in the days after treatment.",
      "A red, warm, tender or growing lump, days to months after treatment.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Fillers: FAQs" (patient education)',
      'U.S. Food and Drug Administration, "Dermal Fillers (Soft Tissue Fillers)" (consumer information)',
    ],
    reviewed: false,
  },
  {
    id: "cos-superficial-peel",
    name: "Superficial chemical peel",
    title: "Your light chemical peel",
    summary: "Light (superficial) peel: preparation, what peeling looks like, gentle aftercare and sun protection.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "A light chemical peel uses a mild acid solution to remove the very top layer of skin. It can help with dullness, uneven tone, mild sun damage and some types of acne.\n\nLight peels are usually done as a series, often every 2 to 4 weeks. Results build slowly over several sessions.",
      },
      {
        heading: "Before your peel",
        body: "Unless we told you otherwise:\n\n- Stop retinoid creams (such as tretinoin, adapalene or retinol) and acid products about 3 to 7 days before.\n- Do not wax, use hair-removal creams, or have laser treatment on the area for about 1 week before.\n- Avoid tanning and sunburn. We may reschedule if your skin is sunburned or irritated.\n- Tell us if you get cold sores, if you are pregnant or breastfeeding, or about any acne medicine you have taken in the past year.",
      },
      {
        heading: "What to expect",
        body: "During the peel you may feel warmth, tingling or stinging for a few minutes.\n\n- Your skin may look pink, like a mild sunburn, for 1 to 3 days.\n- Light flaking or dryness often starts on day 2 or 3 and usually ends within a week.\n- Some people barely peel at all. The peel still works.",
      },
      {
        heading: "Caring for it at home",
        body: "- Do wash gently with lukewarm water and a mild cleanser. Pat dry.\n- Do use a plain, fragrance-free moisturizer as often as your skin feels dry.\n- Do use broad-spectrum sunscreen SPF 30 or higher every day.\n- Don't pick, peel or scrub flaking skin. Let it come off on its own.\n- Don't use retinoids, acids, scrubs or other strong products until the flaking stops, usually about a week.\n- Makeup is usually fine the next day if your skin is not stinging.",
      },
      {
        heading: "Helpful tips",
        body: "If you have darker skin, dark spots can sometimes appear after a peel. Strict sun protection lowers this risk. Tell us early if you notice any.",
      },
    ],
    steps: [
      { label: "Gentle cleanser", slot: "both", kind: "otc", search: "gentle cleanser", directions: "Wash gently with lukewarm water and your fingertips. Pat dry. No scrubs or washcloths." },
      { label: "Moisturizer", slot: "both", kind: "otc", search: "fragrance-free moisturizer", directions: "A plain, fragrance-free moisturizer after washing and whenever your skin feels dry or tight." },
      { label: "Sunscreen", slot: "am", kind: "otc", search: "SPF 30", directions: "Every morning: broad-spectrum SPF 30 or higher. Reapply every 2 hours outdoors." },
    ],
    stopRules: [
      "Blisters, crusting, open areas or oozing.",
      "Tingling, then small clustered blisters, especially around the mouth (possible cold sore).",
      "Redness, burning or stinging that is getting worse after day 3.",
      "Dark or light patches that appear as your skin heals.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Chemical peels: FAQs" (patient education)',
      "American Society for Dermatologic Surgery, patient information on chemical peels",
    ],
    reviewed: false,
  },
  {
    id: "cos-medium-peel",
    name: "Medium-depth chemical peel",
    title: "Your medium-depth chemical peel",
    summary: "Medium-depth peel: preparation (incl. antiviral), the 1 to 2 week healing course, wound-style aftercare, sun avoidance.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "A medium-depth peel uses a stronger acid solution to remove the top layers of skin. It can help with sun damage, uneven color, rough patches and fine wrinkles.\n\nIt has more healing time than a light peel. Most people plan for about 1 to 2 weeks of time at home.",
      },
      {
        heading: "Before your peel",
        body: "Unless we told you otherwise:\n\n- We may ask you to use certain creams for a few weeks before to prepare your skin. Use them as prescribed.\n- Stop retinoid and acid products as directed, usually about a week before.\n- If you have ever had cold sores, tell us. We often prescribe an antiviral medicine to start before the peel.\n- Avoid tanning and sunburn for several weeks before.\n- Tell us about any acne medicine in the past year, a history of raised scars (keloids), or if you are pregnant or breastfeeding. Treatment is usually postponed in pregnancy and breastfeeding.",
      },
      {
        heading: "What to expect",
        body: "- The peel stings and burns for several minutes. We may give you something to ease this.\n- Swelling is common in the first 2 to 3 days, especially around the eyes.\n- Your skin will darken, feel tight and look like leather, then peel off over about 5 to 10 days.\n- Fresh pink skin underneath can stay pink for a few weeks.",
      },
      {
        heading: "Caring for it at home",
        body: "- Do clean your skin gently as we showed you, and keep it covered with a thin layer of plain petrolatum ointment so it doesn't dry out.\n- Do sleep with your head raised the first few nights to help swelling.\n- Do keep taking the antiviral medicine as prescribed if we gave you one.\n- Don't pick, pull or rub peeling skin. This can cause scars or dark marks.\n- Don't use makeup, retinoids, acids or scrubs until we say your skin has healed.\n- Don't go in the sun. After healing, use broad-spectrum SPF 30 or higher every day and a wide-brimmed hat.",
      },
    ],
    steps: [
      { label: "Healing ointment", slot: "both", kind: "otc", search: "petrolatum ointment", directions: "A thin layer on treated skin after gentle cleansing and whenever it feels dry, until healed." },
      { label: "Sunscreen (after healing)", slot: "am", kind: "otc", search: "zinc oxide SPF 30", directions: "Once your skin has healed: mineral broad-spectrum SPF 30 or higher every morning. Reapply every 2 hours outdoors." },
    ],
    stopRules: [
      "Increasing pain, warmth, pus, yellow crusts or spreading redness, or a fever (possible infection).",
      "Tingling, clustered small blisters or open sores (possible cold sore).",
      "Areas that are still raw or open after 2 weeks.",
      "Red, raised, firm or itchy areas as you heal (possible early scarring).",
      "Dark or light patches that appear after healing.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Chemical peels: FAQs" (patient education)',
      "American Society for Dermatologic Surgery, patient information on chemical peels",
    ],
    reviewed: false,
  },
  {
    id: "cos-microneedling",
    name: "Microneedling",
    title: "Your microneedling treatment",
    summary: "Microneedling: preparation, the 1 to 3 day redness, gentle aftercare, what to keep off the skin, sessions and timing.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Microneedling uses a device with many very fine needles to make tiny channels in the skin. As the skin repairs itself, it makes new collagen, a protein that gives skin its firmness. It is used for acne scars, fine lines and skin texture.\n\nMost people need a series of treatments, often 3 to 6 sessions spaced about 4 to 6 weeks apart. Improvement shows gradually over months.",
      },
      {
        heading: "Before your treatment",
        body: "Unless we told you otherwise:\n\n- Stop retinoid creams and acid products about 3 to 5 days before.\n- Avoid sunburn and tanning.\n- Tell us if you get cold sores, have active acne or a rash in the area, form raised scars (keloids), or are pregnant or breastfeeding.\n- Come with clean skin and no makeup. We usually apply a numbing cream first.",
      },
      {
        heading: "What to expect",
        body: "- Your skin will look red, like a sunburn, and may feel warm and tight for 1 to 3 days.\n- Some swelling and tiny dots of bleeding can happen on the day of treatment.\n- Mild dryness or flaking for a few days is common.",
      },
      {
        heading: "Caring for it at home",
        body: "- Do wash gently with lukewarm water and a mild cleanser starting that evening or the next morning.\n- Do use a plain, fragrance-free moisturizer.\n- Do use broad-spectrum sunscreen SPF 30 or higher once your skin is no longer raw, and stay out of direct sun.\n- Don't put on makeup for about 24 hours.\n- Don't use any serums or products we did not approve for the first few days. The tiny channels can let ingredients go deeper and cause irritation.\n- Don't use retinoids, acids or scrubs for about 1 week.\n- Avoid heavy sweating, swimming, saunas and hot tubs for 24 to 48 hours.",
      },
    ],
    steps: [
      { label: "Gentle cleanser", slot: "both", kind: "otc", search: "gentle cleanser", directions: "Wash gently with lukewarm water and your fingertips. Pat dry." },
      { label: "Moisturizer", slot: "both", kind: "otc", search: "fragrance-free moisturizer", directions: "A plain, fragrance-free moisturizer after washing and whenever your skin feels tight." },
      { label: "Sunscreen", slot: "am", kind: "otc", search: "SPF 30", directions: "Every morning once your skin is no longer raw: broad-spectrum SPF 30 or higher." },
    ],
    stopRules: [
      "Increasing pain, swelling, pus, yellow crusts or spreading redness after the first 2 days (possible infection).",
      "Tingling, then small clustered blisters (possible cold sore).",
      "Small red bumps or a rash that appear days to weeks after treatment.",
      "Redness or track marks that are still there after 1 week, or dark patches as you heal.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, patient education on microneedling",
      "American Society for Dermatologic Surgery, patient information on microneedling",
    ],
    reviewed: false,
  },
  {
    id: "cos-rf-microneedling",
    name: "Radiofrequency microneedling",
    title: "Your radiofrequency microneedling treatment",
    summary: "RF microneedling: device and implant screening, swelling and grid marks, aftercare, series timing.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Radiofrequency (RF) microneedling combines very fine needles with gentle heat delivered below the skin surface. The heat helps the skin make new collagen, which can improve skin texture, acne scars, fine lines and mild looseness.\n\nA series of about 3 sessions, spaced 4 to 6 weeks apart, is common. Changes appear slowly, often over 3 to 6 months after your last session.",
      },
      {
        heading: "Before your treatment",
        body: "Unless we told you otherwise:\n\n- Tell us if you have a pacemaker, defibrillator or other implanted electronic device, or metal implants in the treatment area.\n- Tell us if you get cold sores, form raised scars (keloids), or are pregnant or breastfeeding.\n- Stop retinoid creams and acid products about 3 to 5 days before.\n- Avoid sunburn and tanning for a few weeks before.\n- Come with clean skin and no makeup. We usually apply a numbing cream first.",
      },
      {
        heading: "What to expect",
        body: "- Redness, warmth and swelling are common for 1 to 3 days. Swelling can be more noticeable under the eyes and along the jaw.\n- You may see a faint grid of tiny dots or marks from the needles. These usually fade within a few days to a week.\n- Mild dryness, flaking or tiny scabs can happen as the skin heals.",
      },
      {
        heading: "Caring for it at home",
        body: "- Do wash gently with lukewarm water and a mild cleanser, starting the next morning unless we told you otherwise.\n- Do use a plain, fragrance-free moisturizer.\n- Do use broad-spectrum sunscreen SPF 30 or higher every day, and stay out of direct sun.\n- Do use a cold pack wrapped in cloth for swelling, and sleep with your head raised the first night.\n- Don't wear makeup for about 24 hours.\n- Don't pick at scabs or flakes.\n- Don't use retinoids, acids or scrubs for about 1 week.",
      },
    ],
    steps: [],
    stopRules: [
      "Blisters, burns, open sores or crusting.",
      "Increasing pain, swelling, pus or spreading redness after the first 2 days (possible infection).",
      "Tingling, then small clustered blisters (possible cold sore).",
      "Grid marks, redness or swelling that are not fading after 1 week, or dark patches as you heal.",
      "Any area that feels numb or looks sunken or dented.",
    ],
    notes: "",
    sources: [
      "American Society for Dermatologic Surgery, patient information on microneedling and radiofrequency skin tightening",
      "American Academy of Dermatology, patient education on microneedling",
    ],
    reviewed: false,
  },
  {
    id: "cos-laser-resurfacing",
    name: "Laser resurfacing (ablative and fractional)",
    title: "Your laser resurfacing treatment",
    summary: "Ablative vs fractional resurfacing: preparation (antiviral, sun, retinoids), healing timeline, wound-style aftercare.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Laser resurfacing uses laser light to treat wrinkles, sun damage, scars and uneven skin.\n\n- Ablative lasers remove thin layers of skin. Results can be more noticeable, but healing takes longer, often 1 to 2 weeks or more.\n- Fractional lasers treat tiny columns of skin and leave the skin in between untouched, so healing is faster. They are often done as a series.\n\nWe will tell you which type you are having and what your healing time is likely to be.",
      },
      {
        heading: "Before your treatment",
        body: "Unless we told you otherwise:\n\n- If you have ever had cold sores, tell us. We often prescribe an antiviral medicine to start before treatment. Take it as prescribed.\n- Stop retinoid creams and acid products about 1 week before.\n- Avoid tanning, self-tanner and sunburn for at least 4 weeks before.\n- Tell us about any acne medicine in the past year, raised scars (keloids), past radiation to the area, or pregnancy or breastfeeding. Treatment is usually postponed in pregnancy.\n- If we give you medicine that makes you drowsy, arrange a ride home.",
      },
      {
        heading: "What to expect",
        body: "- Fractional: redness and swelling for a few days, like a sunburn. The skin may look bronzed and feel sandpapery, then flake off within about a week.\n- Ablative: the skin will be raw, swollen and may ooze and crust for the first week or so. New skin forms over 1 to 2 weeks.\n- Pinkness after ablative treatment can last weeks to a few months.",
      },
      {
        heading: "Caring for it at home",
        body: "- Do clean gently as we showed you, and keep treated skin covered with a thin layer of plain petrolatum ointment until it has healed.\n- Do sleep with your head raised for the first few nights.\n- Do keep taking any antiviral or other medicine as prescribed.\n- Don't pick, scratch or rub crusts or peeling skin.\n- Don't wear makeup or use retinoids, acids or scrubs until we say your skin has healed.\n- Don't go in the sun. After healing, use broad-spectrum SPF 30 or higher daily and a wide-brimmed hat.",
      },
    ],
    steps: [
      { label: "Healing ointment", slot: "both", kind: "otc", search: "petrolatum ointment", directions: "A thin layer on treated skin after gentle cleansing and whenever it feels dry, until healed." },
      { label: "Sunscreen (after healing)", slot: "am", kind: "otc", search: "zinc oxide SPF 30", directions: "Once your skin has healed: mineral broad-spectrum SPF 30 or higher every morning. Reapply every 2 hours outdoors." },
    ],
    stopRules: [
      "Increasing pain, warmth, pus, yellow crusts, spreading redness, or a fever (possible infection).",
      "New pain or burning with clusters of small blisters or punched-out sores (possible cold sore).",
      "Areas that are still raw or oozing after 2 weeks.",
      "Red, raised, firm or itchy areas as you heal (possible early scarring).",
      "Dark or light patches, during healing or months later.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Laser resurfacing: FAQs" (patient education)',
      "American Society for Dermatologic Surgery, patient information on laser skin resurfacing",
    ],
    reviewed: false,
  },
  {
    id: "cos-ipl",
    name: "IPL / broadband light",
    title: "Your intense pulsed light (IPL) treatment",
    summary: "IPL/BBL for redness and sun spots: tan and medicine screening, the 'coffee grounds' darkening of spots, aftercare, series.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Intense pulsed light (IPL), also called broadband light, uses flashes of bright light to treat brown sun spots, redness, small broken blood vessels and uneven skin tone.\n\nMost people need a series of about 3 to 5 sessions, spaced about 3 to 4 weeks apart. IPL is not a good fit for every skin tone or for tanned skin. We will check your skin first.",
      },
      {
        heading: "Before your treatment",
        body: "Unless we told you otherwise:\n\n- Avoid sun, tanning beds and self-tanner for about 4 weeks before. Treating tanned skin raises the risk of burns and color changes.\n- Tell us about all medicines, including antibiotics and other medicines that make you sensitive to light.\n- Tell us if you have melasma, get cold sores, or are pregnant.\n- Stop retinoid creams and acid products a few days before.\n- Come with clean skin, with no makeup, lotion or self-tanner on the area.",
      },
      {
        heading: "What to expect",
        body: "Each flash feels like a quick snap of a rubber band with warmth.\n\n- Redness and mild swelling usually last a few hours to a few days.\n- Brown spots often turn darker, like coffee grounds, then flake off over 1 to 2 weeks. This is expected.\n- Small blood vessels may look darker or bruised for a short time before they fade.",
      },
      {
        heading: "Caring for it at home",
        body: "- Do use a cold pack wrapped in cloth if your skin feels warm.\n- Do wash gently and use a plain, fragrance-free moisturizer.\n- Do use broad-spectrum sunscreen SPF 30 or higher every day and stay out of strong sun between sessions.\n- Don't scrub, pick or peel the darkened spots. Let them flake off on their own.\n- Don't use retinoids, acids or scrubs for a few days, or until any redness settles.\n- Avoid hot showers, saunas and hard exercise for the first day.",
      },
    ],
    steps: [],
    stopRules: [
      "Blisters, crusting, open sores or burn marks.",
      "Pain, swelling or redness that gets worse after the first day.",
      "Dark or light patches, or lines or stripe marks, that appear after treatment.",
      "Tingling, then small clustered blisters (possible cold sore).",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, patient education on intense pulsed light (IPL) and laser treatment for sun spots and redness",
      "American Society for Dermatologic Surgery, patient information on intense pulsed light",
    ],
    reviewed: false,
  },
  {
    id: "cos-laser-hair-removal",
    name: "Laser hair removal",
    title: "Your laser hair removal treatment",
    summary: "Shave-don't-wax prep, sun and tan avoidance, normal bumps and shedding, aftercare, realistic results and session spacing.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Laser hair removal uses light that is absorbed by the pigment in the hair. The heat damages the hair root so it grows back less.\n\nIt reduces hair, but it usually does not remove all of it. Most people need about 6 or more sessions. Face sessions are often spaced about 4 weeks apart and body sessions about 6 to 8 weeks apart. Some people need touch-up sessions later. Very light, gray, white or red hair usually does not respond well.",
      },
      {
        heading: "Before your treatment",
        body: "Unless we told you otherwise:\n\n- Shave the area the day before. Shaving is fine.\n- Do not wax, pluck, thread or use an epilator for about 4 to 6 weeks before. The laser needs the hair root in place.\n- Avoid sun, tanning beds and self-tanner for about 4 weeks before.\n- Tell us about medicines that make you sensitive to light, a history of cold sores if we are treating the face, and whether you are pregnant.\n- Come with clean skin, with no lotion, deodorant or makeup on the area.",
      },
      {
        heading: "What to expect",
        body: "- Each pulse can feel like a snap of a rubber band with heat.\n- Redness and small bumps around the hairs, like goosebumps, are common for a few hours to 2 days.\n- Over 1 to 3 weeks, treated hairs fall out. This can look like regrowth at first.",
      },
      {
        heading: "Caring for it at home",
        body: "- Do use a cold pack wrapped in cloth if the area feels warm.\n- Do use broad-spectrum sunscreen SPF 30 or higher on treated skin that is exposed to sun, for the whole course of treatment.\n- Do shave between sessions if you like.\n- Don't wax, pluck or thread between sessions.\n- Avoid hot tubs, saunas and heavy sweating for 24 to 48 hours.\n- Avoid deodorant or perfumed products on treated skin for a day if it stings.",
      },
    ],
    steps: [],
    stopRules: [
      "Blisters, crusting, open sores or burn marks.",
      "Redness, swelling or pain that gets worse after the first 2 days.",
      "Dark or light patches of skin in the treated area.",
      "Tingling, then small clustered blisters, especially on the face (possible cold sore).",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Laser hair removal: FAQs" (patient education)',
      "American Society for Dermatologic Surgery, patient information on laser hair removal",
    ],
    reviewed: false,
  },
  {
    id: "cos-tattoo-removal",
    name: "Laser tattoo removal",
    title: "Your laser tattoo removal treatment",
    summary: "Realistic expectations (many sessions, color matters), the normal whitening, blisters and crusting, wound-style aftercare.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Laser tattoo removal uses very short pulses of light to break the tattoo ink into tiny pieces. Your body then slowly clears the ink over the following weeks.\n\nMost tattoos need many sessions, often 6 or more, spaced about 6 to 8 weeks apart. Black and dark blue ink usually fade best. Some colors, such as green, light blue and yellow, are harder to remove. Complete removal is not always possible, and some fading of skin color or a change in skin texture can remain.",
      },
      {
        heading: "Before your treatment",
        body: "Unless we told you otherwise:\n\n- Avoid sun, tanning and self-tanner on the area for about 4 weeks before.\n- Tell us if the tattoo is cosmetic (such as eyebrows, lip liner or eyeliner). Some white, skin-tone and red inks can turn darker with laser.\n- Tell us if you ever had an allergic reaction to a tattoo, or if you form raised scars (keloids).\n- Tell us if you are pregnant.",
      },
      {
        heading: "What to expect",
        body: "- Right after a pulse, the tattoo turns white for about 20 minutes. This is normal.\n- Redness, swelling and tenderness are common for a few days. There may be tiny spots of bleeding.\n- Blisters often form within 1 to 3 days, and a thin crust can follow. These usually heal in 1 to 2 weeks.\n- The tattoo fades a little more over the weeks after each session.",
      },
      {
        heading: "Caring for it at home",
        body: "- Do keep the area clean. Wash gently with mild soap and water once a day and pat dry.\n- Do apply a thin layer of plain petrolatum ointment and a non-stick bandage until the skin has healed.\n- Do use a cold pack wrapped in cloth for swelling.\n- Don't pop blisters or pick scabs. Let them heal on their own.\n- Don't soak the area in a bath, pool or hot tub until it has healed.\n- Once healed, use broad-spectrum sunscreen SPF 30 or higher on the area.",
      },
    ],
    steps: [
      { label: "Healing ointment", slot: "both", kind: "otc", search: "petrolatum ointment", directions: "A thin layer on the treated area after gentle washing, then cover with a non-stick bandage, until healed." },
    ],
    stopRules: [
      "Increasing pain, warmth, pus or spreading redness, or a fever (possible infection).",
      "Very large, painful blisters, or blisters that break and look infected.",
      "An itchy, raised, bumpy rash over the tattoo (possible reaction to the ink).",
      "Red, raised, firm areas as it heals (possible early scarring), or skin that stays open after 2 weeks.",
      "A cosmetic tattoo that turns darker after treatment.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, patient education on tattoo removal",
      "American Society for Dermatologic Surgery, patient information on laser tattoo removal",
    ],
    reviewed: false,
  },
  {
    id: "cos-sclerotherapy",
    name: "Sclerotherapy for leg veins",
    title: "Your sclerotherapy treatment",
    summary: "Clot-risk screening, compression and walking, expected bruising and staining, timeline, and urgent signs of a clot.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Sclerotherapy treats spider veins and small varicose veins in the legs. We inject a solution into the vein that irritates its lining, so it closes and slowly fades.\n\nSpider veins usually fade over 3 to 6 weeks. Larger veins can take 3 to 4 months. Many people need 2 or more sessions, often spaced about 4 to 6 weeks apart. Treatment does not stop new veins from forming in the future.",
      },
      {
        heading: "Before your treatment",
        body: "- Tell us if you have ever had a blood clot, if you take hormones (such as birth control pills or hormone therapy), or if you take a blood thinner. Never stop a prescribed blood thinner unless the doctor who prescribed it agrees.\n- Tell us if you are pregnant or breastfeeding. Treatment is usually postponed.\n- Tell us about any recent surgery or long trips by plane or car.\n- On the day, do not put lotion on your legs. Wear loose shorts or bring them.\n- Bring compression stockings if we asked you to get them.",
      },
      {
        heading: "What to expect",
        body: "- The injections feel like small pinches. Some solutions sting or cramp briefly.\n- Bruising, redness and small raised bumps at the injection spots are common and fade over days to weeks.\n- Treated veins may look darker or lumpy at first. Brown lines along the veins can take months to fade.\n- Sometimes a fine network of tiny red veins appears near a treated area. It often fades on its own.",
      },
      {
        heading: "Caring for it at home",
        body: "Unless we told you otherwise:\n\n- Do walk for at least 10 to 20 minutes right after treatment and every day after.\n- Do wear compression stockings as directed.\n- Don't sit or stand still for long periods. Take breaks to walk.\n- Avoid hard exercise and heavy lifting for a few days.\n- Avoid hot baths, hot tubs and saunas for a few days. Short lukewarm showers are fine.\n- Keep treated areas out of the sun until bruising fades, to lower the risk of brown marks.",
      },
    ],
    steps: [],
    stopRules: [
      "Pain, swelling, warmth or redness in one calf or leg, especially if it gets worse (possible clot; call us the same day).",
      "Sudden shortness of breath or chest pain: call 911.",
      "Sudden vision changes, weakness or numbness on one side, or trouble speaking: call 911.",
      "A red, hard, tender cord along a treated vein that is getting worse.",
      "A sore, blister or dark open spot at an injection site.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, patient education on sclerotherapy for leg veins",
      "American Society for Dermatologic Surgery, patient information on sclerotherapy",
    ],
    reviewed: false,
  },
  {
    id: "cos-deoxycholic-acid",
    name: "Deoxycholic acid injections (under-chin fat)",
    title: "Your under-chin fat injection treatment",
    summary: "Deoxycholic acid for submental fat: screening, expected swelling and numbness, aftercare, series, nerve and swallowing warnings.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Deoxycholic acid is a medicine injected into fat under the chin. It breaks down fat cells in the treated area, and your body clears them over the following weeks.\n\nMost people need more than one session. Sessions are spaced at least 1 month apart, and several sessions are common. Results show gradually after each one. It is not a weight-loss treatment.",
      },
      {
        heading: "Before your treatment",
        body: "- Tell us if you have had trouble swallowing, an infection in the area, or surgery or cosmetic treatment on your face, neck or chin.\n- Tell us about bleeding problems and all medicines, including blood thinners and aspirin. Never stop a prescribed blood thinner on your own.\n- Tell us if you are pregnant or breastfeeding. Treatment is usually postponed.\n- Plan for visible swelling for 1 to 2 weeks. It may be more noticeable after the first session.",
      },
      {
        heading: "What to expect",
        body: "We give a number of small injections under the chin. Burning or stinging during treatment is common.\n\n- Swelling under the chin is expected and can be large. It usually goes down over 1 to 2 weeks.\n- Bruising, tenderness, numbness and firmness under the chin are common. Numbness and firmness can last several weeks.\n- Each session's results usually take 4 to 6 weeks to show.",
      },
      {
        heading: "Caring for it at home",
        body: "Unless we told you otherwise:\n\n- Do use a cold pack wrapped in cloth for 10 to 15 minutes at a time.\n- Do sleep with your head raised the first few nights.\n- Do use an over-the-counter pain reliever as directed on the label if you need one, unless you've been told to avoid it.\n- Don't massage the area.\n- Avoid hard exercise and tight collars or chin straps for a few days.",
      },
    ],
    steps: [],
    stopRules: [
      "An uneven smile, a crooked lower lip, or weakness of the lower lip.",
      "Trouble swallowing (get help right away if it is severe or you can't swallow liquids).",
      "Sores, scabs, open areas or dark or bluish skin over the treated area.",
      "Swelling or pain that is getting worse after the first 3 days, or warmth, pus or fever.",
      "Hair loss in the treated area.",
    ],
    notes: "",
    sources: [
      "FDA prescribing information for deoxycholic acid injection (dosage and administration; warnings: marginal mandibular nerve injury, dysphagia, injection-site ulceration and necrosis)",
      "American Academy of Dermatology, patient education on treatments to reduce a double chin",
    ],
    reviewed: false,
  },
  {
    id: "cos-cryolipolysis",
    name: "Cryolipolysis (fat freezing)",
    title: "Your fat freezing (cryolipolysis) treatment",
    summary: "Cold-condition screening, what the session feels like, expected numbness and delayed soreness, results timeline, rare enlargement.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Cryolipolysis cools a pinchable bulge of fat to a temperature that damages fat cells but not the skin. Your body slowly clears the damaged fat cells over the next few months.\n\nIt is meant for small areas of fat that don't respond to diet and exercise, such as the belly, flanks or under the chin. It is not a weight-loss treatment, and it does not treat loose skin or cellulite. Some people want a second session on the same area.",
      },
      {
        heading: "Before your treatment",
        body: "Tell us if you have:\n\n- A condition triggered by cold, such as cryoglobulinemia, cold agglutinin disease or paroxysmal cold hemoglobinuria. Treatment is not safe with these.\n- Raynaud's (fingers that turn white or blue in the cold), cold hives, or poor feeling in the area.\n- A hernia, recent surgery or scars in the area.\n- A pregnancy, or are breastfeeding.\n\nWear comfortable clothes. Bring something to read or watch: a session can take about 35 to 60 minutes per area.",
      },
      {
        heading: "What to expect",
        body: "- You will feel pulling and intense cold for the first several minutes. The area then usually goes numb.\n- After the applicator comes off, the area may look red and firm. We may massage it briefly, which can be uncomfortable.\n- Redness, swelling, bruising, tingling and tenderness are common for days to a couple of weeks.\n- Numbness can last several weeks.\n- Some people feel aching, itching or sharp pain a few days later. This usually fades within a couple of weeks.\n- Changes usually show after 1 to 3 months.",
      },
      {
        heading: "Caring for it at home",
        body: "- You can usually go back to normal activities right away.\n- Wear loose, comfortable clothing over the area.\n- For soreness, an over-the-counter pain reliever as directed on the label can help, unless you've been told to avoid it.\n- Don't put heating pads or ice on numb skin. You may not feel it if the skin is getting hurt.",
      },
    ],
    steps: [],
    stopRules: [
      "Blisters, skin that turns dark, gray or hard, or open sores in the treated area.",
      "Severe pain, or pain that keeps getting worse instead of better.",
      "A painful bulge, nausea or vomiting after a belly treatment (possible hernia problem).",
      "The treated area becomes larger, firmer or more defined weeks to months after treatment.",
    ],
    notes: "",
    sources: [
      "FDA-cleared device labeling for cryolipolysis systems (contraindications: cryoglobulinemia, cold agglutinin disease, paroxysmal cold hemoglobinuria; warnings including paradoxical adipose hyperplasia)",
      "American Academy of Dermatology, patient education on cryolipolysis (fat freezing)",
      "American Society for Dermatologic Surgery, patient information on fat reduction",
    ],
    reviewed: false,
  },
  {
    id: "cos-prp-hair",
    name: "Platelet-rich plasma (PRP) for hair loss",
    title: "Your platelet-rich plasma (PRP) treatment for hair loss",
    summary: "PRP for hair loss: what it is and evidence limits, screening, what to expect, scalp aftercare, session schedule.",
    category: "cosmetic",
    sections: [
      {
        heading: "What it is",
        body: "Platelet-rich plasma (PRP) is made from a small sample of your own blood. We spin the blood in a machine to concentrate the platelets, the parts of blood that help with healing. The PRP is then injected into thinning areas of the scalp.\n\nPRP may help some people with certain types of hair loss, but results vary and it does not work for everyone. It often works best together with other hair-loss treatments. A common plan is about 3 sessions about 1 month apart, then follow-up sessions every few months. Any change usually takes 3 to 6 months to see.",
      },
      {
        heading: "Before your treatment",
        body: "- Tell us if you have a bleeding or platelet disorder, cancer, an infection, or a scalp condition.\n- Tell us about all medicines, including blood thinners and aspirin. Pain relievers like ibuprofen may make PRP work less well. Ask us whether to pause them, and never stop a prescribed blood thinner or aspirin on your own.\n- Eat a meal and drink plenty of water beforehand to lower the chance of feeling faint during the blood draw.\n- Wash your hair the morning of treatment, and skip hair sprays and gels.",
      },
      {
        heading: "What to expect",
        body: "- The scalp injections can sting. Numbing is often used.\n- Tenderness, mild swelling, a headache or tiny spots of bleeding are common for a day or two.\n- Swelling can move down to the forehead or around the eyes the next day. It usually fades within a few days.",
      },
      {
        heading: "Caring for it at home",
        body: "Unless we told you otherwise:\n\n- Wait until the next day to wash your hair. Then use a gentle shampoo and lukewarm water.\n- For discomfort, acetaminophen as directed on the label is usually preferred over ibuprofen or similar pain relievers for a few days.\n- Avoid hair dye, perms, relaxers and other chemical treatments for a few days.\n- Avoid hard exercise, saunas and hot tubs for the rest of the day.\n- Keep using your other hair-loss treatments as directed, unless we told you to pause them.",
      },
    ],
    steps: [],
    stopRules: [
      "Increasing pain, swelling, warmth, pus or spreading redness on the scalp, or a fever (possible infection).",
      "Any change in vision, or skin on the scalp or forehead that turns pale, dusky or blotchy (call us right away).",
      "A severe headache, or swelling around the eyes that is getting worse after 2 days.",
      "Patches of new or faster hair loss.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, patient education on platelet-rich plasma (PRP) for hair loss",
      "American Society for Dermatologic Surgery, patient information on platelet-rich plasma",
    ],
    reviewed: false,
  },
  {
    id: "cos-pre-procedure-prep",
    name: "Preparing skin before cosmetic procedures",
    title: "Getting your skin ready for a cosmetic procedure",
    summary: "General prep: pausing retinoids and actives, sun and tan avoidance, cold-sore history, medicines and supplements, day-of tips.",
    category: "cosmetic",
    sections: [
      {
        heading: "Why preparation matters",
        body: "Getting your skin ready helps lower the chance of irritation, infection and color changes, and helps your skin heal well. The steps below are general. Your care team may give you different timing for your specific treatment. If so, follow their instructions.",
      },
      {
        heading: "Pause strong skin products",
        body: "Unless we told you otherwise:\n\n- Stop retinoids (tretinoin, adapalene, tazarotene, retinol) about 3 to 7 days before peels, lasers, light treatments and microneedling.\n- Stop acid products and scrubs (glycolic, salicylic or lactic acid, and grainy scrubs) for the same time.\n- Do not wax, use hair-removal creams or have other treatments on the area for about 1 week before.\n- Keep using a gentle cleanser, a plain moisturizer and sunscreen.",
      },
      {
        heading: "Protect your skin from the sun",
        body: "Tanned or sunburned skin is more likely to burn or develop dark or light patches after lasers, light treatments and peels.\n\n- Avoid sunbathing, tanning beds and self-tanner for about 4 weeks before light and laser treatments.\n- Use broad-spectrum sunscreen SPF 30 or higher every day, and wear a hat outdoors.\n- If you get a sunburn or tan before your visit, tell us. We may need to reschedule.",
      },
      {
        heading: "Tell us about your health",
        body: "- Cold sores: if you have ever had them, tell us. Some procedures can trigger an outbreak, and we may prescribe an antiviral medicine to start before.\n- Medicines and supplements: bring a full list. Fish oil, vitamin E and some pain relievers can increase bruising. Ask before stopping anything, and never stop a prescribed blood thinner on your own.\n- Acne medicines you have taken in the past year.\n- Raised scars (keloids), dark marks after injuries, or melasma.\n- Pregnancy or breastfeeding. Most cosmetic procedures are postponed.",
      },
      {
        heading: "On the day",
        body: "- Come with clean skin, with no makeup, lotion or self-tanner on the area.\n- If you have a rash, infection, open sore or cold sore in the area, call us first.\n- Plan around events: bruising and redness can take 1 to 2 weeks to fade.",
      },
    ],
    steps: [
      { label: "Gentle cleanser", slot: "both", kind: "otc", search: "gentle cleanser", directions: "Wash gently with lukewarm water and your fingertips. Pat dry." },
      { label: "Moisturizer", slot: "both", kind: "otc", search: "fragrance-free moisturizer", directions: "A plain, fragrance-free moisturizer after washing." },
      { label: "Sunscreen", slot: "am", kind: "otc", search: "SPF 30", directions: "Every morning: broad-spectrum SPF 30 or higher. Reapply every 2 hours outdoors." },
    ],
    stopRules: [
      "A cold sore, rash, infection or open sore in the area to be treated before your visit.",
      "A sunburn or new tan on the area to be treated.",
      "You started a new medicine, including antibiotics or acne medicine, since we planned your treatment.",
      "You become pregnant or are planning a pregnancy.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, patient education on preparing for cosmetic procedures (chemical peels, laser treatments)",
      "American Society for Dermatologic Surgery, patient information on preparing for cosmetic procedures",
    ],
    reviewed: false,
  },
  {
    id: "cos-between-treatments",
    name: "Caring for your skin between treatments",
    title: "Caring for your skin between cosmetic treatments",
    summary: "Daily sun protection, restarting products, why sessions are spaced, realistic expectations, and what to tell us before the next visit.",
    category: "cosmetic",
    sections: [
      {
        heading: "Why spacing matters",
        body: "Many cosmetic treatments work best as a series. Your skin needs time between sessions to heal fully and to build new collagen, which happens slowly over weeks.\n\n- Sessions are often spaced about 4 weeks apart or more, depending on the treatment.\n- Going back too soon can raise the risk of irritation, color changes and scarring, without better results.\n- Please don't add treatments elsewhere, such as peels, lasers or facials, without telling us first.",
      },
      {
        heading: "Sun protection every day",
        body: "Sun exposure can undo results and cause dark patches, especially after lasers, light treatments and peels.\n\n- Use broad-spectrum sunscreen SPF 30 or higher every morning, even on cloudy days.\n- Reapply every 2 hours outdoors and after swimming or sweating.\n- Wear a wide-brimmed hat and seek shade, especially midday.\n- Skip tanning beds and self-tanner during your treatment series.",
      },
      {
        heading: "Your daily routine",
        body: "- Use a gentle cleanser and a plain moisturizer.\n- Restart retinoids, acids and other active products only once your skin has fully healed, and when we say it's okay. Start slowly, every other night at first.\n- Stop these products again a few days before your next session, as directed.",
      },
      {
        heading: "Realistic expectations",
        body: "Most cosmetic treatments improve the skin gradually. They do not make it perfect, and results vary from person to person.\n\n- Changes often take weeks to months to show.\n- Taking photos in the same light every few weeks can help you see slow changes.\n- Aging and sun exposure continue, so many results need maintenance over time.\n- If you're not happy with your progress, talk with us. We can review your goals and options.",
      },
    ],
    steps: [
      { label: "Gentle cleanser", slot: "both", kind: "otc", search: "gentle cleanser", directions: "Wash gently with lukewarm water and your fingertips. Pat dry." },
      { label: "Moisturizer", slot: "both", kind: "otc", search: "fragrance-free moisturizer", directions: "A plain, fragrance-free moisturizer after washing and whenever your skin feels dry." },
      { label: "Sunscreen", slot: "am", kind: "otc", search: "SPF 30", directions: "Every morning: broad-spectrum SPF 30 or higher. Reapply every 2 hours outdoors and after sweating or swimming." },
    ],
    stopRules: [
      "Side effects from your last session (redness, peeling, crusting, swelling) that have not settled by your next visit.",
      "New dark or light patches, or areas of raised or thickened skin.",
      "A cold sore, rash or infection in the treated area before your next session.",
      "You started a new medicine, or you are pregnant or planning a pregnancy.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Sunscreen FAQs" (patient education)',
      "American Society for Dermatologic Surgery, patient information on cosmetic treatment aftercare",
    ],
    reviewed: false,
  },
];
