// Skin conditions patient-education handouts (skin cancer, growths, pigment,
// hair and nails) for the clinician handout library.
// DRAFTED BY CLAUDE (AI), NOT YET REVIEWED: every handout here goes to the
// dermatologist's approve / edit / cut review (review/handout-library-review.html)
// and shows a "draft" marker until reviewed=true.
import type { HandoutTemplate } from "@/db/handout-templates";

export const CONDITIONS_GROWTHS_HANDOUTS: HandoutTemplate[] = [
  // ---------------------------------------------------------------- skin cancer and precancer
  {
    id: "cond-actinic-keratoses",
    name: "Actinic keratoses: overview and treatment",
    title: "Actinic keratoses (sun damage spots)",
    summary: "What AKs are, why we treat them, freezing vs. field creams, what a treatment reaction looks like, sun protection.",
    category: "conditions",
    sections: [
      {
        heading: "What they are",
        body:
          "Actinic keratoses (AKs) are rough, scaly spots caused by years of sun exposure. They are often easier to feel than to see. They show up most on the face, ears, scalp, lips, backs of the hands and forearms.\n\nAKs are called \"precancers.\" Most never become cancer, but a small number can turn into a skin cancer called squamous cell carcinoma. That is why we treat them and keep an eye on your skin.",
      },
      {
        heading: "How we treat them",
        body:
          "- Freezing (cryotherapy): we spray very cold liquid on single spots. The area may sting, then turn red, blister or crust. It usually heals in 1 to 3 weeks.\n- Creams for a whole area (field treatment): you put a prescription cream on a larger patch of skin, as prescribed. This treats spots you can see and ones that are just starting.\n- Light treatment (photodynamic therapy): we apply a liquid to the skin, then shine a special light on it.\n- Thick or unusual spots may need a biopsy (a small skin sample) to make sure they are not cancer.\n\nIf you are pregnant, planning a pregnancy or breastfeeding, tell us. Some creams, such as 5-fluorouracil, are not used in pregnancy.",
      },
      {
        heading: "What to expect with a treatment cream",
        body:
          "With field creams, the skin usually gets red, scaly and crusty, and may feel sore or raw. This reaction is expected and means the cream is working on damaged skin. It often looks worse before it looks better.\n\n- Use the cream only for the number of days we prescribed.\n- Wash your hands after applying it, and keep it away from your eyes, lips and the inside of your nose.\n- A plain moisturizer or petrolatum can soothe the skin once you finish, unless we told you otherwise.\n- The skin usually heals within a few weeks after you stop.",
      },
      {
        heading: "Protecting your skin from here on",
        body:
          "Having AKs means your skin has had a lot of sun. New spots can keep appearing, so protection matters for the rest of your life.\n\n- Use a broad-spectrum sunscreen, SPF 30 or higher, every day on exposed skin. Reapply every 2 hours outdoors.\n- Wear a wide-brimmed hat, sunglasses and long sleeves when you can.\n- Seek shade, especially from about 10 a.m. to 4 p.m.\n- Use a lip balm with SPF.\n- Never use tanning beds.\n- Check your skin once a month and keep your regular skin checks with us.",
      },
    ],
    steps: [],
    stopRules: [
      "A spot that grows quickly, becomes thick, tender or painful, or bleeds.",
      "A spot that comes back or does not go away after treatment.",
      "A cream reaction that is much stronger than we described: open sores, severe pain, or redness spreading well past where you applied it.",
      "A sore, scaly or cracked area on the lip that does not heal.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Actinic keratosis: Overview" and "Actinic keratosis: Diagnosis and treatment" (patient education)',
      'Skin Cancer Foundation, "Actinic Keratosis" (patient education)',
      "Eisen DB et al. Guidelines of care for the management of actinic keratosis. J Am Acad Dermatol 2021 (AAD)",
    ],
    reviewed: false,
  },
  {
    id: "cond-basal-cell-carcinoma",
    name: "Basal cell carcinoma: after diagnosis",
    title: "You have a basal cell carcinoma: what happens next",
    summary: "What a BCC diagnosis means, the usual treatment options, follow-up skin checks and sun protection.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Basal cell carcinoma (BCC) is the most common type of skin cancer. It is mostly caused by sun exposure over many years.\n\nHearing the word \"cancer\" can be scary. The good news is that BCC grows slowly and very rarely spreads to other parts of the body. When it is treated, it is usually cured. If it is left alone, though, it can keep growing deeper and damage the skin and tissue around it. That is why we treat it.",
      },
      {
        heading: "How it is treated",
        body:
          "The best treatment depends on the type of BCC, its size and where it is. We will talk with you about which is right for you. Common choices:\n\n- Surgical removal (excision): we numb the skin, cut out the cancer with a small border of normal skin, and close it with stitches.\n- Mohs surgery: the cancer is removed in thin layers and checked under a microscope during the visit until it is all gone. Often used on the face, ears and for larger BCCs or ones that came back.\n- Scraping and burning (curettage and electrodesiccation): used for some small, low-risk BCCs on the body.\n- Prescription creams or light treatment: used for some very shallow (superficial) BCCs.\n- Radiation: an option for some people who cannot have surgery.",
      },
      {
        heading: "After treatment",
        body:
          "If you had surgery, follow the wound care instructions we gave you. Most scars look pink or raised at first and fade over several months.\n\nHaving one BCC means you have a higher chance of getting another skin cancer in the future. This is not a sign that the treatment failed. It reflects the sun damage your skin has already had.",
      },
      {
        heading: "Follow-up and sun protection",
        body:
          "- Keep your skin check appointments, usually at least once a year, or as often as we recommend.\n- Check your own skin once a month in good light, using a mirror for your back or asking someone to help.\n- Look for a new shiny or pearly bump, a pink scaly patch, or a sore that bleeds and does not heal.\n- Use broad-spectrum SPF 30 or higher every day, wear a hat and protective clothing, and seek shade.\n- Never use tanning beds.",
      },
    ],
    steps: [],
    stopRules: [
      "A sore that bleeds, scabs over and opens again, or does not heal in about 4 weeks.",
      "A new shiny or pearly bump, or a pink scaly patch that keeps growing.",
      "A bump, sore or scab that appears in or next to the scar where the cancer was treated.",
      "Redness, warmth, swelling or pus at a surgery site, or a fever.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Basal cell carcinoma: Diagnosis and treatment" (patient education)',
      'Skin Cancer Foundation, "Basal Cell Carcinoma" (patient education)',
      "Kim JYS et al. Guidelines of care for the management of basal cell carcinoma. J Am Acad Dermatol 2018 (AAD Work Group)",
    ],
    reviewed: false,
  },
  {
    id: "cond-squamous-cell-carcinoma",
    name: "Squamous cell carcinoma: after diagnosis",
    title: "You have a squamous cell carcinoma: what happens next",
    summary: "What an SCC diagnosis means, treatment options, follow-up including lymph node checks, higher-risk groups, sun protection.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Squamous cell carcinoma (SCC) is the second most common type of skin cancer. It is mostly caused by sun exposure over many years. It often looks like a rough, scaly patch, a firm bump, or a sore that does not heal.\n\nMost SCCs are found early and are cured with treatment. Unlike basal cell carcinoma, an SCC has a small chance of spreading, most often to nearby lymph nodes (small glands in the neck, armpits and groin). The risk is higher for large or deep SCCs, ones on the lip or ear, and in people with a weakened immune system. That is why we treat SCC promptly and follow you closely afterward.",
      },
      {
        heading: "How it is treated",
        body:
          "The best treatment depends on the SCC's size, depth and location. We will go over your options.\n\n- Surgical removal (excision) with a border of normal skin, closed with stitches.\n- Mohs surgery: removing the cancer in thin layers, checked under a microscope during the visit. Often used on the face, ears, lips and for higher-risk SCCs.\n- Scraping and burning (curettage and electrodesiccation) for some small, low-risk SCCs.\n- For SCC that is only in the top layer of skin (\"in situ\"), prescription creams or light treatment may be options.\n- Radiation may be used for some people.\n\nA few higher-risk SCCs need extra tests or care from other specialists. We will tell you if that applies to you.",
      },
      {
        heading: "Follow-up",
        body:
          "After an SCC, you have a higher chance of getting another skin cancer. Regular checks help us find any new ones early, when they are easiest to treat.\n\n- Keep your skin check appointments as often as we recommend. This is often every few months at first for higher-risk SCCs, and at least once a year after that.\n- At visits we may also feel the lymph nodes near the treated area.\n- If you have had an organ transplant, take medicines that weaken your immune system, or have a condition such as chronic leukemia, tell us. You will likely need more frequent checks.",
      },
      {
        heading: "Caring for your skin at home",
        body:
          "- Check your skin once a month, including your scalp, ears, lips, and the backs of your hands.\n- Gently feel the skin around your scar and the lymph nodes in your neck, armpits or groin on that side.\n- Use broad-spectrum SPF 30 or higher every day. Reapply every 2 hours outdoors.\n- Wear a wide-brimmed hat, protective clothing and SPF lip balm.\n- Never use tanning beds.",
      },
    ],
    steps: [],
    stopRules: [
      "A new lump under the skin near your scar, or in your neck, armpit or groin, that lasts more than 2 weeks.",
      "A new scaly patch or bump that grows quickly, is tender, or bleeds.",
      "A sore that does not heal in about 4 weeks.",
      "Any change, bump or sore in the scar where the cancer was treated.",
      "Redness, warmth, swelling or pus at a surgery site, or a fever.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Squamous cell carcinoma: Diagnosis and treatment" (patient education)',
      'Skin Cancer Foundation, "Squamous Cell Carcinoma" (patient education)',
      "Alam M et al. Guidelines of care for the management of cutaneous squamous cell carcinoma. J Am Acad Dermatol 2018 (AAD Work Group)",
    ],
    reviewed: false,
  },
  {
    id: "cond-melanoma-after-diagnosis",
    name: "Melanoma: after diagnosis (next steps, follow-up, family)",
    title: "You have a melanoma: what happens next",
    summary: "What the pathology report guides, wide excision and possible lymph node testing, follow-up schedule, self-checks, what it means for family.",
    category: "conditions",
    sections: [
      {
        heading: "What it means",
        body:
          "Melanoma is a skin cancer that starts in the cells that give skin its color. It is serious, but when it is found early it is usually treated with surgery alone, and most people do very well.\n\nYour biopsy report tells us important details, such as how deep the melanoma goes (its thickness). These details decide your next steps. We will go over your report with you. It is normal to feel worried. Write down your questions and bring someone with you to visits if that helps.",
      },
      {
        heading: "What happens next",
        body:
          "- Wider removal (wide local excision): almost everyone with melanoma has a second, larger surgery. We remove a border of normal-looking skin around the biopsy site to make sure no melanoma cells are left. The size of the border depends on the melanoma's depth.\n- Lymph node testing: for some melanomas, we may talk about a sentinel lymph node biopsy. This checks the first lymph node the melanoma would drain to. Many thin melanomas do not need it.\n- Other tests or specialists: depending on the stage, some people get scans or see a cancer doctor (oncologist) or surgeon. Many people with early melanoma do not need scans.\n\nWe will explain which of these apply to you.",
      },
      {
        heading: "Follow-up visits",
        body:
          "After melanoma, you need regular full skin exams. People who have had one melanoma have a higher chance of getting another.\n\n- Visits are often every 3 to 12 months for the first few years, depending on your stage, then at least once a year for life. We will set your schedule.\n- At visits we check all your skin and may feel your lymph nodes.\n- Keep every appointment, even when you feel well.",
      },
      {
        heading: "Checking your own skin",
        body:
          "Check your whole body once a month in good light, with a full-length and a hand mirror, or with a partner's help. Include your scalp, between your toes, the soles of your feet, under your nails and the genital area. Photos can help you notice changes.\n\nLook for the ABCDEs: Asymmetry, uneven Borders, more than one Color, Diameter larger than a pencil eraser, and Evolving (changing). Also look for an \"ugly duckling\": a spot that looks different from your other moles.\n\nGently feel around your scar and the lymph nodes in your neck, armpits and groin.",
      },
      {
        heading: "What it means for your family",
        body:
          "Your parents, brothers, sisters and children have a higher chance of melanoma than average. Encourage them to:\n\n- Get a full skin exam by a dermatologist.\n- Check their own skin monthly and protect it from the sun.\n- Avoid tanning beds.\n\nIf two or more people in your family have had melanoma, or if family members have had pancreatic cancer, tell us. We may suggest genetic counseling.",
      },
      {
        heading: "Protecting your skin",
        body:
          "- Use broad-spectrum SPF 30 or higher every day, and reapply every 2 hours outdoors.\n- Wear a wide-brimmed hat, sunglasses and protective clothing.\n- Seek shade, especially from about 10 a.m. to 4 p.m.\n- Never use tanning beds.\n- Ask us before starting any vitamin D supplement, since you may be getting less sun.",
      },
    ],
    steps: [],
    stopRules: [
      "A new mole or spot, or a mole that changes in size, shape or color, itches, or bleeds.",
      "Any lump, bump, dark spot or color change in or next to your scar.",
      "A swollen lymph node or lump in your neck, armpit or groin that lasts more than 2 weeks.",
      "New symptoms that last more than 2 weeks with no clear cause, such as weight loss, ongoing cough, headaches or bone pain.",
      "Redness, warmth, swelling or pus at a surgery site, or a fever.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Melanoma: Diagnosis and treatment" (patient education)',
      "Swetter SM et al. Guidelines of care for the management of primary cutaneous melanoma. J Am Acad Dermatol 2019 (AAD Work Group)",
      "National Comprehensive Cancer Network, NCCN Guidelines for Patients: Melanoma",
      'Skin Cancer Foundation, "Melanoma" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-atypical-moles",
    name: "Atypical (dysplastic) moles",
    title: "Atypical moles: what they mean and how to watch them",
    summary: "What an atypical mole or biopsy result means, why removing all moles is not needed, self-exams, family checks.",
    category: "conditions",
    sections: [
      {
        heading: "What they are",
        body:
          "Atypical moles (also called dysplastic nevi) are moles that look different from common moles. They are often larger than a pencil eraser, with uneven edges or more than one shade of brown or pink.\n\nAn atypical mole is not cancer. Most never turn into melanoma. But people who have atypical moles, especially many of them, have a higher chance of getting melanoma somewhere on their skin over their lifetime. Many melanomas start as a brand-new spot rather than in an existing mole. So the goal is to watch all of your skin, not just these moles.",
      },
      {
        heading: "If your biopsy showed an atypical mole",
        body:
          "Under the microscope, atypical moles are graded as mild, moderate or severe.\n\n- Mild: often no more treatment is needed, even if the edges of the sample were not completely clear.\n- Moderate or severe: we may recommend removing a little more skin around the site to make sure the whole mole is gone.\n\nWe will tell you which applies to you. Sometimes a little color comes back in the scar. Let us know if it does, so we can check it.",
      },
      {
        heading: "Why we don't remove every mole",
        body:
          "Removing all of your moles does not prevent melanoma, because many melanomas show up as new spots. It also leaves many scars. Instead, we watch your skin closely and remove moles that change or look worrisome. Photos of your skin, taken by you or by us, make changes easier to spot.",
      },
      {
        heading: "Watching your skin at home",
        body:
          "Check your whole body once a month in good light. Use a full-length mirror and a hand mirror, or ask someone to help with your back and scalp.\n\n- Look for the ABCDEs: Asymmetry, uneven Borders, more than one Color, Diameter larger than a pencil eraser, and Evolving (changing).\n- Look for an \"ugly duckling\": a mole that looks different from all your others.\n- Taking photos every few months helps you compare.\n- Keep your regular skin checks with us.",
      },
      {
        heading: "Sun protection and family",
        body:
          "- Use broad-spectrum SPF 30 or higher every day. Wear hats and protective clothing.\n- Never use tanning beds.\n- Atypical moles often run in families. If you have many of them or a family history of melanoma, your parents, siblings and children should have their skin checked too.",
      },
    ],
    steps: [],
    stopRules: [
      "A mole that changes in size, shape or color, or starts to itch, crust or bleed.",
      "A new mole as an adult that keeps growing or looks different from your other moles.",
      "Dark color coming back in or around a biopsy scar.",
      "A family member is diagnosed with melanoma (tell us at your next visit).",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Atypical moles: Overview" and "What to look for: ABCDEs of melanoma" (patient education)',
      'Skin Cancer Foundation, "Atypical Moles" (patient education)',
    ],
    reviewed: false,
  },

  // ---------------------------------------------------------------- benign growths
  {
    id: "cond-seborrheic-keratoses",
    name: "Seborrheic keratoses",
    title: "Seborrheic keratoses (harmless \"stuck-on\" growths)",
    summary: "What SKs are, that they are harmless, removal options and what to expect, when a spot needs a second look.",
    category: "conditions",
    sections: [
      {
        heading: "What they are",
        body:
          "Seborrheic keratoses (SKs) are very common, harmless skin growths. They look waxy, rough or \"stuck on,\" and can be tan, brown or black. They often appear on the chest, back, face and scalp, and most people get more of them as they age. They tend to run in families.\n\nSKs are not cancer and do not turn into cancer. They are not contagious.\n\nIn people with brown or black skin, many small dark bumps on the face and neck (called dermatosis papulosa nigra) are a closely related, harmless condition.",
      },
      {
        heading: "Do they need treatment?",
        body:
          "No. Treatment is only needed if a growth gets irritated, itches, catches on clothing or jewelry, or bothers you. If removal is only for looks, insurance often treats it as cosmetic, so ask us about this first.\n\nWays we remove them:\n\n- Freezing (cryotherapy)\n- Scraping (curettage), sometimes with light burning to stop bleeding\n- Burning with an electric needle (electrocautery) or laser\n\nThe treated skin usually crusts and heals in 1 to 3 weeks. It may stay lighter or darker than the skin around it for a while, especially in darker skin. Removing an SK does not stop new ones from appearing.",
      },
      {
        heading: "Caring for them at home",
        body:
          "- Don't pick, scratch or try to cut them off. This can cause bleeding, infection and scars.\n- A plain fragrance-free moisturizer can calm dry, itchy growths.\n- If one gets irritated by a bra strap or waistband, a soft bandage can help until we see it.\n- Keep checking all your skin monthly. Seborrheic keratoses can look like other spots, so point out any that look different from the rest.",
      },
    ],
    steps: [],
    stopRules: [
      "A growth that bleeds without being injured, grows quickly, or looks different from your other spots.",
      "Many new growths that appear suddenly over a few weeks.",
      "A treated spot that does not heal within about 4 weeks, or comes back looking different.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Seborrheic keratoses: Overview" and "Seborrheic keratoses: Diagnosis and treatment" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-epidermoid-cysts",
    name: "Epidermoid cysts",
    title: "Epidermoid cysts",
    summary: "What a cyst is, why squeezing makes it worse, inflamed cysts, drainage vs. full removal.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "An epidermoid cyst is a small sac under the skin. The sac is filled with keratin, a soft, cheesy material that skin makes. It may have a bad smell if it leaks. Cysts are often on the face, neck, chest, back or behind the ears. Many have a tiny dark pore on top.\n\nPeople sometimes call these \"sebaceous cysts.\" They are not cancer and are not contagious.",
      },
      {
        heading: "What to expect",
        body:
          "A cyst can stay the same size for years. Sometimes the sac breaks under the skin, and the area becomes red, swollen and painful. This is called an inflamed cyst. It is often not an infection, but it can look like one.\n\n- A calm cyst that doesn't bother you can be left alone.\n- An inflamed cyst may need an injection to calm it, or a small cut to drain it. Draining relieves pain, but the sac stays behind, so the cyst can come back.\n- Removing the whole sac (a minor surgery, usually done once the cyst is calm) gives the best chance it will not return. It leaves a scar.",
      },
      {
        heading: "Caring for it at home",
        body:
          "Do:\n- Leave it alone and keep the skin clean.\n- For a sore, swollen cyst, hold a warm, damp washcloth on it for 10 to 15 minutes, a few times a day.\n- Cover it with a bandage if it drains.\n\nDon't:\n- Squeeze, pop or poke it with a needle. This pushes the contents deeper, causes inflammation, and makes scarring and regrowth more likely.\n- Try to cut it out yourself.",
      },
    ],
    steps: [],
    stopRules: [
      "The cyst becomes very painful, hot or swollen, or red streaks spread from it.",
      "Fever or chills along with a sore cyst.",
      "Pus draining from the cyst.",
      "A lump that grows quickly, feels hard, or seems stuck in place.",
      "The cyst comes back after removal.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Cysts: Overview" and "Cysts: Diagnosis and treatment" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-lipomas",
    name: "Lipomas",
    title: "Lipomas (soft fatty lumps)",
    summary: "What a lipoma is, when removal makes sense, and the features that call for a closer look.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "A lipoma is a soft, rubbery lump made of fat cells. It sits just under the skin and usually moves a little when you press on it. Lipomas grow slowly and are usually painless. They are common on the back, shoulders, neck, arms and trunk.\n\nLipomas are not cancer. Some people get several, and they can run in families.",
      },
      {
        heading: "Do they need treatment?",
        body:
          "Most lipomas do not need treatment. We may suggest removing one if it:\n\n- Is painful or presses on something\n- Keeps growing\n- Bothers you because of how it looks or where it is\n- Looks or feels unusual, so we want to be sure what it is\n\nThe usual treatment is a minor surgery under local numbing to cut it out. This leaves a scar. For some lipomas, especially large or deep ones, we may order an imaging test such as an ultrasound or MRI first. A lipoma can occasionally come back after removal.",
      },
      {
        heading: "Keeping an eye on it",
        body:
          "- Notice its size from time to time. A photo next to a coin or ruler makes it easier to compare.\n- There is nothing you need to put on it.\n- Don't try to squeeze or drain it. Unlike a cyst, a lipoma has no opening and nothing to squeeze out.",
      },
    ],
    steps: [],
    stopRules: [
      "The lump grows quickly, or becomes larger than about 5 cm (2 inches, about the size of a golf ball).",
      "The lump becomes hard, painful, or stops moving when you press on it.",
      "A new lump that feels deep, under the muscle.",
      "Numbness, tingling or weakness near the lump.",
    ],
    notes: "",
    sources: [
      'American Academy of Family Physicians (familydoctor.org), "Lipomas" (patient education)',
      'MedlinePlus (U.S. National Library of Medicine), "Lipoma"',
    ],
    reviewed: false,
  },
  {
    id: "cond-skin-tags-cherry-angiomas",
    name: "Skin tags and cherry angiomas",
    title: "Skin tags and cherry angiomas",
    summary: "Two common harmless growths: what they are, removal options, why not to remove them at home.",
    category: "conditions",
    sections: [
      {
        heading: "Skin tags",
        body:
          "Skin tags are small, soft flaps of skin that hang from a thin stalk. They are common on the neck, armpits, eyelids, groin and under the breasts, where skin rubs against skin or clothing.\n\nThey become more common with age, weight gain and pregnancy. People with high blood sugar or diabetes also tend to get more of them. If you have many skin tags, ask your primary care doctor whether a blood sugar test makes sense.\n\nSkin tags are harmless and do not turn into cancer.",
      },
      {
        heading: "Cherry angiomas",
        body:
          "Cherry angiomas are small, bright red to purple dots or bumps made of tiny blood vessels. Most adults get some, and they often increase after age 30. They are usually on the trunk, arms and legs.\n\nThey are harmless. They can bleed a lot if scratched or nicked because they are made of blood vessels.",
      },
      {
        heading: "Removal",
        body:
          "Neither needs treatment. We can remove them if they get irritated, catch on clothing or jewelry, bleed, or bother you. If removal is only for looks, insurance often treats it as cosmetic, so ask us first.\n\n- Skin tags: snipped off, frozen, or burned with an electric needle.\n- Cherry angiomas: treated with a laser or an electric needle.\n\nThe area usually heals in 1 to 2 weeks. New ones may still appear over time.",
      },
      {
        heading: "Caring for them at home",
        body:
          "- Don't cut, tie off or freeze skin tags yourself. They can bleed more than you expect, and the area can get infected or scar.\n- Avoid over-the-counter \"removal\" products unless we recommend one. Some contain harsh acids that can burn the skin.\n- If an angioma or skin tag bleeds, press firmly on it with clean gauze for 10 to 15 minutes without peeking.",
      },
    ],
    steps: [],
    stopRules: [
      "A red bump that grows quickly over a few weeks and bleeds easily.",
      "A spot that keeps bleeding after 15 minutes of firm pressure.",
      "A skin tag that turns dark, swollen and painful (it may have twisted).",
      "A growth that changes color, shape or size, or looks different from your others.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Skin tags: Why they appear and how dermatologists remove them" (patient education)',
      'DermNet, "Cherry angioma" and "Skin tag" (patient information)',
    ],
    reviewed: false,
  },

  // ---------------------------------------------------------------- infections that look like growths
  {
    id: "cond-warts-adults",
    name: "Warts in adults (common and plantar)",
    title: "Warts: common and plantar warts",
    summary: "What warts are, home salicylic acid routine, office treatments, preventing spread, foot cautions with diabetes.",
    category: "conditions",
    sections: [
      {
        heading: "What they are",
        body:
          "Warts are skin growths caused by a common virus called human papillomavirus (HPV). The virus infects the top layer of skin, often through tiny cuts.\n\n- Common warts: rough, raised bumps, often on the hands and fingers.\n- Plantar warts: on the soles of the feet. Walking presses them flat, so they can hurt like a pebble in your shoe. They often have tiny black dots, which are small clotted blood vessels.\n\nWarts spread by touch and from damp floors in showers and pool areas. The types that cause hand and foot warts are different from those that cause genital warts.",
      },
      {
        heading: "What to expect",
        body:
          "Many warts go away on their own, but in adults this can take months to years. Treatment works by slowly destroying the wart or helping your immune system fight it. Most treatments take several weeks or several visits, and warts can come back. Being patient and sticking with treatment makes the biggest difference.",
      },
      {
        heading: "Treating warts at home",
        body:
          "Over-the-counter salicylic acid is a good first treatment for many warts. Use it as directed on the label, usually every day for up to 12 weeks:\n\n- Soak the wart in warm water for 5 to 10 minutes.\n- Gently file off the dead white skin with an emery board or pumice stone. Use that file only for the wart and don't share it.\n- Apply the salicylic acid to the wart only, not the skin around it.\n- Cover it with a bandage or tape if the label says to.\n\nIf you have diabetes, poor circulation or numbness in your feet, do not treat foot warts yourself. Ask us first.",
      },
      {
        heading: "Treatments in our office",
        body:
          "If home treatment hasn't worked, options include freezing (often repeated every 2 to 4 weeks), blistering liquids, prescription creams, injections and lasers. Freezing can cause a blister and soreness for a few days.\n\nTell us if you are pregnant or breastfeeding. Some wart treatments are not used during pregnancy.",
      },
      {
        heading: "Preventing spread",
        body:
          "- Don't pick, bite or shave over warts.\n- Wash your hands after touching a wart.\n- Wear flip-flops in locker rooms, gym showers and pool areas.\n- Keep your feet dry, and change socks if they get sweaty.\n- Don't share towels, razors, nail files or shoes.",
      },
    ],
    steps: [
      {
        label: "Salicylic acid wart treatment",
        slot: "pm",
        kind: "otc",
        search: "salicylic acid wart",
        directions:
          "As directed on the label: soak the wart, file off dead skin, then apply to the wart only and cover. Not on the feet if you have diabetes, poor circulation or numbness unless we told you to.",
      },
    ],
    stopRules: [
      "A growth that bleeds, changes color or shape, or grows quickly.",
      "A wart around or under a nail that is painful or is damaging the nail.",
      "Redness, swelling, pus or pain spreading around a treated wart.",
      "Warts that keep multiplying, or no improvement after about 12 weeks of treatment.",
      "Any foot wart or foot sore if you have diabetes, poor circulation or numb feet.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Warts: Diagnosis and treatment" and "Warts: Tips for managing" (patient education)',
      'American Academy of Family Physicians (familydoctor.org), "Warts" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-molluscum-adults",
    name: "Molluscum contagiosum in adults",
    title: "Molluscum contagiosum",
    summary: "Adult molluscum: how it spreads (including sexual contact), what to expect, treatment, stopping spread, STI testing.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Molluscum contagiosum is a common skin infection caused by a virus. It causes small, firm, smooth bumps that are skin-colored, pink or pearly. Many bumps have a tiny dent in the center.\n\nIt spreads by skin-to-skin contact, by sharing towels or razors, and from one part of your body to another by scratching or shaving. In adults it is often spread through sexual contact, so the bumps are commonly on the lower belly, inner thighs and genital area.\n\nIf you have bumps in the genital area, we may suggest testing for other sexually transmitted infections. If you have many or large bumps, especially on the face, we may suggest checking your immune system.",
      },
      {
        heading: "What to expect",
        body:
          "Molluscum is harmless and does not leave lasting effects in most people. Without treatment, bumps usually go away on their own. This often takes 6 to 12 months and sometimes longer, as new bumps can keep appearing.\n\nA bump may become red and swollen before it goes away. This is often a sign that your body is clearing it, not an infection.",
      },
      {
        heading: "Treatment",
        body:
          "In adults, we often treat molluscum so it does not spread to other areas or to partners. Options include:\n\n- Freezing (cryotherapy)\n- Scraping the bumps off (curettage)\n- A blistering liquid applied in the office\n- Prescription creams or gels, used as prescribed\n\nMore than one visit is often needed. Tell us if you are pregnant or breastfeeding, since some treatments are not used then.",
      },
      {
        heading: "Stopping the spread",
        body:
          "- Don't scratch, pick or squeeze the bumps.\n- Don't shave or wax over areas with bumps. Trimming with clippers is safer until they clear.\n- Cover bumps with clothing or a bandage when you can.\n- Don't share towels, washcloths, razors or clothing.\n- Avoid sexual contact while there are bumps in the genital area. Condoms do not cover all the skin, so they do not fully prevent spread.\n- Wash your hands after touching a bump.",
      },
    ],
    steps: [],
    stopRules: [
      "Bumps on or near the eyelid, or a red, irritated eye.",
      "Bumps spreading quickly, or many large bumps.",
      "A bump that becomes very painful, hot or swollen, or drains pus.",
      "Bumps in the genital area that have not been checked by us.",
    ],
    notes: "",
    sources: [
      'Centers for Disease Control and Prevention, "Molluscum Contagiosum" (patient information)',
      'American Academy of Dermatology, "Molluscum contagiosum: Diagnosis and treatment" (patient education)',
    ],
    reviewed: false,
  },

  // ---------------------------------------------------------------- pigment
  {
    id: "cond-vitiligo",
    name: "Vitiligo: overview",
    title: "Living with vitiligo",
    summary: "What vitiligo is, treatment options and realistic timelines, sun protection, cover-up options, emotional support.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Vitiligo causes patches of skin to lose their color and turn white. It happens when the immune system attacks the cells that make pigment. Hair in the patches may also turn white.\n\nVitiligo is not contagious and is not caused by anything you did or ate. It does not harm your general health. Some people with vitiligo also have thyroid disease or another immune condition, so we may suggest blood tests.\n\nThe most common type shows up on both sides of the body, often on the face, hands, feet, and around the eyes and mouth. Another type stays on one side or one area.",
      },
      {
        heading: "Treatment",
        body:
          "Treatment aims to stop new patches and bring color back. Options include:\n\n- Prescription creams or ointments, such as steroid creams, calcineurin inhibitor ointments, or a JAK-inhibitor cream, used as prescribed\n- Light therapy (narrowband UVB), usually 2 to 3 times a week in the office\n- Pills to calm the immune system when vitiligo is spreading quickly\n- Skin grafting procedures for stable patches that haven't responded\n\nColor comes back slowly, often as small dots that join together. It can take 3 to 6 months to see change and a year or more for the full effect. The face usually responds best, the hands and feet the least.",
      },
      {
        heading: "Caring for your skin",
        body:
          "- White patches burn easily. Use broad-spectrum SPF 30 or higher every day and wear protective clothing.\n- Sunburn, cuts, scrapes and constant rubbing can trigger new patches. Protect your skin and choose clothes that don't rub.\n- Avoid tanning beds.\n- Self-tanners (with dihydroxyacetone) and cover-up makeup can even out skin tone. Try a small area first.\n- Tanning the skin around the patches makes them stand out more, so sun protection also helps them look less noticeable.",
      },
      {
        heading: "Your feelings matter too",
        body:
          "Vitiligo can affect how you feel about yourself. Feeling self-conscious, sad or anxious is common. Tell us how you are doing. Support groups, in person or online, help many people, and talking with a counselor can help too.",
      },
    ],
    steps: [],
    stopRules: [
      "New patches appearing quickly over a few weeks.",
      "Sunburn or blisters on the white patches.",
      "Thinning skin, stretch marks or a new rash where you use a prescription cream.",
      "Signs of a thyroid problem: unusual tiredness, weight change, feeling too hot or cold, or a racing heart.",
      "Feeling down or anxious about your skin most days.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Vitiligo: Overview" and "Vitiligo: Diagnosis and treatment" (patient education)',
      'National Institute of Arthritis and Musculoskeletal and Skin Diseases (NIAMS), "Vitiligo" (health topic)',
    ],
    reviewed: false,
  },
  {
    id: "cond-melasma-education",
    name: "Melasma: what it is (education)",
    title: "Understanding melasma",
    summary: "Education companion to the melasma regimen: causes and triggers, realistic expectations, treatment overview, daily habits.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Melasma causes brown or gray-brown patches, usually on the cheeks, forehead, upper lip, bridge of the nose and chin. It is more common in women and in people with medium to dark skin.\n\nSeveral things work together to cause it:\n\n- Sunlight, and also visible light and heat\n- Hormones: pregnancy (sometimes called \"the mask of pregnancy\"), birth control pills and hormone therapy\n- Genes: it often runs in families\n\nMelasma is not harmful and is not contagious. It is a long-term condition that can be controlled, but it often comes back.",
      },
      {
        heading: "What to expect",
        body:
          "Melasma improves slowly. Most treatments take 2 to 3 months to show a difference, and it can take longer. Even after it fades, sun exposure and heat can bring it back quickly, so most people need some ongoing care.\n\nMelasma that starts in pregnancy may fade on its own in the months after the baby is born, but not always.",
      },
      {
        heading: "Treatment options",
        body:
          "- Daily sun protection is the base of every plan. Without it, other treatments don't work well.\n- Prescription lightening creams, such as hydroquinone or a combination cream, used on the patches for a limited time as prescribed.\n- Other creams, such as azelaic acid or a retinoid.\n- Tranexamic acid, as a cream or as prescription pills. Pills are not right for everyone, especially people with a history of blood clots.\n- Chemical peels or certain lasers in some cases. These must be done carefully, because heat and irritation can make melasma darker.\n\nIf you are pregnant, planning a pregnancy or breastfeeding, tell us. Many melasma treatments, including retinoids, are avoided then.",
      },
      {
        heading: "Daily habits that help",
        body:
          "- Use a tinted mineral sunscreen with iron oxides, SPF 30 or higher, every morning. Tint helps block visible light.\n- Reapply every 2 hours outdoors, and wear a wide-brimmed hat.\n- Avoid heat when you can: saunas, hot yoga, and long time near ovens or stoves.\n- Use gentle, fragrance-free skin care. Irritation can darken patches.\n- Avoid waxing the areas with melasma.\n- Don't use skin lighteners bought online or from unknown sources. Some contain mercury or hidden steroids.",
      },
    ],
    steps: [],
    stopRules: [
      "Patches that turn darker, gray or blue-black while using a lightening cream (stop the cream and call us).",
      "Redness, burning, peeling or a rash from a treatment cream.",
      "If you take tranexamic acid pills: leg swelling or pain, chest pain, or shortness of breath (get emergency care).",
      "A single dark spot that changes in size, shape or color, or looks different from your melasma.",
      "You become pregnant or start breastfeeding.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Melasma: Overview" and "Melasma: Diagnosis and treatment" (patient education)',
      'U.S. Food and Drug Administration, consumer warning on skin-lightening products that contain mercury (consumer update)',
    ],
    reviewed: false,
  },
  {
    id: "cond-post-inflammatory-hyperpigmentation",
    name: "Post-inflammatory hyperpigmentation (dark marks)",
    title: "Dark marks after acne, rashes or injury",
    summary: "What PIH is, how long it lasts, treating the cause, helpful ingredients, what not to do.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Post-inflammatory hyperpigmentation (PIH) is a flat dark mark left behind after the skin has been inflamed or hurt. Common causes are acne, eczema, bug bites, burns, cuts and some skin treatments.\n\nThe marks can be tan, brown, dark brown or gray. They are more common and last longer in people with medium to dark skin.\n\nPIH is not a scar. The skin's texture is normal. The darker color comes from extra pigment that was made while the skin was healing.",
      },
      {
        heading: "What to expect",
        body:
          "PIH usually fades on its own over time. Marks near the surface often fade over several months. Deeper marks, which tend to look gray or blue-gray, can take a year or longer.\n\nTreatment can speed things up, but it still takes time. Most people need 2 to 3 months to notice a difference.",
      },
      {
        heading: "What helps",
        body:
          "- Treat the cause first. If acne or eczema keeps flaring, new marks will keep forming.\n- Use broad-spectrum SPF 30 or higher every day. Sun makes dark marks darker and slows fading. A tinted sunscreen gives extra protection.\n- Ingredients that can help fade marks include azelaic acid, niacinamide, vitamin C and retinoids such as adapalene. Use over-the-counter products as directed on the label.\n- For stubborn marks, we may prescribe a lightening cream or a stronger retinoid, as prescribed, or talk about peels.\n\nIf you are pregnant, planning a pregnancy or breastfeeding, tell us. Retinoids and some lightening creams are avoided then.",
      },
      {
        heading: "What to avoid",
        body:
          "- Picking, squeezing or scratching spots. This causes more marks.\n- Scrubs, rough washcloths and harsh products. Irritation can make PIH worse.\n- Home remedies like lemon juice or baking soda, which can burn the skin.\n- Skin lighteners bought online or from unknown sources. Some contain mercury or hidden steroids.\n- Starting several new products at once. Add one at a time so you can tell what irritates.",
      },
    ],
    steps: [],
    stopRules: [
      "Marks get darker or spread even with treatment.",
      "Redness, burning or peeling from a product that does not settle after you stop it.",
      "A dark patch that appears without any rash or injury before it.",
      "A dark spot that changes in size, shape or color, or is raised.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Hyperpigmentation: How to fade dark spots" and acne-mark patient guidance (patient education)',
      'DermNet, "Postinflammatory hyperpigmentation" (patient information)',
    ],
    reviewed: false,
  },

  // ---------------------------------------------------------------- hair
  {
    id: "cond-alopecia-areata",
    name: "Alopecia areata",
    title: "Alopecia areata: patchy hair loss",
    summary: "What alopecia areata is, the unpredictable course, treatment options from injections to JAK pills, coping and cover-up options.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Alopecia areata is a condition where the immune system attacks hair follicles (the roots that make hair). It usually causes round, smooth bald patches on the scalp. It can also affect the beard, eyebrows, eyelashes or body hair. Some people also get tiny dents or ridges in their nails.\n\nThe hair follicles are not destroyed, so hair can grow back. Alopecia areata is not contagious and is not caused by anything you did. It is more common in people with other immune conditions, such as thyroid disease, or with eczema or allergies.",
      },
      {
        heading: "What to expect",
        body:
          "Alopecia areata is unpredictable. Many people with only a few small patches regrow their hair within a year, sometimes without treatment. It can come back later, though. A smaller number of people lose more hair, and in some cases all scalp or body hair.\n\nNew hair may grow in white or fine at first. It usually gets its normal color and texture back over time.",
      },
      {
        heading: "Treatment options",
        body:
          "Treatment can help hair regrow but does not cure the condition. What we suggest depends on how much hair is affected.\n\n- Steroid injections into the patches, usually every 4 to 6 weeks. This is common for a few patches.\n- Steroid creams, solutions or foams, used as prescribed\n- Minoxidil, to support regrowth\n- Medicine applied to the scalp to cause a mild allergic rash that can trigger regrowth\n- For severe or widespread hair loss: JAK-inhibitor pills. These need blood tests and regular check-ins.\n\nMost treatments take at least 3 months to show results. Tell us if you are pregnant, planning a pregnancy or breastfeeding, since some treatments are not used then.",
      },
      {
        heading: "Coping and day-to-day care",
        body:
          "- Bald areas of the scalp can sunburn. Use sunscreen or wear a hat.\n- Wigs, hairpieces, scarves, hats, and eyebrow pencils or powders can help you feel more like yourself.\n- If you lose eyelashes, glasses can help protect your eyes from dust.\n- Hair loss can be very upsetting. Support groups, in person or online, help many people. Tell us how you're coping.",
      },
    ],
    steps: [],
    stopRules: [
      "Hair loss that spreads quickly or affects large areas.",
      "Loss of eyebrows or eyelashes.",
      "Redness, scaling, pain or scarring in a bald patch.",
      "A dent in the skin at an injection site that does not fill back in after a few months.",
      "Feeling down, anxious or withdrawn because of your hair loss.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Alopecia areata: Overview" and "Alopecia areata: Diagnosis and treatment" (patient education)',
      'National Alopecia Areata Foundation, "What is alopecia areata?" (patient information)',
      'National Institute of Arthritis and Musculoskeletal and Skin Diseases (NIAMS), "Alopecia Areata" (health topic)',
    ],
    reviewed: false,
  },
  {
    id: "cond-female-pattern-hair-loss",
    name: "Female pattern hair loss",
    title: "Female pattern hair loss",
    summary: "What FPHL is, checking for other causes, minoxidil (and early shedding), prescription options, pregnancy cautions, hair care.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Female pattern hair loss is the most common cause of thinning hair in women. Hair slowly gets thinner on the top of the head, and the part gets wider. The hairline at the front usually stays in place.\n\nIt happens because hair follicles slowly shrink and make finer, shorter hairs. Genes and hormones both play a role. It can start any time after puberty and often becomes more noticeable around menopause.",
      },
      {
        heading: "Checking for other causes",
        body:
          "Other things can cause or add to thinning, such as low iron, thyroid problems, recent illness or stress, and some medicines. We may order blood tests, such as iron and thyroid levels.\n\nIf you have irregular periods, adult acne or extra hair growth on the face or body, tell us. We may check your hormone levels.",
      },
      {
        heading: "Treatment",
        body:
          "Treatment works best to stop more thinning and can regrow some hair. Starting early helps.\n\n- Minoxidil applied to the scalp is available without a prescription. Use it as directed on the label.\n- Many people shed more hair in the first 1 to 2 months of minoxidil. This usually means new hairs are pushing out old ones, so keep going.\n- It takes about 6 to 12 months to see results. If you stop, the hair you gained is usually lost within a few months.\n- Prescription options, used as prescribed, include minoxidil pills and spironolactone. Other options include platelet-rich plasma (PRP) injections and laser light devices.\n\nIf you are pregnant, planning a pregnancy or breastfeeding, tell us. Minoxidil and spironolactone are not used then.",
      },
      {
        heading: "Hair care tips",
        body:
          "- Wash and style gently. Normal washing does not cause more hair loss.\n- Avoid tight ponytails, braids and extensions that pull on the hair.\n- Limit harsh chemical treatments and high heat.\n- A shorter cut, a new part, volumizing products, or colored scalp powders can make thinning less noticeable.\n- Biotin and hair supplements don't help unless you are low in a nutrient. Biotin can also throw off some blood tests, so tell your doctors if you take it.",
      },
    ],
    steps: [
      {
        label: "Minoxidil (scalp)",
        slot: "as-directed",
        kind: "otc",
        search: "minoxidil 5% foam",
        directions:
          "As directed on the label, to a dry scalp over the thinning areas. Wash your hands afterward. Use it every day; results take 6 to 12 months. Not during pregnancy or breastfeeding.",
      },
    ],
    stopRules: [
      "Sudden heavy shedding, bald patches, or scalp redness, scaling, pain or burning.",
      "New irregular periods, acne, or extra hair growth on the face or body.",
      "With minoxidil: dizziness, a racing heartbeat, chest pain, or swelling of the hands or feet.",
      "Unwanted hair growth on the face that bothers you.",
      "You become pregnant or start breastfeeding.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Hair loss in women" and "Hair loss: Diagnosis and treatment" (patient education)',
      "FDA OTC labeling: minoxidil topical solution and foam for women (directions; warnings)",
    ],
    reviewed: false,
  },
  {
    id: "cond-male-pattern-hair-loss",
    name: "Male pattern hair loss",
    title: "Male pattern hair loss",
    summary: "What male pattern balding is, minoxidil and finasteride (including side effects and handling cautions), other options.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Male pattern hair loss is the most common cause of hair loss in men. It usually starts with a receding hairline at the temples, thinning at the crown, or both. It can begin as early as the late teens or twenties.\n\nIt is caused by genes and a hormone called DHT, which slowly shrinks hair follicles. Over time they make shorter, finer hairs until some stop growing hair at all.",
      },
      {
        heading: "Treatment",
        body:
          "Treatment works best to keep the hair you have and can regrow some. The earlier you start, the more you can keep.\n\n- Minoxidil on the scalp, without a prescription. Use it as directed on the label. Extra shedding in the first 1 to 2 months is common and usually means new hairs are coming in.\n- Finasteride, a prescription pill taken as prescribed. It lowers DHT and slows hair loss for most men.\n- Other options include minoxidil pills, platelet-rich plasma (PRP) injections, laser light devices and hair transplant surgery.\n\nResults take 6 to 12 months. Treatments only work while you use them. If you stop, the hair you gained or kept is usually lost within months.",
      },
      {
        heading: "About finasteride",
        body:
          "Most men have no side effects. A small number notice a lower sex drive, trouble with erections or less semen. Mood changes, including depression, have also been reported. Tell us about any of these.\n\n- Finasteride lowers PSA, a blood test for prostate health. Tell any doctor ordering a PSA test that you take it.\n- People who are or may become pregnant should not handle crushed or broken tablets.\n- Don't donate blood while taking it, and ask us how long to wait after stopping.",
      },
      {
        heading: "Helpful tips",
        body:
          "- Take photos of your scalp in the same light every 3 to 6 months. Changes are slow and hard to see day to day.\n- Shampoos, supplements and vitamins sold for hair loss are mostly unproven.\n- Biotin can throw off some blood tests. Tell your doctors if you take it.\n- A shorter haircut can make thinning less noticeable.\n- Protect a thinning scalp from the sun with a hat or sunscreen.",
      },
    ],
    steps: [
      {
        label: "Minoxidil (scalp)",
        slot: "as-directed",
        kind: "otc",
        search: "minoxidil 5% foam",
        directions:
          "As directed on the label, to a dry scalp over the thinning areas. Wash your hands afterward. Use it every day; results take 6 to 12 months.",
      },
    ],
    stopRules: [
      "Patchy hair loss, or scalp redness, scaling, pain or burning.",
      "With finasteride: low mood, depression or thoughts of self-harm (stop it and call us; for a crisis, call or text 988).",
      "With finasteride: a lump, pain or discharge in the breast area.",
      "With finasteride: sexual side effects that bother you.",
      "With minoxidil: dizziness, a racing heartbeat, chest pain, or swelling of the hands or feet.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Hair loss: Diagnosis and treatment" (patient education)',
      "FDA labels: finasteride 1 mg tablets (warnings and precautions; patient information); minoxidil topical OTC labeling",
    ],
    reviewed: false,
  },
  {
    id: "cond-telogen-effluvium",
    name: "Telogen effluvium (shedding after illness, stress or childbirth)",
    title: "Hair shedding after illness, stress or childbirth",
    summary: "Why sudden shedding happens months after a trigger, what's normal, the usual timeline to recovery, what helps.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Telogen effluvium is a type of hair shedding that happens all over the scalp. A shock to the body pushes many hairs into their resting phase at the same time. A few months later, those hairs fall out together.\n\nCommon triggers:\n\n- High fever or a serious illness, including COVID-19\n- Surgery\n- Having a baby\n- Major emotional stress\n- Fast weight loss or a very strict diet\n- Starting or stopping some medicines, including birth control pills\n- Low iron or a thyroid problem",
      },
      {
        heading: "What to expect",
        body:
          "Shedding usually starts about 2 to 3 months after the trigger, which is why the cause is often not obvious. You may see lots of hair in the shower, on your pillow or in your brush. Many fallen hairs have a small white bulb at the root. That is normal for this kind of shedding.\n\nThe good news is that the hair roots are not damaged. Once the trigger has passed, shedding usually slows within about 6 months. You may notice short new hairs at your hairline. Getting back your full thickness can take 6 to 12 months or more, because hair grows slowly.\n\nAfter childbirth, shedding often peaks a few months after the baby is born and settles by the baby's first birthday.",
      },
      {
        heading: "Finding the cause",
        body:
          "We may order blood tests, such as iron and thyroid levels, and review your medicines and recent health. Treating a cause like low iron helps the hair recover. Don't stop a prescribed medicine on your own. Talk to us or the doctor who prescribed it first.",
      },
      {
        heading: "What helps",
        body:
          "- Eat regular, balanced meals with enough protein.\n- Keep washing and brushing your hair normally. Washing less won't save hairs that are already going to fall out.\n- Be gentle: avoid tight hairstyles, harsh chemical treatments and high heat.\n- Take supplements only if a test shows you are low in something.\n- Be patient. Taking a photo every month or two can help you see the recovery.\n- In some cases we may suggest minoxidil to help regrowth.",
      },
    ],
    steps: [],
    stopRules: [
      "Heavy shedding that continues for more than 6 months.",
      "Bald patches, or thinning that is mainly on the top of the head or at the part.",
      "Scalp redness, scaling, pain or burning.",
      "Tiredness, weight change, feeling cold, or very heavy periods along with the shedding.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Hair shedding" (patient education)',
      'DermNet, "Telogen effluvium" (patient information)',
    ],
    reviewed: false,
  },

  // ---------------------------------------------------------------- nails
  {
    id: "cond-ingrown-toenails",
    name: "Ingrown toenails",
    title: "Ingrown toenails",
    summary: "Causes, home care for mild cases, office treatment, prevention, and cautions for diabetes or poor circulation.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "An ingrown toenail happens when the edge of a nail grows into the skin beside it. It most often affects the big toe. The skin gets red, swollen and sore, and it can become infected.\n\nCommon causes:\n\n- Cutting nails too short or rounding the corners\n- Tight or pointed shoes\n- Stubbing or injuring the toe\n- Naturally curved nails, which can run in families\n- Sweaty feet",
      },
      {
        heading: "Home care for a mild ingrown nail",
        body:
          "If the toe is only a little red and sore, home care often helps:\n\n- Soak your foot in warm water for 10 to 15 minutes, 2 to 3 times a day.\n- After soaking, dry the toe well. Gently place a small piece of cotton or waxed dental floss under the edge of the nail to help it grow above the skin. Change it daily.\n- Apply petroleum jelly and a bandage.\n- Wear roomy shoes or open-toed sandals.\n- Take an over-the-counter pain reliever as directed on the label if needed.\n\nDon't dig out or cut the nail edge yourself. Cutting a V in the nail does not help.\n\nIf you have diabetes, poor circulation or numbness in your feet, skip home care and see us or a foot doctor.",
      },
      {
        heading: "Treatment in our office",
        body:
          "If home care isn't working or the toe is infected, we can numb the toe and remove the ingrown edge of the nail. For nails that keep growing in, we may also treat the nail root so that edge does not grow back.\n\nAfterward, follow the wound care instructions we give you. The toe is usually sore for a few days and heals over a few weeks.",
      },
      {
        heading: "Preventing it",
        body:
          "- Cut toenails straight across, and leave the corners slightly visible above the skin.\n- Don't cut them too short.\n- Wear shoes with enough room for your toes, and protective shoes for work or sports.\n- Keep your feet clean and dry.",
      },
    ],
    steps: [],
    stopRules: [
      "Pus, increasing redness, swelling or warmth, or red streaks spreading up the foot.",
      "Fever or chills.",
      "No improvement after 3 to 5 days of home care.",
      "Any ingrown nail if you have diabetes, poor circulation or numb feet.",
      "After a nail procedure: bleeding that doesn't stop with 15 minutes of pressure, or pain that keeps getting worse.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "How to treat an ingrown toenail" (patient education)',
      'American Academy of Family Physicians (familydoctor.org), "Ingrown Toenails" (patient education)',
    ],
    reviewed: false,
  },
  {
    id: "cond-brittle-nails",
    name: "Brittle and splitting nails",
    title: "Brittle and splitting nails",
    summary: "Common causes, nail-care do's and don'ts, why improvement takes months, when to look for another cause.",
    category: "conditions",
    sections: [
      {
        heading: "What it is",
        body:
          "Brittle nails split, peel in layers, or break easily. This is very common, especially in women and as people get older.\n\nThe most common causes are things that dry out the nail:\n\n- Hands in water often, such as washing dishes or frequent handwashing\n- Cleaning products and other harsh chemicals\n- Nail polish remover, especially acetone\n- Gel or acrylic nails and their removal\n- Cold, dry weather\n\nLess often, brittle nails are linked to low iron, thyroid problems, or a skin condition such as psoriasis.",
      },
      {
        heading: "What to expect",
        body:
          "Nails grow slowly. A fingernail takes about 4 to 6 months to grow out completely, and a toenail can take a year or more. The damaged part won't repair itself, so you will see improvement as healthier nail grows in from the base. Give your new routine at least a few months.",
      },
      {
        heading: "Caring for your nails",
        body:
          "Do:\n- Wear cotton-lined rubber gloves for dishes, cleaning and other wet work.\n- Rub a thick moisturizer into your nails and cuticles after washing your hands and at bedtime.\n- Keep nails short and file them in one direction with a fine file.\n- Use an acetone-free polish remover, and remove polish no more than about once a week.\n\nDon't:\n- Use your nails as tools to open, scrape or pry.\n- Pick, peel or bite your nails or cuticles.\n- Cut or push back your cuticles. They protect the nail.\n- Peel off gel polish. Give your nails breaks from gel and acrylic nails.",
      },
      {
        heading: "About supplements",
        body:
          "Biotin is often sold for nails. A few small studies suggest it may help some people, but the evidence is limited. Biotin can also throw off some blood tests, including thyroid and heart tests. If you take it, tell your doctors before blood work. If we find you are low in iron, treating that may help your nails.",
      },
    ],
    steps: [
      {
        label: "Hand and nail moisturizer",
        slot: "both",
        kind: "otc",
        search: "hand cream",
        directions:
          "After every handwashing and at bedtime, rub into the nails and cuticles. Thick, fragrance-free creams or ointments work best.",
      },
    ],
    stopRules: [
      "A nail that changes color, thickens, crumbles, or lifts off the nail bed.",
      "A new dark streak in a nail.",
      "Pain, redness or swelling around a nail.",
      "Brittle nails along with tiredness, hair loss, feeling cold, or other new symptoms.",
      "No improvement after about 6 months of gentle nail care.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Nail care: 12 tips for healthy nails" and "Tips for healthy nails" (patient education)',
      'DermNet, "Brittle nails" (patient information)',
    ],
    reviewed: false,
  },
  {
    id: "cond-nail-psoriasis-nail-changes",
    name: "Nail psoriasis and nail changes worth a visit",
    title: "Nail psoriasis and other nail changes to have checked",
    summary: "What nail psoriasis looks like, treatment and nail care, the joint link, plus a list of nail changes that need a visit.",
    category: "conditions",
    sections: [
      {
        heading: "Nail psoriasis",
        body:
          "Psoriasis can affect the fingernails and toenails, sometimes even when there is little or no psoriasis on the skin. Signs include:\n\n- Small dents or pits in the nail\n- The nail lifting off the skin underneath, often with white or yellow color at the tip\n- Orange-brown \"oil drop\" spots under the nail\n- Thick, crumbly or ridged nails\n\nNail psoriasis can look like a nail fungus. We may test a nail clipping to tell them apart.",
      },
      {
        heading: "Nail psoriasis and your joints",
        body:
          "People with nail psoriasis have a higher chance of psoriatic arthritis. Tell us if you have joint pain, swelling or stiffness, morning stiffness that lasts more than 30 minutes, a swollen finger or toe, or heel pain. Treating arthritis early helps protect your joints.",
      },
      {
        heading: "Treatment and nail care",
        body:
          "Treatment options include prescription creams or solutions, injections into the skin around the nail, and medicines for psoriasis that work through the whole body. All are used as prescribed. Nails grow slowly, so it usually takes several months to see a change.\n\nAt home:\n- Keep nails short so they don't catch and lift further.\n- Wear gloves for wet work and protect your hands from injury. Injury can trigger psoriasis.\n- Don't dig or clean under a lifted nail. This makes it lift more.\n- Don't push back or cut your cuticles.\n- Nail polish can hide changes, but remove it with an acetone-free remover.",
      },
      {
        heading: "Other nail changes to have checked",
        body:
          "Ask us to look at:\n\n- A new dark brown or black streak in a nail, especially in just one nail, or one that widens or spreads onto the skin around it\n- A bump, growth, bleeding or sore under or around a nail that doesn't heal\n- A nail that lifts or splits because of something growing under it\n- Thick, yellow, crumbly nails (fungus, psoriasis or other causes)\n- Red, swollen, painful skin around a nail\n- Fingertips that become rounded with nails that curve over them\n\nMany nail changes are harmless, such as small white spots from minor bumps. Lines across all nails can appear a few months after an illness and grow out on their own.",
      },
    ],
    steps: [],
    stopRules: [
      "A new or changing dark streak in a nail, or dark color on the skin next to a nail.",
      "A bump, bleeding or a sore at a nail that does not heal in a few weeks.",
      "Painful, swollen or stiff joints, or a swollen finger or toe.",
      "Red, swollen, painful skin around a nail, or pus.",
      "A change in only one nail that keeps getting worse.",
    ],
    notes: "",
    sources: [
      'American Academy of Dermatology, "Nail psoriasis: Overview" and "Nail psoriasis: Diagnosis and treatment" (patient education)',
      'American Academy of Dermatology, "Nail changes a dermatologist should examine" (patient education)',
      'National Psoriasis Foundation, "Nail Psoriasis" (patient information)',
    ],
    reviewed: false,
  },
];
