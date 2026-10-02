// Pediatric patient-education handouts for the clinician handout library.
// DRAFTED BY CLAUDE (AI), NOT YET REVIEWED: every handout here goes to the
// dermatologist's approve / edit / cut review (review/handout-library-review.html)
// and shows a "draft" marker until reviewed=true.
import type { HandoutTemplate } from "@/db/handout-templates";

export const PEDIATRIC_HANDOUTS: HandoutTemplate[] = [
  {
    id: "peds-eczema",
    name: "Eczema in babies and children",
    title: "Caring for your child's eczema",
    summary: "What eczema is, daily bathing and moisturizing ('soak and seal'), handling flares, and itch tips for parents.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Eczema (also called atopic dermatitis) makes the skin dry, itchy and easily irritated. In babies it often starts on the cheeks, scalp and outside of the arms and legs. In older children it often shows up in the bends of the elbows and knees, the wrists and the ankles.\n\nEczema is not contagious, and it is not caused by anything you did. It tends to run in families with eczema, asthma or hay fever. Many children's eczema gets milder as they grow.",
      },
      {
        heading: "Bathing and moisturizing",
        body:
          "Daily care keeps the skin barrier strong and is the most important part of treatment.\n\n- Give a short bath in lukewarm (not hot) water, about 5 to 10 minutes, daily or every other day unless we told you otherwise.\n- Use a small amount of a mild, fragrance-free cleanser only where needed.\n- Pat the skin gently with a towel so it is still a little damp.\n- Within 3 minutes, put on any prescribed medicine first, then a thick fragrance-free moisturizer all over.\n- Moisturize again at least once more during the day, even when the skin looks clear.",
      },
      {
        heading: "When eczema flares",
        body:
          "A flare is when patches become red, rough, very itchy or weepy. Use the flare medicine we prescribed exactly as prescribed: on the red, rough patches only, and for only as long as we said. Then go back to daily moisturizing.\n\nDo not stop moisturizing during a flare. Do not use a stronger medicine, or an adult's prescription, on your child without asking us.",
      },
      {
        heading: "Helping with itch and triggers",
        body:
          "- Keep fingernails short and smooth. Soft cotton mittens or sleepers can help babies at night.\n- Dress your child in soft, breathable cotton. Avoid wool and scratchy fabrics.\n- Use fragrance-free laundry detergent and skip fabric softener sheets.\n- Avoid overheating. Sweat can make itch worse.\n- Rinse off after swimming, then moisturize.\n- Common triggers include dry air, heat, sweat, soaps, fragrances, and colds or other infections.",
      },
      {
        heading: "Helpful tips",
        body:
          "Eczema comes and goes. Even with good care, most children have some flares. That does not mean you are doing something wrong.\n\nPlease talk with us before cutting foods out of your child's diet. Removing foods without testing and guidance can affect growth and nutrition, and usually does not clear eczema.",
      },
    ],
    steps: [
      {
        label: "Lukewarm bath",
        slot: "pm",
        kind: "otc",
        search: "fragrance free baby wash",
        directions: "5 to 10 minutes in lukewarm water. A little fragrance-free cleanser only where needed. Pat almost dry.",
      },
      {
        label: "Moisturizer (every day)",
        slot: "both",
        kind: "otc",
        search: "fragrance-free moisturizer",
        directions: "A thick fragrance-free cream or ointment all over, within 3 minutes after the bath and at least once more each day.",
      },
    ],
    stopRules: [
      "Yellow crusts, pus, oozing, or spreading redness, or your child seems sick or has a fever (possible infection).",
      "Painful clusters of small punched-out sores or blisters, especially on the face (call the same day).",
      "No improvement after 1 to 2 weeks of the flare medicine, or flares that come back right after stopping.",
      "Itch is keeping your child (or you) awake most nights.",
      "Thinning skin, stretch marks or color changes where a steroid medicine is used.",
    ],
    notes: "",
    sources: [
      "Eichenfield LF et al. Guidelines of care for the management of atopic dermatitis: Section 2. Management and treatment of atopic dermatitis with topical therapies. J Am Acad Dermatol 2014 (AAD)",
      "American Academy of Dermatology, \"Eczema types: atopic dermatitis\" and \"How to bathe a child who has eczema\" (patient education)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Eczema\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-diaper-rash",
    name: "Diaper rash",
    title: "Caring for diaper rash",
    summary: "Causes of diaper rash, frequent changes, air time and barrier cream, and signs of yeast or infection.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Diaper rash is red, irritated skin in the diaper area. It is very common. It usually happens when skin stays wet or touches urine and stool for too long. Rubbing from the diaper, new foods, diarrhea, and antibiotics can also play a part.\n\nSometimes a yeast infection develops on top of the rash. Yeast rash is often bright red, goes into the skin folds, and has small red spots around the edges.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Change diapers often, and as soon as possible after a stool.\n- Clean gently with lukewarm water and a soft cloth, or fragrance-free, alcohol-free wipes. Pat dry; don't rub.\n- Let your baby go without a diaper for some time each day when you can.\n- At every change, spread a thick layer of barrier cream or ointment (zinc oxide or petrolatum), like frosting a cake.\n- You do not need to scrub off all of the old cream at each change. Gently wipe off what is soiled and add more.\n- Fasten diapers a bit loosely so air can get in.",
      },
      {
        heading: "What to avoid",
        body:
          "- Baby powder, including talc and cornstarch. Powder can be breathed in.\n- Wipes or soaps with fragrance or alcohol, which can sting.\n- Tight plastic pants over the diaper.\n- Steroid creams, antifungal creams or other medicines unless we recommended them. If we prescribed one, use it as prescribed and put the barrier cream on top.",
      },
      {
        heading: "What to expect",
        body:
          "With good care, most diaper rash gets better in 2 to 3 days. A rash that lasts longer, keeps coming back, or looks like yeast may need a prescription cream. Let us know if you are worried.",
      },
    ],
    steps: [
      {
        label: "Barrier cream (every change)",
        slot: "as-directed",
        kind: "otc",
        search: "zinc oxide diaper cream",
        directions: "At every diaper change, a thick layer over the red skin. Wipe off only what is soiled and add more.",
      },
    ],
    stopRules: [
      "The rash is not better after 2 to 3 days of home care, or keeps coming back.",
      "Blisters, pus-filled bumps, open sores, crusts, or bleeding.",
      "The rash spreads beyond the diaper area.",
      "Your baby has a fever, is unusually fussy or sleepy, or is not feeding well.",
      "A baby younger than 3 months has a temperature of 100.4 F (38 C) or higher: call right away.",
    ],
    notes: "",
    sources: [
      "American Academy of Pediatrics, HealthyChildren.org, \"Diaper Rash\" (patient education)",
      "American Academy of Dermatology, \"Diaper rash: how to treat\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-cradle-cap",
    name: "Cradle cap",
    title: "Caring for cradle cap",
    summary: "What cradle cap is, gentle washing and loosening scales, and when it needs a visit.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Cradle cap is greasy, yellow or white scale on a baby's scalp. Doctors call it infant seborrheic dermatitis. It can also appear on the eyebrows, behind the ears, on the eyelids, or in the diaper area.\n\nCradle cap is common and harmless. It is not caused by poor hygiene, it is not an allergy, and it is not contagious. It usually does not itch or bother babies.",
      },
      {
        heading: "What to expect",
        body:
          "Cradle cap usually starts in the first few months of life. It often clears on its own over weeks to months, and most babies are past it by their first birthday. Home care helps the scale come off but does not always make it go away faster.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Wash your baby's scalp with a mild, fragrance-free baby shampoo once a day or every few days.\n- While the shampoo is in, gently brush the scalp with a soft baby brush or soft toothbrush to loosen scale.\n- If scale is thick, rub a small amount of petroleum jelly or a few drops of mineral oil into the scalp. Let it sit for a few minutes, then brush gently and wash it out well.\n- Rinse well and pat dry.",
      },
      {
        heading: "What to avoid",
        body:
          "- Picking or scratching off the scale. This can make the skin sore and cause infection.\n- Adult dandruff shampoos or medicated creams unless we recommended them. If we did, use them only as we directed and keep them out of your baby's eyes.\n- Leaving oil on the scalp for long periods. Wash it out.",
      },
    ],
    steps: [],
    stopRules: [
      "The skin under the scale is very red, swollen, cracked, oozing or bleeding.",
      "The rash spreads to the face, body or diaper area, or seems itchy or uncomfortable.",
      "Cradle cap is still heavy after several weeks of home care, or is still there after 12 months of age.",
      "Your baby has a fever, or seems unwell along with the rash.",
    ],
    notes: "",
    sources: [
      "American Academy of Pediatrics, HealthyChildren.org, \"Cradle Cap\" (patient education)",
      "American Academy of Dermatology, \"Seborrheic dermatitis: self-care\" (patient education; infant cradle cap)",
    ],
    reviewed: false,
  },
  {
    id: "peds-hemangioma",
    name: "Infantile hemangioma",
    title: "Your baby's hemangioma",
    summary: "How infant hemangiomas grow and shrink, what to watch for, why some need early treatment, and caring for a sore.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "An infantile hemangioma (he-man-jee-OH-muh) is a growth of extra blood vessels in the skin. It is sometimes called a strawberry mark. It is not cancer and is not caused by anything that happened during pregnancy.\n\nSome are bright red and raised. Others are deeper under the skin and look bluish or like a soft bump. Many are not visible at birth, or show only as a faint mark, and appear in the first few weeks of life.",
      },
      {
        heading: "What to expect",
        body:
          "Hemangiomas follow a typical pattern:\n\n- Growth: most growth happens in the first few months. Much of it is usually done by about 5 months of age.\n- Slowing: growth then slows and stops.\n- Shrinking: over several years the hemangioma slowly fades and flattens.\n\nMany small hemangiomas need no treatment. Some leave behind extra skin, color changes or a scar, which can be treated later if needed.",
      },
      {
        heading: "Why some need early care",
        body:
          "Because growth happens early, an early visit matters. We may recommend treatment if a hemangioma:\n\n- Is near the eye, nose, lip or ear, or in the diaper area\n- Is large, growing fast, or forms a sore\n- Is one of several (5 or more) hemangiomas on the skin\n- Is in a large patch on the face, or in the beard area (chin, jaw, neck)\n\nWe may talk with you about a prescription medicine, given by mouth or put on the skin, and what to watch for while your baby uses it. If your baby is on a medicine by mouth, give it exactly as prescribed, usually with or right after a feeding. Ask us what to do if your baby is sick, vomiting or not eating.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Watch the hemangioma. Taking a photo every week or two in the same light helps you and us see changes.\n- Protect it from rubbing, such as from diaper edges or clothing seams.\n- If the surface breaks open (an ulcer), keep it clean and covered with petroleum jelly and a non-stick bandage, and call us.",
      },
    ],
    steps: [],
    stopRules: [
      "The hemangioma breaks open, bleeds, crusts, or seems painful.",
      "It is growing quickly, or is near the eye and is pushing on or partly closing the eye.",
      "You notice 5 or more hemangiomas on your baby's skin.",
      "Noisy breathing, a hoarse cry, or trouble feeding, especially with a hemangioma on the chin, jaw or neck.",
      "On medicine: your baby is very sleepy, sweaty, cold or clammy, wheezing, or not eating (call right away).",
    ],
    notes: "",
    sources: [
      "Krowchuk DP et al. Clinical Practice Guideline for the Management of Infantile Hemangiomas. Pediatrics 2019 (American Academy of Pediatrics)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Hemangiomas\" (patient education)",
      "American Academy of Dermatology, \"Hemangioma\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-molluscum",
    name: "Molluscum contagiosum",
    title: "Molluscum in children",
    summary: "What molluscum is, how long it lasts, preventing spread at home, and treatment choices to discuss.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Molluscum contagiosum (mo-LUS-kum con-tay-jee-OH-sum) is a common skin infection caused by a virus. It makes small, smooth, skin-colored or pink bumps. Many have a tiny dimple in the center. The bumps can show up anywhere, often on the trunk, arms, legs and in skin folds.\n\nMolluscum is harmless and usually does not hurt. It is very common in young children and is more common in children who have eczema.",
      },
      {
        heading: "What to expect",
        body:
          "Molluscum goes away on its own once the body's immune system recognizes the virus. This usually takes months, and sometimes 1 to 2 years. New bumps may appear while old ones fade.\n\nAs bumps start to clear, they may become red, swollen or crusted, and the skin around them may get itchy. This is often a sign the body is fighting the virus, not an infection.",
      },
      {
        heading: "Preventing spread",
        body:
          "- Try to keep your child from scratching or picking the bumps. This spreads them.\n- Keep nails short.\n- Don't share towels, washcloths or bath water with siblings.\n- Cover bumps with clothing or a bandage for swimming and contact sports when you can.\n- Treat any eczema around the bumps, since itching spreads molluscum.\n- Children with molluscum can go to school and child care.",
      },
      {
        heading: "Treatment choices",
        body:
          "Because molluscum goes away by itself, waiting is a reasonable choice for many families. Treatment may help if there are many bumps, they are spreading, they are itchy or bothersome, or your child feels self-conscious.\n\nOptions include treatments done in our office and prescription medicines. Some treatments can cause blistering, soreness or a mark. We will talk with you about what fits your child. Please don't try to remove the bumps at home.",
      },
    ],
    steps: [],
    stopRules: [
      "Bumps become very painful, warm, swollen, or drain pus, or your child has a fever.",
      "Bumps on or near the eyelids, or your child has a red, irritated eye.",
      "Bumps in the genital area (please tell us at your visit).",
      "Blisters that are large or very painful after an office treatment.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Molluscum contagiosum: diagnosis and treatment\" (patient education)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Molluscum Contagiosum\" (patient education)",
      "Centers for Disease Control and Prevention, \"Molluscum Contagiosum\" (patient information)",
    ],
    reviewed: false,
  },
  {
    id: "peds-warts",
    name: "Warts in children",
    title: "Warts in children",
    summary: "Common and plantar warts in kids: what to expect, safe home treatment with salicylic acid, and preventing spread.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Warts are small, rough growths on the skin caused by a common virus (human papillomavirus, or HPV). They are very common in children. They often show up on the hands and fingers. Warts on the soles of the feet are called plantar warts and can be flat and tender.\n\nTiny black dots in a wart are small blood vessels, not seeds.",
      },
      {
        heading: "What to expect",
        body:
          "Many warts in children go away on their own, though this can take months to a couple of years. Treatment can speed things up, but no treatment works every time, and warts can come back. Treatment usually takes patience and several weeks.",
      },
      {
        heading: "Treating warts at home",
        body:
          "Salicylic acid wart medicine, sold without a prescription, is a common first step for warts on the hands and feet. Use it as directed on the label, and check the label for age limits.\n\n- Soak the wart in warm water for 5 to 10 minutes, then pat dry.\n- Gently file the top with an emery board or pumice stone that is used only for the wart.\n- Apply the medicine only to the wart, not the skin around it.\n- Keep going for several weeks. Stop for a few days if the skin gets sore or red.\n\nDo not use wart medicine on the face, genitals or broken skin. Ask us first if your child has diabetes or poor circulation.",
      },
      {
        heading: "Preventing spread",
        body:
          "- Try to keep your child from picking or biting warts.\n- Don't share towels, nail files or pumice stones.\n- Have your child wear sandals or shower shoes in pool areas and locker rooms.\n- Keep feet dry and change sweaty socks.\n- Children with warts can go to school, sports and swimming.",
      },
      {
        heading: "Office treatments",
        body:
          "If home treatment does not help, we may suggest freezing or other office treatments. Some can be uncomfortable for young children, and several visits are often needed. We will talk with you about what is right for your child.",
      },
    ],
    steps: [],
    stopRules: [
      "A wart is painful, bleeding, changing quickly, or looks different from your child's other warts.",
      "Redness, swelling, pus or pain around a wart you are treating.",
      "Warts on the face or in the genital area (please don't treat these at home; tell us).",
      "Warts keep spreading or don't improve after 2 to 3 months of home treatment.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Warts: diagnosis and treatment\" and \"Warts: tips for managing\" (patient education)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Warts\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-head-lice",
    name: "Head lice",
    title: "Getting rid of head lice",
    summary: "How lice spread, treatment and combing, checking the family, and what household cleaning is (and isn't) needed.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Head lice are tiny insects that live on the scalp and lay eggs (nits) on the hair close to the scalp. They are common in school-age children. Lice are not a sign of being dirty, and they do not spread disease.\n\nLice cannot jump or fly. They spread mostly by direct head-to-head contact, and less often by sharing hats, brushes or pillows. Pets do not spread head lice.",
      },
      {
        heading: "Treatment",
        body:
          "There are several lice treatments, some sold without a prescription and some by prescription. Ask us which treatment is right for your child's age and weight.\n\n- Use the product exactly as directed on the label or as prescribed. Do not leave it on longer or use more than directed.\n- Many products need a second treatment about a week later to kill newly hatched lice. Follow the label or our directions.\n- Some products work best on hair that has not been washed with conditioner first. Check the label.\n- Never use gasoline, kerosene, or pet lice products on a child.",
      },
      {
        heading: "Combing",
        body:
          "Combing helps whatever treatment you use.\n\n- Wet the hair and add conditioner to make combing easier (after treatment, unless the label says otherwise).\n- Use a fine-tooth nit comb. Comb small sections from the scalp to the ends.\n- Wipe the comb on a paper towel after each stroke.\n- Repeat every 2 to 3 days for about 2 weeks, until you find no live lice.",
      },
      {
        heading: "Family and home",
        body:
          "- Check everyone in the household. Treat only those who have live lice, at the same time.\n- Wash bedding, hats and clothes used in the last 2 days in hot water and dry them on high heat.\n- Items you can't wash can be sealed in a plastic bag for 2 weeks.\n- Soak combs and brushes in hot water for 5 to 10 minutes.\n- Vacuum floors and furniture. Lice sprays for the home are not needed and can be harmful.\n\nYour child can usually stay in school. Ask the school about its policy.",
      },
    ],
    steps: [],
    stopRules: [
      "You still see live, moving lice after finishing treatment as directed.",
      "The scalp is red, swollen, oozing or crusted, or your child has swollen glands in the neck.",
      "Burning, a rash or other skin reaction after using a lice product.",
      "Your child is a baby or toddler, or has asthma or other health problems, and you are not sure which treatment is safe.",
    ],
    notes: "",
    sources: [
      "Nolt D et al. Head Lice. Clinical Report, Pediatrics 2022 (American Academy of Pediatrics)",
      "Centers for Disease Control and Prevention, \"Head Lice: Treatment\" (patient information)",
      "American Academy of Dermatology, \"Head lice: diagnosis and treatment\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-scabies",
    name: "Scabies in children and the household",
    title: "Treating scabies in your child and family",
    summary: "What scabies is, treating everyone at the same time, cleaning bedding and clothes, and why itch lasts after treatment.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Scabies is a very itchy rash caused by tiny mites that burrow into the top layer of skin. The itch is often worst at night. In older children it is common between the fingers, on the wrists, waist, and in the armpits and groin. In babies and young children it can also appear on the palms, soles, scalp and face.\n\nScabies spreads through close skin-to-skin contact, so it often passes between family members. It is not a sign of being dirty. Scabies from people does not come from pets.",
      },
      {
        heading: "Treating everyone",
        body:
          "We will prescribe a medicine for your child. Use it exactly as prescribed.\n\n- Everyone in the home and other close contacts (such as caregivers) should be treated at the same time, even if they don't itch. Otherwise scabies passes back and forth.\n- Most creams go on all of the skin from the neck down, including between fingers and toes, under nails, and in skin folds.\n- For babies and young children, we may ask you to include the scalp, face and neck, avoiding the eyes and mouth.\n- Re-apply to hands if they are washed before the medicine should be rinsed off.\n- A second treatment is often needed. Follow our directions.\n\nAsk us before treating a baby, or anyone who is pregnant or breastfeeding.",
      },
      {
        heading: "Cleaning the home",
        body:
          "On the day of treatment:\n\n- Wash bedding, towels and clothing used in the past 3 days in hot water and dry on high heat.\n- Seal items that can't be washed (such as stuffed toys) in a plastic bag for at least 3 days.\n- Vacuum floors and furniture.\n\nSprays and fumigating the home are not needed.",
      },
      {
        heading: "What to expect",
        body:
          "Itching often continues for 2 to 4 weeks after successful treatment. This does not mean the treatment failed. Moisturizers and the itch remedies we suggest can help. Keep nails short to prevent scratching sores.\n\nChildren can usually return to school or child care the day after treatment.",
      },
    ],
    steps: [],
    stopRules: [
      "New burrows or new itchy bumps appear more than 2 to 4 weeks after treatment.",
      "Sores that are crusted, oozing, have yellow crusts or pus, or spreading redness (possible infection).",
      "Thick, crusted rash, especially on the hands or feet.",
      "Itch keeps your child from sleeping despite treatment.",
    ],
    notes: "",
    sources: [
      "Centers for Disease Control and Prevention, \"Scabies: Treatment\" and \"Scabies: Prevention and Control\" (patient information)",
      "American Academy of Dermatology, \"Scabies: diagnosis and treatment\" (patient education)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Scabies\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-impetigo",
    name: "Impetigo",
    title: "Caring for impetigo",
    summary: "What impetigo is, cleaning and using prescribed antibiotics, preventing spread, and returning to school.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Impetigo (im-peh-TIE-go) is a common skin infection caused by bacteria. It often starts as red sores that break open and form honey-colored crusts, often around the nose and mouth. Some children get fluid-filled blisters instead.\n\nImpetigo is contagious. It spreads by touching the sores, and by sharing towels or clothing. It often starts in skin that is already broken, such as a scrape, bug bite or eczema.",
      },
      {
        heading: "Treatment",
        body:
          "We usually treat impetigo with an antibiotic ointment, or with antibiotic medicine by mouth if there are many sores. Use it exactly as prescribed, and finish the full course even if the sores look better.\n\nThe sores usually start to improve within a few days of treatment.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Gently wash the sores with soap and water once or twice a day, and pat dry with a clean towel.\n- Soaking crusts with a warm, wet cloth can help them come off gently. Don't scrub.\n- Apply any prescribed ointment after washing.\n- Cover sores loosely with gauze or a bandage if your child is likely to touch them.\n- Wash your hands before and after caring for the sores.",
      },
      {
        heading: "Preventing spread",
        body:
          "- Keep your child's nails short and discourage scratching.\n- Use a separate towel for your child, and wash towels, washcloths, sheets and clothing in hot water.\n- Clean scrapes and bug bites and keep eczema treated, since impetigo starts more easily in broken skin.\n\nMost children can return to school or child care after at least 24 hours on antibiotics, if the sores are covered. Check with us and your child's school.",
      },
    ],
    steps: [],
    stopRules: [
      "Sores are spreading, or not better after 3 days of treatment.",
      "Fever, or redness, warmth or swelling spreading around the sores.",
      "Large blisters, or sores that are deep or very painful.",
      "In the weeks after: puffy eyes or face, or dark, cola-colored urine (call promptly).",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Impetigo: diagnosis and treatment\" (patient education)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Impetigo\" (patient education)",
      "Centers for Disease Control and Prevention, \"Impetigo: All You Need to Know\" (patient information)",
    ],
    reviewed: false,
  },
  {
    id: "peds-hfmd",
    name: "Hand, foot and mouth disease",
    title: "Hand, foot and mouth disease",
    summary: "What to expect with HFMD, comfort care and fluids, avoiding spread, and signs of dehydration.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Hand, foot and mouth disease is a common illness caused by a virus. It is most common in children under 5, but older children and adults can get it.\n\nIt often starts with fever, sore throat, tiredness and poor appetite. A day or two later, painful sores appear in the mouth, and a rash of small red spots or blisters shows up on the hands and feet. The rash can also appear on the buttocks, legs and around the mouth.",
      },
      {
        heading: "What to expect",
        body:
          "Most children get better on their own in 7 to 10 days. Antibiotics do not help because it is caused by a virus.\n\nThe biggest concern is drinking enough, because mouth sores can make swallowing painful. A few weeks after the illness, some children's fingernails or toenails peel or fall off. This is harmless, and the nails grow back.",
      },
      {
        heading: "Comfort care at home",
        body:
          "- Offer fluids often: water, milk, or cold drinks. Ice pops can soothe the mouth.\n- Soft, cool foods such as yogurt, applesauce or pudding are easier to eat.\n- Avoid salty, spicy and acidic foods and drinks, such as orange juice, which can sting.\n- For pain or fever, ask us or your child's doctor which pain reliever and dose is right for your child's age and weight. Use it as directed on the label.\n- Never give aspirin to children or teens.",
      },
      {
        heading: "Preventing spread",
        body:
          "- Wash hands often with soap and water, especially after diaper changes and using the toilet. The virus can stay in stool for weeks.\n- Don't share cups, utensils or towels.\n- Clean toys and surfaces that are touched often.\n- Keep your child home while they have a fever or are drooling from mouth sores. Ask your child's school or child care when they can return.",
      },
    ],
    steps: [],
    stopRules: [
      "Signs of dehydration: fewer wet diapers or trips to pee, dry mouth, no tears, or unusual sleepiness.",
      "Your child refuses to drink, or can't keep fluids down.",
      "Fever lasting more than 3 days, or a baby younger than 3 months with any fever of 100.4 F (38 C) or higher.",
      "Stiff neck, severe headache, confusion, unusual weakness, trouble walking, or a seizure (seek care right away).",
      "Symptoms are not better after 10 days.",
    ],
    notes: "",
    sources: [
      "Centers for Disease Control and Prevention, \"Hand, Foot, and Mouth Disease\" (patient information)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Hand, Foot, and Mouth Disease\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-tinea-capitis",
    name: "Scalp ringworm (tinea capitis)",
    title: "Scalp ringworm in children",
    summary: "Why scalp ringworm needs medicine by mouth, using medicated shampoo, stopping spread at home, and pet checks.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Scalp ringworm (tinea capitis) is an infection of the scalp and hair caused by a fungus, not a worm. It can cause scaly patches, broken hairs, bald spots, black dots where hairs broke off, or bumps. Glands in the neck may be swollen.\n\nIt is most common in young children. It spreads by contact with an infected person or pet, and by sharing combs, brushes, hats, pillows and towels.",
      },
      {
        heading: "Treatment",
        body:
          "Creams alone do not cure scalp ringworm, because the fungus lives deep in the hair roots. Your child will need an antifungal medicine by mouth.\n\n- Give the medicine exactly as prescribed, for the full time we prescribed, usually several weeks or more.\n- Some of these medicines are absorbed better when taken with food. Follow our directions.\n- Do not stop early, even if the scalp looks better.\n- We may want to check your child's scalp again before stopping.",
      },
      {
        heading: "Medicated shampoo",
        body:
          "We may also recommend a medicated shampoo, such as one with selenium sulfide or ketoconazole. The shampoo does not cure the infection but helps stop it from spreading. Use it as directed on the label or as we told you. We may suggest that other people in the household use it too.",
      },
      {
        heading: "Preventing spread",
        body:
          "- Don't share combs, brushes, hats, hair ties, pillows or towels.\n- Wash combs and brushes in hot, soapy water, or replace them.\n- Wash pillowcases, hats and towels in hot water.\n- Check other children in the home for scaly patches or hair loss, and tell us if you see any.\n- If a pet has patches of hair loss, have it checked by a vet.\n\nChildren can usually go to school once treatment has started.",
      },
      {
        heading: "What to expect",
        body:
          "Hair usually grows back after the infection clears, but this can take several months. Rarely, a severe infection can leave a bald spot, which is one reason early treatment matters.",
      },
    ],
    steps: [],
    stopRules: [
      "A painful, swollen, soft or oozing lump on the scalp.",
      "A new itchy rash elsewhere on the body after starting the medicine.",
      "On medicine: vomiting, a new rash, yellow skin or eyes, dark urine, or your child seems unwell.",
      "The scalp is not improving after several weeks on the medicine, or hair loss is spreading.",
    ],
    notes: "",
    sources: [
      "American Academy of Pediatrics, HealthyChildren.org, \"Ringworm\" / \"Tinea Infections\" (patient education)",
      "American Academy of Dermatology, \"Ringworm: diagnosis and treatment\" (patient education; scalp ringworm)",
      "Centers for Disease Control and Prevention, \"Ringworm\" (patient information)",
    ],
    reviewed: false,
  },
  {
    id: "peds-birthmarks",
    name: "Birthmarks: overview (congenital moles, port-wine stains, cafe-au-lait spots)",
    title: "Your child's birthmark",
    summary: "An overview of congenital moles, port-wine stains and cafe-au-lait spots: what they are, what to watch, and why some need follow-up.",
    category: "pediatric",
    sections: [
      {
        heading: "About birthmarks",
        body:
          "Birthmarks are marks on the skin that are present at birth or appear soon after. Most are harmless and need no treatment. Some types need regular checks or can be treated if they cause problems or bother your child. This handout covers three common types. We will tell you which one your child has.",
      },
      {
        heading: "Congenital moles",
        body:
          "A congenital mole (also called a congenital nevus) is a brown or black mole present at birth or in the first months of life. It grows in proportion to your child, may darken, become raised, or grow hair over time. These changes are usually normal.\n\nMost small and medium moles cause no problems. Large moles need closer follow-up with us.\n\n- Take photos now and then to track changes.\n- Protect the mole from sun with clothing and sunscreen (from 6 months of age).\n- Tell us about a new lump, a sore that doesn't heal, bleeding, or a fast change.",
      },
      {
        heading: "Port-wine stains",
        body:
          "A port-wine stain is a flat, pink, red or purple mark caused by extra small blood vessels in the skin. It is present at birth, grows with your child, and does not go away on its own. Over the years it may darken and become thicker or bumpy.\n\nLaser treatment can lighten many port-wine stains. Starting earlier often works better, so we may discuss it early.\n\nA port-wine stain on the forehead or around the eye needs eye checks and sometimes other tests, because it can occasionally be linked to eye or brain problems. We will guide you.",
      },
      {
        heading: "Cafe-au-lait spots",
        body:
          "Cafe-au-lait spots are flat, light brown patches, named for the color of coffee with milk. They are common, and having one or a few is normal. They grow with your child and do not turn into cancer.\n\nIf a child has 6 or more spots, or freckles in the armpits or groin, we may want to check for a genetic condition called neurofibromatosis. Let us know if you notice new spots.",
      },
    ],
    steps: [],
    stopRules: [
      "A mole that changes quickly, or develops a lump, a sore that won't heal, bleeding, or itch.",
      "A birthmark that breaks open, bleeds, or becomes painful.",
      "A port-wine stain on the forehead or eyelid, with eye redness, a cloudy or enlarged eye, or a seizure (seek care promptly).",
      "You count 6 or more cafe-au-lait spots, or notice freckles in the armpits or groin.",
      "A birthmark is affecting your child's eye, feeding or breathing.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Birthmarks: Overview\" (patient education)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Birthmarks and Hemangiomas\" (patient education)",
      "Society for Pediatric Dermatology, patient handouts on congenital nevi, port-wine stains and cafe-au-lait macules",
    ],
    reviewed: false,
  },
  {
    id: "peds-newborn-skin",
    name: "Newborn skin: milia, baby acne, erythema toxicum",
    title: "Your newborn's skin",
    summary: "Common harmless newborn rashes (milia, baby acne, erythema toxicum), gentle skin care, and fever warning signs.",
    category: "pediatric",
    sections: [
      {
        heading: "Common and harmless",
        body:
          "Newborn skin changes a lot in the first weeks. Many spots and rashes are normal and go away without treatment. Peeling skin in the first weeks, especially on the hands and feet, is also normal.",
      },
      {
        heading: "Milia",
        body:
          "Milia are tiny, firm, white or yellow bumps, often on the nose, cheeks and chin. They are small bumps of trapped skin protein (keratin). When they appear in the mouth or on the gums, they are called Epstein pearls.\n\nMilia usually go away on their own in the first few weeks to months. Don't squeeze or scrub them.",
      },
      {
        heading: "Baby acne",
        body:
          "Baby acne (neonatal acne) is small red or white bumps on the cheeks, forehead and nose. It often appears at around 2 to 4 weeks of age and is linked to normal hormones after birth.\n\nBaby acne usually clears on its own within a few months.\n\n- Wash your baby's face once a day with lukewarm water, or a mild fragrance-free baby cleanser.\n- Pat dry. Don't scrub or squeeze.\n- Don't use oils, lotions or adult acne products on the face unless we recommend them.",
      },
      {
        heading: "Erythema toxicum",
        body:
          "Despite the name, erythema toxicum (air-ih-THEE-muh TOX-ih-kum) is not toxic and is not an infection. It is red blotches with small yellow or white bumps in the center. It usually appears in the first few days of life, can come and go, and moves to different places on the body.\n\nIt does not bother babies and usually goes away within 1 to 2 weeks, with no treatment needed.",
      },
      {
        heading: "Gentle newborn skin care",
        body:
          "- Bathe with plain lukewarm water or a mild, fragrance-free baby cleanser.\n- Skip perfumes, powders and scented lotions.\n- Wash new clothes and bedding before use with a fragrance-free detergent.\n- Keep your baby out of direct sun. Use shade and light clothing.",
      },
    ],
    steps: [],
    stopRules: [
      "Your baby is younger than 3 months and has a temperature of 100.4 F (38 C) or higher: call right away.",
      "Blisters, pus-filled bumps, crusting, or skin that looks raw or is peeling in sheets.",
      "Your baby is unusually sleepy, hard to wake, not feeding well, or has yellow skin or eyes.",
      "Baby acne lasts beyond 3 to 4 months, has blackheads or deep bumps, or leaves marks.",
      "A rash that does not fit what is described here, or you are worried.",
    ],
    notes: "",
    sources: [
      "American Academy of Pediatrics, HealthyChildren.org, \"Skin Conditions in Newborns\" / \"Newborn Rashes and Skin Conditions\" (patient education)",
      "American Academy of Dermatology, \"Baby acne\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-sun-protection",
    name: "Sun protection for babies and children",
    title: "Protecting your child from the sun",
    summary: "Sun safety by age: shade and clothing for babies under 6 months, sunscreen from 6 months, and sunburn care.",
    category: "pediatric",
    sections: [
      {
        heading: "Why it matters",
        body:
          "Children's skin burns easily, and sunburns in childhood raise the risk of skin cancer later in life. Good sun habits started early are easier to keep. Sun protection matters for children of every skin color, and on cloudy days too.",
      },
      {
        heading: "Babies under 6 months",
        body:
          "Keep babies younger than 6 months out of direct sunlight.\n\n- Use shade: a tree, umbrella, or stroller canopy.\n- Dress your baby in lightweight long sleeves and long pants, and a wide-brimmed hat.\n- Avoid the strongest sun, about 10 a.m. to 4 p.m., when you can.\n- Watch for overheating, and offer feedings often in hot weather.\n\nSunscreen is not recommended for babies this young in most cases. If shade and clothing aren't possible, ask us or your baby's doctor about using a small amount on small areas, such as the face and backs of the hands.",
      },
      {
        heading: "Children 6 months and older",
        body:
          "- Use a broad-spectrum sunscreen, SPF 30 or higher, that is water-resistant.\n- Apply it about 15 minutes before going outside, and use enough to cover all skin that clothing won't cover, including ears, nose, neck and the tops of feet.\n- Reapply at least every 2 hours, and after swimming or sweating.\n- Mineral sunscreens (zinc oxide or titanium dioxide) are often gentler on sensitive skin.\n- Don't spray sunscreen directly on the face. Spray it into your hands first, and avoid breathing it in.\n- Test a new sunscreen on a small area first if your child has sensitive skin.",
      },
      {
        heading: "Beyond sunscreen",
        body:
          "- Seek shade, especially from about 10 a.m. to 4 p.m.\n- Choose wide-brimmed hats and clothing that covers the skin. Clothing labeled UPF gives extra protection.\n- Use sunglasses that block 100% of UV rays.\n- Take extra care near water, sand and snow, which reflect the sun.\n- Indoor tanning is not safe at any age.",
      },
      {
        heading: "If your child gets a sunburn",
        body:
          "- Get out of the sun and cool the skin with cool baths or cool, damp cloths.\n- Use a gentle, fragrance-free moisturizer.\n- Offer extra fluids.\n- Ask us or your child's doctor before giving any pain reliever, and use it as directed on the label for your child's age and weight.\n- Don't pop blisters.",
      },
    ],
    steps: [
      {
        label: "Sunscreen (6 months and older)",
        slot: "am",
        kind: "otc",
        search: "SPF 30",
        directions: "Broad-spectrum, water-resistant SPF 30 or higher on all uncovered skin about 15 minutes before going out. Reapply every 2 hours and after swimming or sweating.",
      },
    ],
    stopRules: [
      "A baby younger than 1 year gets a sunburn.",
      "Sunburn with blisters over a large area, or severe pain or swelling.",
      "Fever, chills, headache, vomiting, dizziness or confusion after time in the sun (seek care promptly).",
      "Signs of dehydration: fewer wet diapers or trips to pee, dry mouth, or unusual sleepiness.",
      "A rash, burning or stinging after using a sunscreen.",
    ],
    notes: "",
    sources: [
      "American Academy of Pediatrics, HealthyChildren.org, \"Sun Safety: Information for Parents About Sunburn & Sunscreen\" (patient education)",
      "Balk SJ et al. Ultraviolet Radiation: A Hazard to Children and Adolescents. Pediatrics 2011 (AAP Council on Environmental Health and Section on Dermatology)",
      "American Academy of Dermatology, \"Sunscreen FAQs\" and \"Prevent skin cancer in children\" (patient education)",
      "U.S. Food and Drug Administration, \"Should You Put Sunscreen on Infants? Not Usually\" (consumer update)",
    ],
    reviewed: false,
  },
  {
    id: "peds-teen-acne",
    name: "Acne in preteens and teens",
    title: "Acne: a guide for teens and parents",
    summary: "Why acne happens, a simple daily routine with benzoyl peroxide and adapalene, what to expect, and when to come back.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Acne is very common in preteens and teens. During puberty, hormones make the skin produce more oil. Oil and dead skin cells clog pores, and bacteria in the pores cause redness and swelling. This leads to blackheads, whiteheads, red bumps and sometimes deeper, painful bumps.\n\nAcne is not caused by dirt, and it is not anyone's fault. Scrubbing harder does not help and can make it worse.",
      },
      {
        heading: "A simple daily routine",
        body:
          "- Wash the face twice a day and after sweating with a gentle cleanser and fingertips. No scrubs or rough washcloths.\n- Use acne treatments on the whole area where acne appears, not just on spots, to help prevent new ones.\n- Benzoyl peroxide (a wash or gel) kills acne bacteria. It can bleach towels, pillowcases and clothing, so use white towels.\n- Adapalene gel unclogs pores. It is sold without a prescription for ages 12 and up. Use a pea-sized amount for the whole face at night.\n- Use an oil-free, fragrance-free moisturizer if skin gets dry.\n- Use a broad-spectrum SPF 30 or higher sunscreen, since some treatments make skin burn more easily.",
      },
      {
        heading: "What to expect",
        body:
          "Acne treatments work slowly. Most people see improvement in 8 to 12 weeks of daily use. Some dryness, redness or peeling in the first few weeks is common. Using less often for a while, or adding moisturizer, usually helps.\n\nKeep using the routine even when skin looks better. Acne often comes back when treatment stops.",
      },
      {
        heading: "Helpful tips",
        body:
          "- Try not to pick, pop or squeeze pimples. This can lead to dark marks and scars.\n- Choose makeup, sunscreen and hair products labeled oil-free or non-comedogenic (won't clog pores).\n- Wash sports gear, helmets and pads that rub on the skin, and shower soon after sports.\n- Anyone who is pregnant or could become pregnant should talk with us before using adapalene or other retinoids.\n\nAcne can affect how a teen feels about themselves. If acne is affecting mood, sleep or school, let us know. Prescription treatments can help.",
      },
    ],
    steps: [
      {
        label: "Benzoyl peroxide wash",
        slot: "am",
        kind: "otc",
        search: "benzoyl peroxide wash",
        directions: "Lather onto damp skin where acne appears, leave on 1 to 2 minutes, then rinse. Can bleach fabric.",
      },
      {
        label: "Gentle cleanser",
        slot: "pm",
        kind: "otc",
        search: "gentle cleanser",
        directions: "Wash with lukewarm water and fingertips, rinse and pat dry.",
      },
      {
        label: "Adapalene gel",
        slot: "pm",
        kind: "otc",
        search: "adapalene gel",
        directions: "Ages 12 and up, or as we direct: a pea-sized amount for the whole face on dry skin at night. Start every other night if skin gets dry.",
      },
      {
        label: "Oil-free moisturizer",
        slot: "both",
        kind: "otc",
        search: "oil-free moisturizer",
        directions: "A fragrance-free, non-comedogenic moisturizer after treatment, more often if skin feels dry or tight.",
      },
    ],
    stopRules: [
      "Deep, painful bumps, or new scars or dark marks.",
      "No real improvement after 12 weeks of using the routine every day.",
      "Severe redness, burning, swelling or peeling that doesn't settle after a few days off the products.",
      "Acne in a child younger than 7, or with early signs of puberty such as body odor, breast growth or pubic hair.",
      "Acne is making your teen feel very down, anxious, or want to avoid school or friends.",
    ],
    notes: "",
    sources: [
      "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024 (AAD)",
      "Eichenfield LF et al. Evidence-based recommendations for the diagnosis and treatment of pediatric acne. Pediatrics 2013",
      "American Academy of Dermatology, \"Acne: tips for managing\" (patient education)",
      "FDA OTC labeling: adapalene gel 0.1%; benzoyl peroxide (21 CFR 333.350)",
    ],
    reviewed: false,
  },
  {
    id: "peds-alopecia-areata",
    name: "Alopecia areata in children",
    title: "Alopecia areata in children",
    summary: "What alopecia areata is, what to expect with regrowth, treatment options to discuss, and emotional support.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Alopecia areata (al-oh-PEE-shuh air-ee-AH-tuh) causes hair to fall out, usually in smooth, round patches on the scalp. It can also affect the eyebrows, eyelashes or other body hair. Some children have small dents (pits) in their nails.\n\nIt happens when the body's immune system attacks the hair roots by mistake. The hair roots are not destroyed, so hair can grow back. Alopecia areata is not contagious, and it is not caused by anything you or your child did.",
      },
      {
        heading: "What to expect",
        body:
          "Alopecia areata is hard to predict. In many children with a few small patches, hair grows back within months to a year, even without treatment. New patches can appear while others regrow, and hair loss can come back in the future.\n\nRegrowing hair is sometimes white or fine at first, and usually returns to its normal color over time. Some children have more widespread hair loss.",
      },
      {
        heading: "Treatment options",
        body:
          "There is no cure, but treatment can help hair regrow. The choice depends on your child's age and how much hair is affected. Options include:\n\n- Prescription creams, ointments or solutions applied to the patches\n- Injections into the patches for older children and teens who can tolerate them\n- For widespread hair loss, other prescription treatments, including newer medicines by mouth for some teens\n\nUse any treatment exactly as prescribed. It can take several months to see regrowth.",
      },
      {
        heading: "Supporting your child",
        body:
          "Hair loss can be hard for children and teens. It can help to:\n\n- Talk openly with your child and let them decide how much to share with others.\n- Let teachers know, so they can watch for teasing.\n- Offer hats, scarves, headbands or wigs if your child wants them.\n- Protect bare scalp from the sun with a hat or sunscreen.\n- Connect with support groups for families living with alopecia areata.",
      },
    ],
    steps: [],
    stopRules: [
      "Hair loss is spreading quickly, or includes most of the scalp, eyebrows or eyelashes.",
      "The scalp in the bald patches is red, scaly, itchy, painful or has bumps (this may be a different condition).",
      "Your child seems sad, anxious, withdrawn, or is being teased or avoiding school.",
      "Side effects from a treatment, such as skin thinning, irritation, or new symptoms after starting a medicine.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Alopecia areata: diagnosis and treatment\" and \"Alopecia areata: tips for managing\" (patient education)",
      "National Alopecia Areata Foundation, information for parents of children with alopecia areata",
      "American Academy of Pediatrics, HealthyChildren.org, \"Hair Loss in Children\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-insect-bites",
    name: "Insect bites and papular urticaria",
    title: "Insect bites and bite reactions in children",
    summary: "Why some children get long-lasting itchy bumps from bites, itch relief, safe insect repellents by age, and finding the source.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Some children react strongly to bites from mosquitoes, fleas, bed bugs or other insects. This is called papular urticaria (PAP-yoo-ler er-tih-KAIR-ee-uh). It causes very itchy, red bumps, often in groups or lines, on the arms, legs and other uncovered skin.\n\nThe bumps can last for days to weeks. New bites can make old bumps flare again. It is most common in young children and is usually outgrown as the body gets used to the bites. It is not contagious.",
      },
      {
        heading: "Relieving the itch",
        body:
          "- Use cool compresses or a cool bath.\n- Calamine lotion can soothe itchy bumps.\n- A low-strength hydrocortisone cream, sold without a prescription, can help for short periods. Use it as directed on the label, and ask us first for a child under 2.\n- An allergy medicine (antihistamine) by mouth may help with itch. Ask us which one and what dose is right for your child's age and weight.\n- Keep nails short, and discourage scratching to prevent infection.",
      },
      {
        heading: "Preventing bites",
        body:
          "- Dress children in light long sleeves and long pants outdoors, and use netting over strollers.\n- Use screens on windows and doors.\n- Insect repellent: ask us which product and strength fits your child's age. Repellents with DEET should not be used on babies younger than 2 months. Do not use oil of lemon eucalyptus on children under 3.\n- Put repellent on your hands first, then on your child. Keep it off the hands, eyes, mouth and broken skin. Wash it off at the end of the day.\n- Don't use products that combine sunscreen and repellent.",
      },
      {
        heading: "Finding the source",
        body:
          "Finding and removing the source of bites is the best way to stop new bumps.\n\n- If you have pets, ask your vet about flea control, and wash pet bedding.\n- Vacuum carpets and furniture often.\n- Check mattress seams and bed frames for bed bugs or small dark spots.\n- Bites may come from places your child spends time, such as a relative's home or child care.",
      },
    ],
    steps: [],
    stopRules: [
      "Bites become very red, warm, swollen, painful, or drain pus, or red streaks spread out (possible infection).",
      "Fever, joint pain, or a rash like a bull's-eye after a tick bite.",
      "New bumps keep appearing for weeks despite your efforts, or itch keeps your child from sleeping.",
      "A large area of swelling around a bite that keeps growing.",
    ],
    notes: "",
    sources: [
      "American Academy of Pediatrics, HealthyChildren.org, \"Choosing an Insect Repellent for Your Child\" and \"Insect Bites and Stings\" (patient education)",
      "Centers for Disease Control and Prevention, \"Preventing Mosquito Bites\" (patient information; repellent use in children)",
      "American Academy of Dermatology, \"Bug bites and stings: when to see a dermatologist\" (patient education)",
    ],
    reviewed: false,
  },
  {
    id: "peds-keratosis-pilaris",
    name: "Keratosis pilaris in children",
    title: "Keratosis pilaris in children",
    summary: "What keratosis pilaris is, gentle skin care and moisturizing, smoothing lotions for older children, and what to expect.",
    category: "pediatric",
    sections: [
      {
        heading: "What it is",
        body:
          "Keratosis pilaris (ker-uh-TOE-sis pih-LAIR-iss) causes small, rough bumps that can feel like sandpaper. The bumps are often on the backs of the upper arms, the thighs and the buttocks. In young children, it can also appear on the cheeks, sometimes with redness.\n\nThe bumps are plugs of keratin, a protein in skin, around hair follicles. Keratosis pilaris is harmless, very common, and often runs in families. It is more common in children with dry skin or eczema. It is not contagious.",
      },
      {
        heading: "What to expect",
        body:
          "Keratosis pilaris often gets milder as children grow, though it may last into adulthood. It is often worse in winter when skin is dry and better in summer. Treatment can make the skin feel smoother, but the bumps usually come back if care stops.",
      },
      {
        heading: "Caring for it at home",
        body:
          "- Give short baths or showers in lukewarm water. Use a gentle, fragrance-free cleanser.\n- Pat dry, then put on a fragrance-free moisturizer within a few minutes, while skin is still a little damp.\n- Moisturize every day, even when the skin looks better.\n- Don't scrub hard or pick the bumps. This can cause redness, irritation and marks.\n- A humidifier can help in dry winter months.",
      },
      {
        heading: "Smoothing lotions",
        body:
          "For older children, a moisturizer with urea, lactic acid or salicylic acid can help soften the bumps. These can sting, especially on irritated or broken skin. Ask us before using them on a young child or on the face, and use them as directed on the label. If we prescribe a cream, use it as prescribed.",
      },
    ],
    steps: [
      {
        label: "Moisturizer (every day)",
        slot: "both",
        kind: "otc",
        search: "fragrance-free moisturizer",
        directions: "After the bath on slightly damp skin, and again once a day. Fragrance-free cream or lotion.",
      },
      {
        label: "Smoothing lotion (if we recommend it)",
        slot: "as-directed",
        kind: "otc",
        search: "urea lotion",
        directions: "Only as we direct, on the rough areas. Skip it if it stings or the skin is irritated.",
      },
    ],
    stopRules: [
      "The bumps become red, painful, swollen or filled with pus.",
      "The skin is very itchy, cracked or irritated, or a smoothing lotion causes stinging that doesn't settle.",
      "Patches of hair loss with the bumps, or the rash looks different from what is described here.",
    ],
    notes: "",
    sources: [
      "American Academy of Dermatology, \"Keratosis pilaris: diagnosis and treatment\" (patient education)",
      "American Academy of Pediatrics, HealthyChildren.org, \"Keratosis Pilaris\" (patient education)",
    ],
    reviewed: false,
  },
];
