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
                continue

            # Genuine new question
            save_q()
            current_q = {
                'number': qnum,
                'text': qtext,
                'options': [],
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

def has_combo(text):
    """True if text is a letter-combination answer like 'a+b', 'a+b+c+d'."""
    t = text.strip()
    return bool(re.match(r'^[a-e](\+[a-e])+', t))

def finalize_question(q, answers, chapter_id, has_tf, tf_count):
    num     = q['number']
    options = q['options']

    # ── Determine question type ────────────────────────────────────────
    if has_tf and num <= tf_count:
        qtype      = 'true_false'
        clean_opts = []
    else:
        combo_opts = [o for o in options if has_combo(o['text'])]
        plain_opts = [o for o in options if not has_combo(o['text'])]

        if combo_opts:
            # Move plain descriptive items into question text as context
            if plain_opts:
                ctx = '\n'.join(f"{o['letter']}) {o['text']}" for o in plain_opts)
                q['text'] += '\n\nOpțiuni:\n' + ctx
            clean_opts = combo_opts
            qtype = 'multiple_choice'
        elif plain_opts:
            clean_opts = plain_opts
            qtype = 'multiple_choice'
        else:
            qtype      = 'true_false'   # no options → probably a missed T/F
            clean_opts = []

    # ── Resolve answer ─────────────────────────────────────────────────
    raw_ans = answers.get(num)
    if raw_ans is None:
        return None  # no answer found – skip

    if qtype == 'true_false':
        answer     = raw_ans          # 'T' or 'F'
        final_opts = []
    elif ',' in raw_ans:
        qtype      = 'multi_select'
        answer     = [x.strip().lower() for x in raw_ans.split(',')]
        final_opts = [
            {'letter': o['letter'], 'text': o['text'].rstrip('.')}
            for o in clean_opts
        ]
    else:
        answer     = raw_ans.lower()  # 'a', 'b', …
        final_opts = [
            {'letter': o['letter'], 'text': o['text'].rstrip('.')}
            for o in clean_opts
        ]

    # Skip questions that have no usable options (except T/F)
    if qtype != 'true_false' and not final_opts:
        return None

    return {
        'id':      f"ch{chapter_id}_{num}",
        'chapter': chapter_id,
        'number':  num,
        'type':    qtype,
        'text':    q['text'].strip(),
        'options': final_opts,
        'answer':  answer,
    }

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
        for rq in raw_qs:
            fq = finalize_question(rq, answers, ch['id'], ch['has_tf'], ch['tf_count'])
            if fq:
                ch_questions.append(fq)
            else:
                skipped += 1

        types = {}
        for q in ch_questions:
            types[q['type']] = types.get(q['type'], 0) + 1

        print(f"  Finalized: {len(ch_questions)}  skipped: {skipped}  types: {types}")
        all_questions.extend(ch_questions)

    print(f"\nTotal questions: {len(all_questions)}")

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
