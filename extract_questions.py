"""
Extracts psychology quiz questions from the PDF and writes questions.json
for the React quiz app.
"""
import pdfplumber
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = r'C:\Users\RazvanBuzatu\Desktop\GHID_GRILE_PSIHOLOGIE_BV_2026_1.pdf'
OUTPUT_PATH = r'C:\Users\RazvanBuzatu\Desktop\Files\Claude Code\psihologie-quiz\quiz-app\src\data\questions.json'

CHAPTERS = [
    {
        "id": 1,
        "title": "Fundamentele Psihologiei",
        "short": "Fundamentele Psihologiei",
        "question_pages": (11, 37),
        "answer_pages":   (36, 47),
        "has_tf": False,
        "tf_count": 0,
    },
    {
        "id": 2,
        "title": "Psihodiagnoza Inteligenței și Aptitudinilor",
        "short": "Psihodiagnoza Inteligenței",
        "question_pages": (49, 66),
        "answer_pages":   (65, 72),
        "has_tf": False,
        "tf_count": 0,
    },
    {
        "id": 3,
        "title": "Psihodiagnoza Personalității",
        "short": "Psihodiagnoza Personalității",
        "question_pages": (74, 91),
        "answer_pages":   (90, 97),
        "has_tf": False,
        "tf_count": 0,
    },
    {
        "id": 4,
        "title": "Metodologia Cercetării Psihologice și Pedagogice",
        "short": "Metodologia Cercetării",
        "question_pages": (98, 133),
        "answer_pages":   (132, 141),
        "has_tf": True,
        "tf_count": 70,
    },
    {
        "id": 5,
        "title": "Psihologia Dezvoltării",
        "short": "Psihologia Dezvoltării",
        "question_pages": (142, 171),
        "answer_pages":   (170, 180),
        "has_tf": True,
        "tf_count": 30,
    },
]

# ─── PDF text extraction ───────────────────────────────────────────────────

def extract_pages(pdf_path):
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return pages

def get_page_range_text(pages, start, end):
    lines = []
    for page_text in pages[start:end]:
        for line in page_text.split('\n'):
            s = line.strip()
            if s.isdigit():
                continue  # drop bare page numbers
            if s:
                lines.append(s)
    return '\n'.join(lines)

# ─── Answer key parsing ───────────────────────────────────────────────────

def parse_answers(text):
    answers = {}
    # Match "N. ANS: A" or "N. ANS: A, B, C" or "N. ANS: T" / "N. ANS: F"
    pattern = re.compile(
        r'^(\d+)\.\s+ANS:\s+([A-Z](?:,\s*[A-Z])*|[TF])\s*$',
        re.MULTILINE
    )
    for m in pattern.finditer(text):
        n = int(m.group(1))
        ans = m.group(2).replace(' ', '')
        answers[n] = ans
    return answers

# ─── Question parsing ─────────────────────────────────────────────────────

Q_START  = re.compile(r'^(\d{1,3})\.\s+(.+)$')
OPT_START = re.compile(r'^([a-h])[.)]\s+(.+)$')

# Lines that signal the start of the questions section (not bibliography)
QUESTION_SECTION_MARKERS = [
    'întrebări de tip',
    'multiple response',
    'identify one or more',
    'identifică varianta',
]

# Lines that signal the END of the questions section
ANSWER_SECTION_MARKERS = [
    'răspunsuri',
]

def is_question_section_marker(line):
    low = line.lower()
    return any(m in low for m in QUESTION_SECTION_MARKERS)

def is_answer_section_marker(line):
    low = line.strip().lower()
    # Only match when the line STARTS with "Răspunsuri" (possibly preceded by
    # a chapter-number prefix like "4.4. "). This prevents option text that
    # contains "răspunsuri" mid-line from being a false positive.
    return bool(re.match(r'^(\d+\.\d+\.?\s+)?r[ăa]spunsuri', low))

