// Surgery & procedures patient-education handouts for the clinician handout library.
// DRAFTED BY CLAUDE (AI), NOT YET REVIEWED: every handout here goes to the
// dermatologist's approve / edit / cut review (review/handout-library-review.html)
// and shows a "draft" marker until reviewed=true.
import type { HandoutTemplate, TemplateStep } from "@/db/handout-templates";

const PETROLATUM: TemplateStep = {
  label: "Healing ointment",
  slot: "as-directed",
  kind: "otc",
  search: "petrolatum",
  directions: "After washing, a thin layer of plain petrolatum ointment on the wound with a clean cotton swab. Keep the wound moist until it has fully healed.",
};
const NONSTICK_BANDAGE: TemplateStep = {
  label: "Bandage",
  slot: "as-directed",
  kind: "otc",
  search: "nonstick bandage",
  directions: "Cover with a nonstick pad and tape, or an adhesive bandage. Change it once a day, or sooner if it gets wet or dirty.",
};

export const PROCEDURE_HANDOUTS: HandoutTemplate[] = [
  {
    id: "proc-preparing-for-skin-surgery",
    name: "Preparing for skin surgery",
    title: "Getting ready for your skin surgery",
    summary: "Medicines and blood thinners, smoking, alcohol, what to tell us, what to bring, and driving home.",
    category: "procedures",
    sections: [
      {
        heading: "Your medicines",
        body:
          "Keep taking your usual medicines on the day of surgery unless we told you otherwise.\n\n- Blood thinners: never stop a blood thinner (such as warfarin, apixaban, rivaroxaban, clopidogrel, or aspirin your doctor prescribed for your heart) on your own. Stopping can raise the risk of a stroke or heart attack. If you have questions, we will talk with the doctor who prescribed it.\n- Supplements: some, like fish oil, vitamin E, ginkgo and garlic pills, can add to bleeding. Ask us whether to pause any you take on your own.\n- For pain before surgery, acetaminophen is usually the safer choice. Ask us before taking ibuprofen or naproxen.",
      },
      {
        heading: "Tell us before surgery if you",
        body:
          "- Have a pacemaker or implanted defibrillator.\n- Have an artificial joint, heart valve, or have had a heart infection.\n- Are allergic to numbing medicine, latex, tape, or antibiotics.\n- Are pregnant or might be.\n- Get cold sores and the surgery is near your mouth.\n- Have had a keloid (a thick, raised scar).",
      },
      {
        heading: "Smoking and alcohol",
        body:
          "Smoking and vaping nicotine cut down blood flow to the skin. This slows healing and raises the chance of infection and a poor scar. If you can, stop or cut back for as long as possible before and after surgery. Even a few days helps.\n\nAlcohol can increase bleeding. Most people are asked to avoid it for a day or two before and after surgery.",
      },
      {
        heading: "On the day",
        body:
          "- Eat a normal meal before you come, unless we told you otherwise.\n- Shower and wash your hair. You may need to keep the area dry for a day or two afterward.\n- Leave makeup, lotion and jewelry off the surgery area.\n- Wear loose, comfortable clothes. A shirt that buttons in front is easier for surgery on the head, neck or upper body.\n- Bring a list of your medicines and allergies, and your glasses or hearing aids if you use them.",
      },
      {
        heading: "Getting home",
        body:
          "Most skin surgery uses only local numbing medicine, so you are awake and many people can drive. Plan for a driver if the surgery is near your eye (a bandage may block your vision), on your hand or foot, if it is a larger surgery, or if you are given any medicine to relax you.\n\nPlan to take it easy for the rest of the day. For larger surgeries, avoid heavy lifting and hard exercise for 1 to 2 weeks, so it helps to plan around work, travel and sports.",
      },
    ],
    steps: [],
    stopRules: [
      "You were told to stop a blood thinner and are not sure if that is right: call before you stop it.",
      "You get sick, have a fever, or have a new rash or sore near the surgery area in the days before surgery.",
      "You start a new medicine or supplement before your surgery date.",
    ],
    notes: "",
    sources: [
      "American College of Mohs Surgery, patient information on preparing for skin surgery",
      "American Academy of Dermatology, patient education on skin cancer surgery",
    ],
    reviewed: false,
  },
  {
    id: "proc-biopsy-aftercare",
    name: "Skin biopsy aftercare (shave and punch)",
    title: "Caring for your skin biopsy site",
    summary: "Daily washing, petrolatum and a bandage for shave and punch biopsies; healing time; stitches; getting results.",
    category: "procedures",
    sections: [
      {
        heading: "What was done",
        body:
          "A biopsy removes a small piece of skin so it can be looked at under a microscope.\n\n- Shave biopsy: the top layers of skin were shaved off. It leaves a shallow, open spot like a scrape.\n- Punch biopsy: a small round tool removed a deeper core of skin. The spot is often closed with one or more stitches.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Leave the first bandage on and keep it dry for 24 hours, unless we told you otherwise.\n- After that, wash the spot gently once a day with mild soap and water. Rinse and pat dry.\n- Put on a thin layer of petrolatum ointment and a fresh bandage.\n- Repeat each day until the skin has healed over.\n- You may shower after the first day. Avoid soaking in a bath, pool or hot tub until it has healed or the stitches are out.\n\nDon't let a hard, dry scab form. Wounds kept moist and covered usually heal faster and leave a better scar.",
      },
      {
        heading: "What to expect",
        body:
          "- Mild soreness, a pink rim and a little clear or yellowish fluid are normal in the first few days.\n- A shave biopsy usually heals in 1 to 3 weeks. Spots on the legs can take longer.\n- If you have stitches, they usually come out in 1 to 2 weeks, depending on where they are. Dissolving stitches do not need to be removed.\n- Most biopsies leave a small mark that is pink at first and fades over months.",
      },
      {
        heading: "Your results",
        body:
          "Results usually take 1 to 2 weeks. Ask us how you will hear about them. If you have not heard from us within the time we gave you, please call. No news is not always good news.",
      },
    ],
    steps: [PETROLATUM, NONSTICK_BANDAGE],
    stopRules: [
      "Bleeding that soaks through the bandage and doesn't stop after 20 minutes of firm, steady pressure.",
      "Redness spreading beyond the wound, warmth, increasing pain or swelling, or pus.",
      "Fever or chills.",
      "An itchy red rash where the tape or ointment touches the skin.",
      "You have not heard about your results in the time we told you.",
    ],
    notes: "",
    sources: [
      "MedlinePlus, \"Skin lesion biopsy\" (patient education)",
      "American Academy of Dermatology, \"Proper wound care: How to minimize a scar\" (patient education)",
      "Smack DP et al. Infection and allergy incidence in ambulatory surgery patients using white petrolatum vs bacitracin ointment. JAMA 1996",
    ],
    reviewed: false,
  },
  {
    id: "proc-excision-wound-care",
    name: "Wound care after excision with stitches",
    title: "Caring for your stitches after skin surgery",
    summary: "Pressure bandage, daily cleaning, activity limits, swelling and pain control after an excision closed with stitches.",
    category: "procedures",
    sections: [
      {
        heading: "The first 1 to 2 days",
        body:
          "- Leave the pressure bandage on and keep it dry for 24 to 48 hours, unless we told you otherwise. It helps prevent bleeding.\n- Rest and keep the area raised if you can. For surgery on the face or head, sleep with your head raised on 2 pillows for the first couple of nights.\n- An ice pack wrapped in a cloth, held over the bandage for 10 to 20 minutes every hour or two while awake, can ease swelling and pain.\n- For pain, acetaminophen is usually the first choice, as directed on the label, unless we told you otherwise.",
      },
      {
        heading: "Daily care after that",
        body:
          "Once a day until the stitches come out:\n\n- Remove the bandage and wash the wound gently with mild soap and water. You can let shower water run over it. Pat dry.\n- Clean off any crust gently. Don't scrub.\n- Put on a thin layer of petrolatum ointment.\n- Cover with a nonstick bandage.\n\nIf you have tape strips on the wound, leave them on and let them fall off on their own.",
      },
      {
        heading: "Protecting the stitches",
        body:
          "Stretching or strain can open the wound or cause bleeding.\n\n- Avoid heavy lifting, hard exercise, bending over and contact sports for 1 to 2 weeks, or as long as we told you. This matters most for wounds on the back, shoulders and legs.\n- Don't soak the wound in a bath, pool, hot tub or the ocean until the stitches are out.\n- Don't pick at the stitches or crusts.",
      },
      {
        heading: "What is normal",
        body:
          "- Some swelling, bruising and tenderness for several days. Bruising on the face can spread down toward the eyes or neck.\n- Numbness or tingling around the scar, which can last weeks to months.\n- A firm ridge under the scar, which softens over a few months.\n- Stitches usually come out in about 1 to 2 weeks, depending on where they are. Some stitches dissolve on their own.",
      },
    ],
    steps: [PETROLATUM, NONSTICK_BANDAGE],
    stopRules: [
      "Bleeding that doesn't stop after 20 minutes of firm, steady pressure, or a fast-growing, tight swelling under the wound.",
      "Increasing pain, warmth, swelling or redness after the first 2 to 3 days, or pus.",
      "Fever or chills.",
      "The wound edges pull apart or a stitch breaks early.",
      "An itchy red rash where the tape or ointment touches the skin.",
    ],
    notes: "",
    sources: [
      "MedlinePlus, \"Surgical wound care - closed\" (patient education)",
      "American Academy of Dermatology, \"Proper wound care: How to minimize a scar\" (patient education)",
      "Smack DP et al. Infection and allergy incidence in ambulatory surgery patients using white petrolatum vs bacitracin ointment. JAMA 1996",
    ],
    reviewed: false,
  },
  {
    id: "proc-mohs-day-of-surgery",
    name: "Mohs surgery: what to expect on the day",
    title: "Your Mohs surgery day",
    summary: "How Mohs works step by step, how long the day takes, what to eat, wear and bring, and getting home.",
    category: "procedures",
    sections: [
      {
        heading: "What Mohs surgery is",
        body:
          "Mohs surgery is a way to remove skin cancer one thin layer at a time. Each layer is checked under a microscope while you wait. The surgeon only removes more skin where cancer is still seen. This saves as much healthy skin as possible and has a very high cure rate for the skin cancers it is used for.",
      },
      {
        heading: "How the day goes",
        body:
          "- The area is numbed with an injection. You stay awake.\n- The surgeon removes the visible cancer and a thin layer around it. This part usually takes only a few minutes.\n- A bandage goes on and you wait, usually about an hour or more, while the layer is prepared and checked.\n- If cancer is still seen, the surgeon removes another layer only in that spot. This repeats until no cancer is seen.\n- Then the wound is repaired. It may be closed with stitches, covered with nearby skin (a flap) or a skin graft, or left to heal on its own. Sometimes the repair is done on another day or by another surgeon.",
      },
      {
        heading: "Plan for the whole day",
        body:
          "Most people are done in a few hours, but it is hard to know ahead of time how many layers are needed. Plan to be with us most of the day and don't schedule anything else.\n\n- Eat a normal breakfast and take your usual medicines, including blood thinners, unless we told you otherwise.\n- Wear comfortable clothes in layers. A shirt that buttons in front is easiest for surgery on the head or neck.\n- Bring a snack, a drink, something to read or do, a list of your medicines, and your glasses or hearing aids.\n- Leave jewelry and valuables at home. Don't wear makeup on the area.",
      },
      {
        heading: "Getting home",
        body:
          "You will leave with a thick pressure bandage. Bring a driver if the surgery is near your eye, if a large repair is likely, or if you would feel more comfortable not driving. One adult companion is usually welcome to wait with you.\n\nPlan to rest for the next day or two and to avoid hard exercise and heavy lifting for 1 to 2 weeks, or as long as we tell you.",
      },
    ],
    steps: [],
    stopRules: [
      "You take a blood thinner and were told to stop it: call us before you stop it.",
      "You have a pacemaker, defibrillator, artificial joint or heart valve and have not told us.",
      "You are sick, have a fever, or have a new sore or rash near the surgery area before your surgery date.",
    ],
    notes: "",
    sources: [
      "American College of Mohs Surgery, patient information on what to expect during Mohs surgery",
      "Skin Cancer Foundation, \"Mohs surgery\" (patient education)",
      "MedlinePlus, \"Mohs microscopic surgery\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "proc-mohs-aftercare",
    name: "Mohs surgery aftercare (incl. flaps and grafts)",
    title: "Healing after your Mohs surgery",
    summary: "Pressure bandage, swelling and bruising, daily wound care, extra care for flaps and grafts, and what healing looks like.",
    category: "procedures",
    sections: [
      {
        heading: "The first 48 hours",
        body:
          "- Leave the pressure bandage on and dry for 24 to 48 hours, unless we told you otherwise.\n- Rest. Avoid bending over, lifting and straining.\n- For surgery on the face or head, sleep with your head raised on 2 or 3 pillows.\n- An ice pack wrapped in a cloth, held over the bandage for 10 to 20 minutes every hour or two while awake, eases swelling.\n- For pain, acetaminophen is usually the first choice, as directed on the label, unless we told you otherwise.\n\nSwelling and bruising are often worst on days 2 and 3. After surgery on the forehead, nose or near the eyes, the eyelids can swell and bruise. This usually fades over 1 to 2 weeks.",
      },
      {
        heading: "Daily care after that",
        body:
          "Once a day, until the stitches come out or the wound has healed:\n\n- Wash gently with mild soap and water. Pat dry.\n- Put on a thin layer of petrolatum ointment.\n- Cover with a nonstick bandage.\n\nIf your wound was left to heal on its own, keep up this daily care until new skin covers it. This can take several weeks.",
      },
      {
        heading: "If you have a flap or graft",
        body:
          "A flap moves nearby skin to cover the wound. A graft is skin taken from another spot (the donor site) and placed over the wound.\n\n- If a padded dressing (a bolster) is stitched on top of a graft, leave it alone and keep it dry until we remove it, usually in about a week.\n- Don't press, rub or stretch the flap or graft. It needs a steady blood supply to take.\n- Care for the donor site as we showed you.\n- Smoking and nicotine raise the risk that a flap or graft won't heal well. Avoid them.\n- A graft may look dark, purple or patchy at first. It usually lightens over weeks to months.",
      },
      {
        heading: "Over the coming months",
        body:
          "- Numbness, tingling or itching around the scar can last for months.\n- Lumps, firmness and a raised or pink scar are common and usually soften and flatten over 6 to 12 months or longer.\n- Protect the scar from the sun with clothing, a hat or broad-spectrum SPF 30 or higher once healed.\n- Having one skin cancer raises the chance of another. Keep up your regular skin checks.",
      },
    ],
    steps: [PETROLATUM, NONSTICK_BANDAGE],
    stopRules: [
      "Bleeding that doesn't stop after 20 minutes of firm, steady pressure, or a fast-growing, tight, painful swelling under the wound.",
      "Increasing pain, warmth, swelling or redness after the first 2 to 3 days, pus, or a fever.",
      "Part of a flap or graft turns black, or the wound edges pull apart.",
      "The bolster or stitches come loose early.",
      "Swelling around the eye that keeps it from opening, or any change in your vision.",
    ],
    notes: "",
    sources: [
      "American College of Mohs Surgery, patient information on wound care after Mohs surgery",
      "Skin Cancer Foundation, \"Mohs surgery\" (patient education)",
      "American Academy of Dermatology, \"Proper wound care: How to minimize a scar\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "proc-stitch-removal-scar-care",
    name: "Stitch removal and caring for your scar",
    title: "After your stitches come out: caring for your scar",
    summary: "Typical stitch-removal timing, care in the weeks after, sun protection, silicone, massage, and how scars change over a year.",
    category: "procedures",
    sections: [
      {
        heading: "When stitches come out",
        body:
          "Stitches usually come out in about 1 to 2 weeks. Areas that heal fast, like the face, often come out sooner. Areas under more stretch, like the back, arms and legs, often stay longer. We will tell you your timing. Dissolving stitches do not need to be removed.\n\nRemoving stitches takes a few minutes and is usually not painful. Please don't remove them yourself unless we told you to.",
      },
      {
        heading: "The first weeks after removal",
        body:
          "A new scar is still weak for several weeks, even when it looks closed.\n\n- If tape strips were put on, leave them until they fall off, usually within a week.\n- Keep the scar moist with petrolatum ointment until any crusts are gone.\n- Keep avoiding heavy lifting and stretching of the area for a few more weeks if the scar is on the back, shoulders, chest or a joint.\n- You can usually swim and bathe normally once the wound is fully closed with no open spots or crusts.",
      },
      {
        heading: "Helping your scar look its best",
        body:
          "- Sun protection: UV light can darken a new scar. Cover it with clothing or use a broad-spectrum SPF 30 or higher sunscreen every day for at least a year.\n- Silicone gel or sheets: once the skin is fully closed, these can help a scar flatten and soften. Use as directed on the label, usually for at least 2 to 3 months.\n- Massage: if we suggest it, gently massage the scar for a few minutes a day once it is healed.\n- Don't smoke. It slows healing.",
      },
      {
        heading: "What to expect",
        body:
          "Scars change for a long time. A new scar is often pink, red or a little raised and firm. Over 12 to 18 months, most scars become flatter, softer and paler. Numbness around a scar can also take months to improve.\n\nIf you have had keloids (thick scars that grow past the wound) before, tell us. Early treatment can help.",
      },
    ],
    steps: [
      {
        label: "Silicone scar gel",
        slot: "as-directed",
        kind: "otc",
        search: "silicone scar gel",
        directions: "Once the skin is fully closed with no scabs: a thin layer on the scar as directed on the label, usually for at least 2 to 3 months.",
      },
      {
        label: "Sunscreen",
        slot: "am",
        kind: "otc",
        search: "SPF 30",
        directions: "Every morning on the scar if it is not covered by clothing: broad-spectrum SPF 30 or higher. Reapply every 2 hours outdoors.",
      },
    ],
    stopRules: [
      "The wound opens after the stitches come out.",
      "Redness, warmth, swelling, pus or increasing pain around the scar.",
      "A stitch or piece of stitch pokes out of the scar weeks later, or a small pimple-like bump forms on the scar line.",
      "The scar becomes thick, raised, itchy or grows past the edges of the wound.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Proper wound care: How to minimize a scar\" (patient education)",
      "American Academy of Dermatology, patient education on scars: diagnosis and treatment",
      "MedlinePlus, \"Surgical wound care - closed\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "proc-bleeding-after-surgery",
    name: "Bleeding after skin surgery (pressure technique)",
    title: "What to do if your wound bleeds",
    summary: "Normal oozing vs. bleeding, the 20-minute firm-pressure technique, ice and rest, and when to call or seek urgent care.",
    category: "procedures",
    sections: [
      {
        heading: "What is normal",
        body:
          "A little blood or pink fluid on the bandage in the first day or two is normal, especially if you take a blood thinner. Bleeding is most likely in the first 24 to 48 hours. It is often set off by bending over, lifting, straining or hard exercise.",
      },
      {
        heading: "If blood soaks through the bandage",
        body:
          "- Sit or lie down and stay calm. Raise the area above your heart if you can.\n- Don't take off the bandage. Place clean gauze or a clean folded cloth on top of it.\n- Press firmly and steadily, right over the wound, for 20 minutes by the clock.\n- Don't lift to peek. Each peek restarts the clock and can restart the bleeding.\n- If blood soaks through, add more gauze on top and keep pressing.\n- If it still bleeds after 20 minutes, press for another 20 minutes.",
      },
      {
        heading: "Once it stops",
        body:
          "- Leave the bandage alone, or add a fresh bandage over the old one.\n- An ice pack wrapped in a cloth for 10 to 20 minutes can help.\n- Rest for the rest of the day. Avoid bending, lifting and straining.\n- Keep taking your blood thinner unless the prescriber tells you otherwise. Don't stop it on your own.\n- Avoid alcohol for a couple of days, and ask us before taking aspirin or ibuprofen for pain.",
      },
    ],
    steps: [],
    stopRules: [
      "Bleeding that keeps going after two rounds of 20 minutes of firm pressure: call us, or go to urgent care or the emergency room if we can't be reached.",
      "Bleeding that is spurting or pouring.",
      "A fast-growing, tight, painful swelling or lump under the wound (blood collecting under the skin).",
      "You feel faint, dizzy or very weak (call 911).",
    ],
    notes: "",
    sources: [
      "American College of Mohs Surgery, patient information on wound care after Mohs surgery",
      "MedlinePlus, \"Bleeding\" (first aid)",
    ],
    reviewed: false,
  },
  {
    id: "proc-wound-infection-signs",
    name: "Signs of wound infection",
    title: "Is my wound infected?",
    summary: "Normal healing vs. signs of infection, allergic tape/ointment rashes, and how to lower the chance of infection.",
    category: "procedures",
    sections: [
      {
        heading: "Normal healing",
        body:
          "Most skin surgery wounds heal without infection. These are normal in the first days:\n\n- A thin pink or red rim right around the wound.\n- Mild swelling, bruising and tenderness that get better each day after day 2 or 3.\n- A small amount of clear, pink or light yellow fluid.\n- A soft yellow film in the base of an open wound. This is part of healing, not pus.",
      },
      {
        heading: "Signs of infection",
        body:
          "Infections usually show up 3 to 7 days after surgery. Watch for:\n\n- Redness that spreads outward, or red streaks leading away from the wound.\n- Pain, swelling or warmth that gets worse after the first 2 to 3 days instead of better.\n- Thick, cloudy, yellow-green or bad-smelling drainage (pus).\n- Fever or chills, or feeling unwell.\n\nIf you notice these, call us. Don't start leftover antibiotics on your own.",
      },
      {
        heading: "Rash from tape or ointment",
        body:
          "An itchy red rash in the exact shape of the tape or bandage, or wherever ointment is applied, is often an allergic reaction (contact dermatitis), not an infection. It is usually itchy more than painful. Antibiotic ointments are a common cause, which is why we suggest plain petrolatum. Let us know if this happens.",
      },
      {
        heading: "Lowering your risk",
        body:
          "- Wash your hands before touching the wound or changing the bandage.\n- Clean the wound gently once a day and keep it covered with petrolatum and a clean bandage.\n- Don't soak the wound in baths, pools or hot tubs until it has healed.\n- Don't pick at scabs or stitches.\n- Avoid smoking, which slows healing.\n- If you have diabetes, keep your blood sugar under good control.",
      },
    ],
    steps: [],
    stopRules: [
      "Redness spreading outward from the wound, or red streaks.",
      "Pain, swelling or warmth getting worse after the first 2 to 3 days.",
      "Pus or bad-smelling drainage.",
      "Fever of 100.4 F (38 C) or higher, or chills.",
      "An itchy rash where the tape or ointment touches the skin.",
    ],
    notes: "",
    sources: [
      "MedlinePlus, \"Surgical wound infection - treatment\" (patient education)",
      "MedlinePlus, \"Surgical wound care - closed\" (patient education)",
      "Smack DP et al. Infection and allergy incidence in ambulatory surgery patients using white petrolatum vs bacitracin ointment. JAMA 1996",
    ],
    reviewed: false,
  },
  {
    id: "proc-cryotherapy-aftercare",
    name: "Cryotherapy (liquid nitrogen) aftercare",
    title: "After liquid nitrogen freezing treatment",
    summary: "Redness, swelling and blisters after freezing; caring for blisters and scabs; color changes; repeat treatments.",
    category: "procedures",
    sections: [
      {
        heading: "What was done",
        body:
          "Liquid nitrogen is very cold. It freezes and destroys growths such as warts, precancerous spots (actinic keratoses) and some harmless growths. Treated skin heals over the next few weeks, and the growth usually comes off with the scab.",
      },
      {
        heading: "What to expect",
        body:
          "- Stinging or burning during and for a short time after treatment.\n- Redness and swelling within hours. Swelling near the eyes can be more noticeable the next morning, especially after treatment on the forehead or temples.\n- A blister may form within a day. It can be clear or filled with blood. This is normal.\n- The blister dries into a scab that usually falls off in 1 to 3 weeks. Spots on the legs can take longer.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- You can wash the area normally with mild soap and water and pat dry.\n- Leave blisters alone. The blister roof protects the skin underneath.\n- If a blister breaks, wash it gently, apply petrolatum ointment and cover it with a bandage.\n- A bandage also helps if clothing rubs the spot.\n- Don't pick at scabs. Let them fall off on their own.\n- For soreness, acetaminophen as directed on the label can help.",
      },
      {
        heading: "After it heals",
        body:
          "- The treated skin may be lighter or darker than the skin around it. This is more common in darker skin and can be long-lasting.\n- Some growths, especially warts, need more than one treatment, often a few weeks apart.\n- Protect treated skin from the sun while it heals and afterward.",
      },
    ],
    steps: [],
    stopRules: [
      "A large, tense or very painful blister.",
      "Redness spreading beyond the treated spot, warmth, pus, or fever.",
      "Swelling around the eye that keeps it from opening.",
      "A spot that has not healed in 6 weeks, or a growth that comes back.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Warts: Diagnosis and treatment\" (patient education)",
      "American Academy of Dermatology, \"Actinic keratosis: Diagnosis and treatment\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "proc-edc-aftercare",
    name: "Electrodesiccation and curettage (ED&C) aftercare",
    title: "Caring for your skin after scraping and cautery (ED&C)",
    summary: "What ED&C is, daily moist wound care for an open wound, how long healing takes, and the scar to expect.",
    category: "procedures",
    sections: [
      {
        heading: "What was done",
        body:
          "Electrodesiccation and curettage (ED&C) treats some skin cancers that are on the surface of the skin. After numbing the area, the growth was scraped away with a small, sharp, spoon-shaped tool (a curette). Then the base was treated with an electric needle to stop bleeding and destroy any remaining cancer cells. This was usually repeated two or three times.\n\nThe wound is left open to heal on its own, like a deep scrape. There are no stitches.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Leave the first bandage on and keep it dry for 24 hours, unless we told you otherwise.\n- Then, once a day, wash the wound gently with mild soap and water. You can let shower water run over it. Pat dry.\n- Put on a thin layer of petrolatum ointment and a fresh nonstick bandage.\n- Keep doing this every day until new skin has covered the wound.\n\nKeeping the wound moist and covered helps it heal faster and leaves a better scar than letting a hard scab form.",
      },
      {
        heading: "What to expect",
        body:
          "- Mild soreness for a few days. Acetaminophen, as directed on the label, can help.\n- Clear or yellowish fluid and a yellow film in the base of the wound are normal parts of healing.\n- Healing usually takes 2 to 4 weeks. Larger wounds and wounds on the legs can take 6 weeks or more.\n- Once healed, the scar is usually round, flat and lighter than the skin around it. It may be pink at first and fades over months.",
      },
      {
        heading: "Looking ahead",
        body:
          "Protect the area from the sun once healed. Having had one skin cancer raises the chance of another, so keep your regular skin checks. Let us know if you notice a sore, bump or scaly spot coming back in the scar.",
      },
    ],
    steps: [PETROLATUM, NONSTICK_BANDAGE],
    stopRules: [
      "Bleeding that doesn't stop after 20 minutes of firm, steady pressure.",
      "Redness spreading beyond the wound, warmth, increasing pain, pus, or fever.",
      "The wound has not healed after 6 to 8 weeks, or is getting bigger.",
      "A new bump, sore or scaly spot appears in the scar later on.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Basal cell carcinoma: Diagnosis and treatment\" (patient education)",
      "MedlinePlus, \"Surgical wound care - open\" (patient education)",
      "Skin Cancer Foundation, patient education on curettage and electrodesiccation",
    ],
    reviewed: false,
  },
  {
    id: "proc-incision-drainage",
    name: "Incision and drainage of a boil or cyst",
    title: "Caring for your skin after a boil or cyst was drained",
    summary: "Packing, drainage, warm compresses, antibiotics as prescribed, preventing spread, and why a cyst may need removal later.",
    category: "procedures",
    sections: [
      {
        heading: "What was done",
        body:
          "A boil (abscess) is a pocket of pus under the skin, usually from a bacterial infection. An inflamed cyst can also fill with pus or thick material. We numbed the area, made a small cut and let the pus drain out. This takes the pressure off and usually eases pain quickly.\n\nThe wound may have been left open, and sometimes a strip of gauze (packing) is placed inside to keep it draining.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Keep the bandage on and change it when it gets soaked, at least once a day. Wash your hands before and after.\n- Some drainage of blood or pus for a few days is normal.\n- If you have packing, leave it in until we remove it or tell you how to take it out.\n- After the first day, you can usually shower and let water run over the wound. Don't soak in a bath, pool or hot tub until it has closed.\n- A warm, damp cloth held on the area for 10 to 15 minutes a few times a day can help it drain, unless we told you otherwise.\n- If you were given antibiotics, take them as prescribed and finish them.",
      },
      {
        heading: "Preventing spread",
        body:
          "The bacteria from a boil can spread to other people and other parts of your body.\n\n- Throw used bandages away in a sealed bag.\n- Don't share towels, razors, washcloths or clothes.\n- Wash towels and sheets in hot water.\n- Keep the wound covered at work, school and the gym.",
      },
      {
        heading: "What to expect",
        body:
          "The wound usually heals from the bottom up over 1 to 3 weeks. For a cyst, draining does not remove the cyst wall, so it can fill up again. Once it has calmed down, we may talk about removing the whole cyst.\n\nIf you keep getting boils, tell us. There are steps that can lower the chance they come back.",
      },
    ],
    steps: [],
    stopRules: [
      "Redness spreading outward or red streaks, or the area becoming more swollen and painful after 2 days.",
      "Fever or chills.",
      "The wound fills up again or new boils appear.",
      "Bleeding that doesn't stop after 20 minutes of firm, steady pressure.",
      "The packing falls out early, if we told you it needs to stay in.",
    ],
    notes: "",
    sources: [
      "MedlinePlus, \"Skin abscess\" (patient education)",
      "MedlinePlus, \"Surgical wound care - open\" (patient education)",
      "Centers for Disease Control and Prevention, patient information on preventing the spread of staph and MRSA skin infections",
    ],
    reviewed: false,
  },
  {
    id: "proc-cyst-removal-aftercare",
    name: "Cyst removal aftercare",
    title: "Caring for your skin after cyst removal",
    summary: "Wound care and activity limits after a cyst is cut out, normal lumps and drainage, and the chance it comes back.",
    category: "procedures",
    sections: [
      {
        heading: "What was done",
        body:
          "A cyst is a sac under the skin filled with thick, cheesy or oily material. To keep it from coming back, we removed the sac along with its contents. The wound was usually closed with stitches. Some stitches are deeper and dissolve on their own.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Leave the bandage on and keep it dry for 24 to 48 hours, unless we told you otherwise.\n- Then, once a day, wash gently with mild soap and water and pat dry.\n- Put on a thin layer of petrolatum ointment and a fresh nonstick bandage.\n- Don't soak the wound in a bath, pool or hot tub until the stitches are out.\n- An ice pack wrapped in a cloth for 10 to 20 minutes at a time can ease swelling.\n- For pain, acetaminophen is usually the first choice, as directed on the label, unless we told you otherwise.",
      },
      {
        heading: "Protecting the wound",
        body:
          "Cysts are often on the back, shoulders, neck and scalp, where the skin stretches a lot.\n\n- Avoid heavy lifting, hard exercise and reaching or twisting movements for 1 to 2 weeks, or as long as we told you.\n- Too much stretch can open the wound or make the scar wider.",
      },
      {
        heading: "What to expect",
        body:
          "- Some swelling, bruising and tenderness for a few days.\n- A small amount of clear or pink drainage in the first days.\n- A firm area under the scar for several weeks. This usually softens over time.\n- Stitches usually come out in 1 to 2 weeks. Ones on the back are often left a bit longer.\n- Even when the whole sac is removed, a cyst can sometimes come back.",
      },
    ],
    steps: [PETROLATUM, NONSTICK_BANDAGE],
    stopRules: [
      "A fast-growing, tight, painful swelling under the wound, or bleeding that doesn't stop after 20 minutes of firm pressure.",
      "Redness spreading beyond the wound, increasing pain or warmth after 2 to 3 days, pus, or fever.",
      "The wound edges pull apart.",
      "A lump grows back in the same spot.",
    ],
    notes: "",
    sources: [
      "MedlinePlus, \"Skin lesion removal\" (patient education)",
      "MedlinePlus, \"Surgical wound care - closed\" (patient education)",
      "American Academy of Dermatology, \"Proper wound care: How to minimize a scar\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "proc-intralesional-steroid-injections",
    name: "Steroid injections into skin lesions or scalp",
    title: "Steroid shots into the skin: what to expect",
    summary: "Why steroid injections are used (keloids, alopecia areata, cysts, plaques), how they feel, side effects like dents or light spots, and repeat visits.",
    category: "procedures",
    sections: [
      {
        heading: "What it is",
        body:
          "A steroid (cortisone) medicine is injected with a small needle straight into the skin problem. This calms inflammation right where it is needed, with much less of the medicine reaching the rest of the body than a pill would.\n\nIt is used for many problems, including:\n\n- Keloids and thick, raised scars.\n- Patches of hair loss from alopecia areata.\n- Swollen, painful acne cysts or inflamed cysts.\n- Stubborn patches of psoriasis, eczema, lichen planus and other conditions.",
      },
      {
        heading: "What to expect",
        body:
          "- Each injection stings or pinches briefly. Several small injections may be needed for a larger area or on the scalp.\n- A tiny bit of bleeding or a small bruise is common.\n- The spot may be tender for a day or two.\n- Results usually take a few weeks to show. Many people need repeat treatments, often every 4 to 6 weeks.",
      },
      {
        heading: "Possible side effects",
        body:
          "- A small dent in the skin (thinning under the skin) where the medicine was injected. This often improves over several months.\n- A lighter patch of skin, which is more noticeable in darker skin. This usually fades over months.\n- Small visible blood vessels at the injection spot.\n- If you have diabetes, your blood sugar may run higher for a day or two. Check it more often.\n\nTell us at your next visit if you notice any of these, so we can adjust your treatment.",
      },
      {
        heading: "After your injections",
        body:
          "- You can usually go back to your normal activities right away.\n- You can usually wash your skin or hair as usual the next day, unless we told you otherwise.\n- An ice pack wrapped in a cloth for a few minutes can ease soreness.\n- Tell us if you are pregnant or breastfeeding before treatment.",
      },
    ],
    steps: [],
    stopRules: [
      "Redness, warmth, swelling or pus at an injection site, or fever.",
      "A dent, light patch or thinning skin that is getting worse rather than better.",
      "Blood sugar readings much higher than usual for you that last more than a couple of days.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Keloids: Diagnosis and treatment\" (patient education)",
      "American Academy of Dermatology, \"Alopecia areata: Diagnosis and treatment\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "proc-pdt-aftercare",
    name: "Photodynamic therapy (PDT) aftercare",
    title: "After photodynamic therapy (PDT): protecting your skin from light",
    summary: "Strict light avoidance for 48 hours, the sunburn-like reaction and peeling that follow, and home care while it heals.",
    category: "procedures",
    sections: [
      {
        heading: "What it is",
        body:
          "Photodynamic therapy (PDT) treats precancerous spots (actinic keratoses) and some other skin problems. A medicine that makes the skin sensitive to light was put on your skin. After it soaked in, the skin was treated with a special light. This activates the medicine and destroys damaged cells.",
      },
      {
        heading: "Avoiding light for 48 hours",
        body:
          "The medicine stays in your skin after the visit. Strong light can cause a painful, burn-like reaction. For 48 hours after treatment, unless we told you otherwise:\n\n- Stay indoors as much as you can, away from windows. Sunlight through glass and through clouds still counts.\n- If you must go out, cover the treated skin fully with a wide-brimmed hat, clothing, gloves or a scarf.\n- Avoid bright indoor lights, such as exam lamps, makeup mirror lights and lights very close to your skin. Normal room light is fine.\n- Sunscreen alone does not protect you, because the medicine reacts to visible light, not just UV light.",
      },
      {
        heading: "What to expect",
        body:
          "- Burning or stinging during and just after the light treatment.\n- Redness and swelling like a sunburn for several days. After treatment of the forehead or scalp, swelling around the eyes can show up the next morning.\n- Crusting, scaling and peeling, usually over about 1 to 2 weeks.\n- Most people look much better in 2 to 4 weeks. Some spots may need another treatment.",
      },
      {
        heading: "Caring for your skin",
        body:
          "- Cool compresses (a clean cloth soaked in cool water) for 10 to 15 minutes can ease burning.\n- Wash gently with lukewarm water and a mild cleanser. Pat dry.\n- Apply a bland moisturizer or petrolatum ointment often.\n- Don't pick at crusts or peeling skin.\n- Skip retinoids, acids and scrubs until your skin has healed.\n- Once healed, use broad-spectrum SPF 30 or higher every day to protect your skin.",
      },
    ],
    steps: [],
    stopRules: [
      "Severe pain, blisters, or open sores in the treated area.",
      "Signs of infection: pus, yellow crusts, spreading redness, or fever.",
      "Small painful blisters or tingling, especially if you get cold sores.",
      "Swelling around the eyes that keeps them from opening.",
      "Redness or crusting that has not improved after 2 weeks.",
    ],
    notes: "",
    sources: [
      "FDA prescribing information: aminolevulinic acid HCl topical solution 20% and gel 10%; methyl aminolevulinate cream (patient counseling: light sensitivity for 48 hours)",
      "American Academy of Dermatology, \"Actinic keratosis: Diagnosis and treatment\" (patient education)",
      "Skin Cancer Foundation, patient education on photodynamic therapy",
    ],
    reviewed: false,
  },
  {
    id: "proc-nbuvb-phototherapy",
    name: "Narrowband UVB phototherapy: what to expect",
    title: "Light treatment (narrowband UVB): what to expect",
    summary: "How phototherapy works, visit schedule and how long it takes, eye and skin protection, side effects, and medicine checks.",
    category: "procedures",
    sections: [
      {
        heading: "What it is",
        body:
          "Narrowband UVB is a type of ultraviolet light used to treat skin conditions such as psoriasis, eczema, vitiligo and some itchy conditions. You stand in a booth (or place your hands or feet in a smaller unit) for a short, measured dose of light. It is different from a tanning bed. The light and the dose are carefully controlled.",
      },
      {
        heading: "The schedule",
        body:
          "- Treatments are usually 2 to 3 times a week, on days that are not back to back.\n- The first treatments last only seconds. The time is slowly increased.\n- Most people see improvement after about 15 to 25 treatments. Vitiligo can take longer.\n- Keeping to the schedule matters. If you miss several visits, the dose may need to be lowered.",
      },
      {
        heading: "Each visit",
        body:
          "- Wear the protective goggles we give you every time.\n- Men should cover the genitals. Cover your face too, if we ask you to.\n- Wear the same type of clothing and underwear each time so the same skin is exposed.\n- Don't put lotion, perfume, oils or sunscreen on treated skin just before your visit, unless we told you to.\n- Tell us about any new medicine or supplement before your next visit. Some, like certain antibiotics and water pills, make skin more sensitive to light.",
      },
      {
        heading: "Side effects and care",
        body:
          "- Mild pinkness, warmth or itch for a day is common. Moisturize often.\n- A sunburn can happen. Tell us before your next treatment.\n- Cold sores can flare.\n- Your skin may tan, and over many years phototherapy can add to skin aging and possibly skin cancer risk. We will check your skin over time.\n- Avoid extra sun on treatment days. Use sunscreen and protective clothing outdoors.",
      },
    ],
    steps: [],
    stopRules: [
      "Painful redness, blistering or a burn after a treatment (skip your next session until we see it).",
      "A new rash, or your condition getting worse after treatment.",
      "You start a new medicine, or become pregnant.",
      "A new or changing mole or spot.",
    ],
    notes: "",
    sources: [
      "Elmets CA et al. Joint AAD-NPF guidelines of care for the management and treatment of psoriasis with phototherapy. J Am Acad Dermatol 2019",
      "National Psoriasis Foundation, \"Phototherapy\" (patient education)",
      "American Academy of Dermatology, patient education on phototherapy (light therapy)",
    ],
    reviewed: false,
  },
  {
    id: "proc-patch-testing",
    name: "Patch testing: before, during and after",
    title: "Patch testing: your guide to the appointment",
    summary: "Medicines to ask about, no sun on the back, keeping the back dry, the reading visits, and delayed reactions.",
    category: "procedures",
    sections: [
      {
        heading: "What it is",
        body:
          "Patch testing finds out whether a rash is caused by an allergy to something that touches your skin (allergic contact dermatitis). Small amounts of common substances, like metals, fragrances, preservatives and rubber chemicals, are taped to your back on patches.\n\nIt usually takes 3 visits in about a week: one to put the patches on, one about 2 days later to take them off and do a first reading, and a final reading a day or more after that.",
      },
      {
        heading: "Before your appointment",
        body:
          "- Avoid sun, tanning beds and self-tanner on your back for at least 1 to 2 weeks.\n- Don't use steroid creams or other prescription creams on your back for about a week.\n- Ask us about these medicines. They can change the results. Never stop them without talking to the doctor who prescribed them: steroid pills or shots (like prednisone), and medicines that calm the immune system (like methotrexate, cyclosporine, azathioprine, mycophenolate, biologics or JAK inhibitors).\n- Antihistamine pills usually don't affect results, so you can usually keep taking them.\n- Bring your skin care, hair care and work products if we ask.",
      },
      {
        heading: "While the patches are on",
        body:
          "- Keep your back completely dry. No showers on the back, baths, swimming or sweaty exercise. You can wash other parts of your body with a cloth.\n- Keep your back out of the sun.\n- Wear an old T-shirt. The marking ink can stain clothes.\n- Try not to scratch, and avoid heavy lifting or stretching that loosens the patches.\n- If a patch edge comes loose, press it back or cover it with medical tape.",
      },
      {
        heading: "After the patches come off",
        body:
          "- Keep the marks on your back until your final reading. Don't scrub them off.\n- You can usually shower after the final reading.\n- Some allergy reactions show up late. Look at your back (or have someone take a photo) for about a week after the last visit.\n- If you have an allergy, we will give you a list of what to avoid and safe products to use. It can take several weeks of avoiding the allergen for your skin to clear.",
      },
    ],
    steps: [],
    stopRules: [
      "Severe itching, burning or blistering under a patch before your next visit.",
      "A new red, itchy spot on your back in the week after your final reading.",
      "You are unsure whether to stop a medicine before testing: ask before stopping it.",
    ],
    notes: "",
    sources: [
      "American Contact Dermatitis Society, patient information on patch testing",
      "American Academy of Dermatology, \"Contact dermatitis: Diagnosis and treatment\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "proc-nail-surgery-aftercare",
    name: "Ingrown toenail and nail surgery aftercare",
    title: "Caring for your toe or finger after nail surgery",
    summary: "Elevation, bandage care, soaks if advised, shoes and activity, expected drainage, and how the nail regrows.",
    category: "procedures",
    sections: [
      {
        heading: "What was done",
        body:
          "Your toe or finger was numbed, and part or all of the nail was removed, or a sample was taken from the nail or nail bed. For an ingrown toenail, the edge of the nail is often removed and the nail root at that edge is treated with a chemical so that part does not grow back.",
      },
      {
        heading: "The first day",
        body:
          "- The numbness wears off over a few hours. Take acetaminophen, as directed on the label, before it wears off, unless we told you otherwise.\n- Rest and keep your foot or hand raised above your heart as much as you can for the first 24 to 48 hours. This eases throbbing and bleeding.\n- Keep the bandage on and dry for 24 to 48 hours, unless we told you otherwise.\n- Some blood on the bandage is normal.",
      },
      {
        heading: "Daily care after that",
        body:
          "Once or twice a day until it has healed:\n\n- Remove the bandage. If it sticks, soak it off in warm water.\n- Wash gently with mild soap and water, or soak for 10 to 15 minutes in warm, soapy water if we advised it. Pat dry.\n- Apply petrolatum ointment and a fresh nonstick bandage.\n\nIf the root was treated with a chemical, some clear or yellowish drainage is normal and can last 2 to 6 weeks.",
      },
      {
        heading: "Shoes and activity",
        body:
          "- Wear open-toed shoes, sandals or roomy, soft shoes for 1 to 2 weeks.\n- Avoid running, sports and long walks for about 1 to 2 weeks, or as we told you.\n- Don't swim or use a hot tub until the area has healed.\n- A toenail can take 12 to 18 months to grow back fully, and a fingernail about 6 months. If part of the root was treated, that part of the nail stays narrower.\n- To help prevent ingrown nails, cut toenails straight across and avoid tight shoes.",
      },
    ],
    steps: [PETROLATUM, NONSTICK_BANDAGE],
    stopRules: [
      "Bleeding that doesn't stop after 20 minutes of firm pressure with the foot or hand raised.",
      "Redness spreading up the toe or finger, red streaks, increasing pain or swelling, pus, or fever.",
      "The toe or finger looks pale, blue or dark, or stays numb more than a day.",
      "You have diabetes or poor circulation and notice any sign of slow healing or infection.",
    ],
    notes: "",
    sources: [
      "MedlinePlus, \"Ingrown toenail removal - discharge\" (patient education)",
      "Heidelbaugh JJ, Lee H. Management of the ingrown toenail. Am Fam Physician 2009",
      "American Academy of Dermatology, \"How to treat an ingrown toenail\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "proc-vascular-laser-aftercare",
    name: "Vascular laser aftercare (blood vessels and redness)",
    title: "After laser treatment for redness and blood vessels",
    summary: "Swelling, bruising and redness after vascular laser, cool compresses, sun protection, makeup and activities, and repeat sessions.",
    category: "procedures",
    sections: [
      {
        heading: "What it is",
        body:
          "Vascular lasers use light that is absorbed by blood vessels. The heat closes off small vessels so the body can clear them. They are used for broken blood vessels, facial redness (rosacea), port-wine stains, cherry angiomas and some red scars.",
      },
      {
        heading: "What to expect",
        body:
          "- A warm, sunburned feeling for a few hours.\n- Redness and swelling for a few days. Swelling under the eyes is often worse in the morning.\n- Depending on the laser and settings, the skin may bruise purple or gray. Bruising usually fades in 1 to 2 weeks.\n- Most people need several treatments, usually spaced about 4 to 6 weeks apart. Results build gradually.",
      },
      {
        heading: "Caring for your skin",
        body:
          "- Cool compresses or a wrapped ice pack for 10 to 15 minutes at a time can ease heat and swelling.\n- Sleep with your head raised the first night if your face was treated.\n- Wash gently with lukewarm water and a mild cleanser. Pat dry. Don't scrub.\n- Use a bland moisturizer. If any spot crusts or blisters, apply petrolatum ointment and don't pick.\n- Avoid hot showers, saunas, hard exercise and alcohol for a day or two, as heat can increase redness and swelling.\n- You can usually wear makeup the next day if the skin is not broken.\n- Skip retinoids, acids and scrubs on treated skin for a few days, or until we tell you to restart.",
      },
      {
        heading: "Sun protection",
        body:
          "Avoid tanning before and after treatment. Tanned skin raises the risk of burns and dark or light spots. Use broad-spectrum SPF 30 or higher every day and wear a hat outdoors. Sun exposure can also bring redness back over time.",
      },
    ],
    steps: [],
    stopRules: [
      "Blisters, open sores, or crusting that is spreading.",
      "Signs of infection: pus, increasing pain, warmth, spreading redness, or fever.",
      "Small painful blisters or tingling, especially if you get cold sores.",
      "Dark or light patches that appear as the skin heals.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, patient education on lasers and lights for rosacea and blood vessels",
      "American Society for Dermatologic Surgery, patient information on laser treatment for vascular lesions",
    ],
    reviewed: false,
  },
  {
    id: "proc-cantharidin-wart-aftercare",
    name: "Cantharidin (blister beetle) wart treatment aftercare",
    title: "After cantharidin (blister) treatment for warts",
    summary: "Washing off on time, the expected blister, caring for it, keeping it away from eyes and mouth, and ring warts.",
    category: "procedures",
    sections: [
      {
        heading: "What it is",
        body:
          "Cantharidin is a liquid that comes from the blister beetle. When painted on a wart, it makes a blister form under the wart. The blister lifts the wart off the skin. Applying it does not hurt.",
      },
      {
        heading: "Washing it off",
        body:
          "- Leave the tape or bandage on and keep the area dry for the time we told you. This is often a few hours.\n- Then remove the tape and wash the area well with soap and water.\n- Wash it off sooner if you feel strong burning or pain.\n- Wash your hands after touching the treated spot.\n- Keep the medicine away from the eyes, mouth and other areas. Don't let children suck on treated fingers or touch their eyes. If the medicine gets in an eye, rinse it with lots of water and call us.",
      },
      {
        heading: "What to expect",
        body:
          "- A blister usually forms within 1 to 2 days. It can be tender, and it may be filled with clear fluid or blood.\n- The blister dries and peels off in about 1 to 2 weeks, often taking the wart with it.\n- Warts often need more than one treatment.\n- Sometimes a ring of small warts grows around the edge of the old blister (a ring wart). Let us know if this happens.",
      },
      {
        heading: "Caring for the blister",
        body:
          "- Leave the blister alone. Don't pop it or cut it.\n- If it breaks, wash gently with soap and water, apply petrolatum ointment and cover with a bandage.\n- A bandage or padding can help if the blister is on the foot or a spot that rubs.\n- For soreness, acetaminophen, as directed on the label, can help.\n- Tell us before treatment if you are pregnant or might be.",
      },
    ],
    steps: [],
    stopRules: [
      "A very large or very painful blister, or pain that keeps you from walking or using your hand.",
      "Redness spreading beyond the blister, warmth, pus, or fever.",
      "The medicine got into an eye or mouth, or was swallowed.",
      "A ring of new warts forms around the treated spot.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Warts: Diagnosis and treatment\" (patient education)",
      "FDA prescribing information: cantharidin topical solution 0.7% (instructions to wash off, avoid eyes and mucous membranes; not to be ingested)",
    ],
    reviewed: false,
  },
];