def parse_questions(text):
    """
    State-machine parser.

    Key rules:
    - Only accept questions after seeing a 'Întrebări de tip' section header
    - If a new question number N <= max_q_seen so far, treat it as a
      numbered sub-item (fold into the current question's text), not a
      new question. This prevents "1. cerința epistemologică" inside
      question 32 from spawning a false new question.
    """
    questions = []
    current_q  = None
    current_opt = None
    in_question_section = False
    max_q_seen = 0

    def save_opt():
        nonlocal current_opt
        if current_opt and current_q is not None:
            current_q['options'].append(current_opt)
        current_opt = None

    def save_q():
        nonlocal current_q
        if current_q is not None:
            save_opt()
            questions.append(current_q)
        current_q = None

    lines = text.split('\n')

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        # ── Section transition checks ──────────────────────────────────
        if is_answer_section_marker(line):
            save_q()
            break  # done with questions

        if is_question_section_marker(line):
            in_question_section = True
            continue

        if not in_question_section:
            continue

        # Skip lines that look like bibliography entries
        # (capital-letter surname followed by comma, e.g. "Bălan, Cristiana.")
        if re.match(r'^[A-ZȘȚĂÎÂ]\w+,\s+[A-ZȘȚĂÎÂA-Za-z]', line):
            continue
        if line.startswith('(') or re.match(r'^pp\.\s*\d', line, re.IGNORECASE):
            continue
        if re.match(r'^\(pp\.\s*\d', line):
            continue

        # ── Lettered option ────────────────────────────────────────────
        om = OPT_START.match(line)
        if om and current_q is not None:
            save_opt()
            current_opt = {'letter': om.group(1), 'text': om.group(2)}
            continue

        # ── Possible question start ────────────────────────────────────
        qm = Q_START.match(line)
        if qm:
            qnum = int(qm.group(1))
            qtext = qm.group(2)

            if qnum <= max_q_seen:
                # This is a numbered sub-item inside the current question
                if current_q is not None:
                    if current_opt is not None:
                        current_opt['text'] += f'\n{qnum}. {qtext}'
                    else:
                        current_q['text'] += f'\n{qnum}. {qtext}'
                        # Track small sequential numbered items (1., 2., 3., ...)
                        # so we can rebuild options from them if the lettered
                        # options turn out to be malformed in the source.
                        if qnum <= 9:
                            current_q['numbered_subs'].append(qtext)
                continue

            # Genuine new question
            save_q()
            current_q = {
                'number': qnum,
                'text': qtext,
                'options': [],
                'numbered_subs': [],
            }
            max_q_seen = qnum
            continue

        # ── Continuation line ──────────────────────────────────────────
        if current_q is not None:
            if current_opt is not None:
                current_opt['text'] += ' ' + line
            else:
                current_q['text'] += ' ' + line

    save_q()
    return questions

# ─── Post-processing ──────────────────────────────────────────────────────

def split_inline_options(options):
    """
    Some questions print their options inline on a single line, e.g.
    "a. colectiv b. individual" or "a. x ; b. y ; c. z". The line parser
    captures all of that as one option (letter 'a'). Split such an option
    into its constituent options.

    Only splits when the next sequential letter (b, c, ...) is NOT already
    present as a separately-parsed option, so correctly-separated options
    are never touched.
    """
    existing = {o['letter'].lower() for o in options}
    result = []
    for opt in options:
        segments = [(opt['letter'].lower(), opt['text'])]
        while True:
            last_letter, last_text = segments[-1]
            nxt = chr(ord(last_letter) + 1)
            if nxt in existing:
                break
            m = re.search(r'\s' + nxt + r'[.)]\s+', last_text)
            if not m:
                break
            before = last_text[:m.start()].strip().strip(';').strip()
            after  = last_text[m.end():].strip()
            segments[-1] = (last_letter, before)
            segments.append((nxt, after))
            existing.add(nxt)
        for letter, txt in segments:
            result.append({'letter': letter, 'text': txt.strip().strip(';').strip()})
    return result


def find_reset_index(options):
    """
    Return the index where the option-letter sequence restarts (e.g. the
    second 'a' in a 'a b c d e / a b c d e' two-list combo question), or None.
    A reset means the source listed the statements first and the lettered
    answer choices (combinations) second — only then do we treat the first
    block as context.
    """
    for i in range(1, len(options)):
        if options[i]['letter'].lower() < options[i - 1]['letter'].lower():
            return i
    return None


def finalize_question(q, answers, chapter_id, has_tf, tf_count):
    """Returns (question_dict | None, status). status is None when OK, or a
    short reason string ('no_answer' / 'no_options' / 'invalid_answer')."""
    num     = q['number']
    raw_ans = answers.get(num)
    if raw_ans is None:
        return None, 'no_answer'

    options = split_inline_options(q['options'])

    # ── True / False ───────────────────────────────────────────────────
    if (has_tf and num <= tf_count) or (not options and raw_ans in ('T', 'F')):
        return {
            'id': f"ch{chapter_id}_{num}", 'chapter': chapter_id, 'number': num,
            'type': 'true_false', 'text': q['text'].strip(), 'options': [],
            'answer': raw_ans,
        }, None

    if not options:
        return None, 'no_options'

    text = q['text']

    # ── Two-list combo format: statements first, lettered answers second.
    #    Only when the letters actually restart. Otherwise keep ALL options
    #    selectable (continuous lettering like a,b,c,d + combo e).
    reset = find_reset_index(options)
    if reset is not None:
        context_opts = options[:reset]
        sel_opts     = options[reset:]
        ctx = '\n'.join(f"{o['letter']}) {o['text']}" for o in context_opts)
        text = text + '\n\nOpțiuni:\n' + ctx
    else:
        sel_opts = options

    is_multi    = ',' in raw_ans
    ans_letters = [a.strip().lower() for a in raw_ans.split(',')] if is_multi else [raw_ans.lower()]

    # ── Salvage source-malformed questions: if the answer letter doesn't
    #    correspond to any option but the question carries numbered items,
    #    rebuild the options from those items (a=1, b=2, c=3, ...).
    sel_letters = {o['letter'].lower() for o in sel_opts}
    if not all(a in sel_letters for a in ans_letters) and q.get('numbered_subs'):
        subs = q['numbered_subs']
        sel_opts = [{'letter': chr(ord('a') + i), 'text': s} for i, s in enumerate(subs)]
        # Drop the numbered items from the displayed text (they're now options)
        text = '\n'.join(l for l in text.split('\n') if not re.match(r'^\d+\.\s', l.strip()))

    final_opts = [{'letter': o['letter'].lower(), 'text': o['text'].rstrip('.').strip()}
                  for o in sel_opts]

    # Readability: when options are bare numbers ("1", "2", "3") that point at
    # the numbered statements in the stem, swap in the statement text so each
    # option reads on its own, and drop the now-redundant list from the stem.
    if (q.get('numbered_subs') and final_opts and
            all(re.fullmatch(r'\d+', o['text']) for o in final_opts)):
        subs = q['numbered_subs']
        nums = [int(o['text']) for o in final_opts]
        if max(nums) <= len(subs):
            for o in final_opts:
                o['text'] = subs[int(o['text']) - 1].rstrip('.').strip()
            text = '\n'.join(l for l in text.split('\n') if not re.match(r'^\d+\.\s', l.strip()))

    final_letters = {o['letter'] for o in final_opts}

    qtype  = 'multi_select' if is_multi else 'multiple_choice'
    answer = ans_letters if is_multi else ans_letters[0]

    status = None if all(a in final_letters for a in ans_letters) else 'invalid_answer'
    return {
        'id': f"ch{chapter_id}_{num}", 'chapter': chapter_id, 'number': num,
        'type': qtype, 'text': text.strip(), 'options': final_opts, 'answer': answer,
    }, status

# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    print("Reading PDF...")
    pages = extract_pages(PDF_PATH)
    print(f"Total pages: {len(pages)}")

    all_questions = []

    for ch in CHAPTERS:
        print(f"\n=== Chapter {ch['id']}: {ch['short']} ===")

        q_text = get_page_range_text(pages, ch['question_pages'][0], ch['question_pages'][1])
        a_text = get_page_range_text(pages, ch['answer_pages'][0],   ch['answer_pages'][1])

        answers = parse_answers(a_text)
        print(f"  Answers: {len(answers)} (range: {min(answers)}-{max(answers)})")

        raw_qs = parse_questions(q_text)
        print(f"  Raw questions: {len(raw_qs)}")

        ch_questions = []
        skipped = 0
        invalid = []
        for rq in raw_qs:
            fq, status = finalize_question(rq, answers, ch['id'], ch['has_tf'], ch['tf_count'])
            if fq is None:
                skipped += 1
                continue
            if status == 'invalid_answer':
                invalid.append(fq)
            ch_questions.append(fq)

        types = {}
        for q in ch_questions:
            types[q['type']] = types.get(q['type'], 0) + 1

        print(f"  Finalized: {len(ch_questions)}  skipped: {skipped}  types: {types}")
        if invalid:
            print(f"  ⚠️  STILL UNANSWERABLE: {len(invalid)}")
            for q in invalid:
                print(f"       #{q['number']} ans={q['answer']} opts={[o['letter'] for o in q['options']]}")
        all_questions.extend(ch_questions)

    # Final integrity check across the whole set
    bad = []
    for q in all_questions:
        if q['type'] == 'true_false':
            continue
        letters = {o['letter'].lower() for o in q['options']}
        ans = q['answer'] if isinstance(q['answer'], list) else [q['answer']]
        if not all(a.lower() in letters for a in ans):
            bad.append(q['id'])

    print(f"\nTotal questions: {len(all_questions)}")
    print(f"Integrity check — unanswerable questions remaining: {len(bad)}")
    if bad:
        print(f"  {bad}")

    output = {
        "chapters": [
            {"id": ch["id"], "title": ch["title"], "short": ch["short"]}
            for ch in CHAPTERS
        ],
        "questions": all_questions,
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Written → {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
