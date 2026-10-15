"""Quiz generation and automated evaluation service."""

import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.db.document_store import get_document_store
from app.db.vector_store import get_vector_store
from app.models import Citation, QuizQuestion, QuizRequest, QuizResponse, QuizResult, QuizSubmission
from app.prompts.quiz_prompt import QUIZ_SYSTEM_INSTRUCTION, build_quiz_prompt
from app.services.llm import get_llm_provider


def _extract_json_block(text: str) -> str:
    """Extract JSON content from LLM response text, stripping markdown code fences."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    # Check if text starts with [ or {
    first_bracket = min(
        text.find("[") if text.find("[") != -1 else len(text),
        text.find("{") if text.find("{") != -1 else len(text),
    )
    if first_bracket < len(text):
        last_bracket = max(text.rfind("]"), text.rfind("}"))
        if last_bracket != -1:
            return text[first_bracket:last_bracket + 1].strip()
    return text


def generate_quiz(
    doc_ids: List[str],
    num_questions: int = 5,
    question_types: Optional[List[str]] = None,
) -> QuizResponse:
    """Generate a structured quiz from the content of specified documents.

    Args:
        doc_ids: List of document IDs to use for quiz generation.
        num_questions: Number of questions to generate (default 5).
        question_types: List of question types ('mcq', 'true_false', 'short_answer').

    Returns:
        QuizResponse containing list of QuizQuestion objects.

    Raises:
        ValueError: If no content is found for the given documents.
    """
    if question_types is None:
        question_types = ["mcq"]

    vector_store = get_vector_store()
    chunks = vector_store.get_chunks_by_docs(doc_ids)

    if not chunks:
        # Fallback: check if doc_ids is empty and try taking chunks from any doc
        all_chunks_count = vector_store.count()
        if all_chunks_count == 0:
            raise ValueError("No study materials found. Please upload documents first.")
        # If specific doc_ids were passed but yielded nothing:
        raise ValueError(f"No content found for document IDs: {doc_ids}")

    # Build context string up to ~12000 characters to stay within model limits
    context_blocks: List[str] = []
    total_len = 0
    for chunk in chunks:
        t = chunk.get("text", "")
        meta = chunk.get("metadata", {})
        header = f"[{meta.get('filename', 'doc')}, Page {meta.get('page', 1)}, Section: {meta.get('section', 'General')}]"
        block = f"{header}\n{t}"
        if total_len + len(block) > 12000:
            break
        context_blocks.append(block)
        total_len += len(block)

    context_str = "\n\n".join(context_blocks)
    prompt = build_quiz_prompt(
        context=context_str,
        num_questions=num_questions,
        question_types=question_types,
    )

    llm = get_llm_provider()
    raw_response = llm.generate(prompt=prompt, system_instruction=QUIZ_SYSTEM_INSTRUCTION)
    json_str = _extract_json_block(raw_response)

    parsed_questions: List[QuizQuestion] = []
    try:
        data = json.loads(json_str)
        if isinstance(data, list):
            for item in data:
                src_data = item.get("source", {})
                source = Citation(
                    filename=str(src_data.get("filename", "Study Notes")),
                    page=src_data.get("page"),
                    section=src_data.get("section"),
                    text_excerpt=str(src_data.get("text_excerpt", "")),
                )
                parsed_questions.append(QuizQuestion(
                    question=item.get("question", "Untitled Question"),
                    question_type=item.get("question_type", "mcq"),
                    options=item.get("options"),
                    correct_answer=str(item.get("correct_answer", "")),
                    explanation=item.get("explanation", ""),
                    source=source,
                ))
    except (json.JSONDecodeError, TypeError, KeyError):
        # Fallback in case LLM response was not valid JSON
        pass

    # If parsing returned no questions (e.g. NoneProvider or invalid JSON), create fallback questions
    if not parsed_questions:
        fallback_filename = chunks[0].get("metadata", {}).get("filename", "Notes")
        parsed_questions.append(QuizQuestion(
            question=f"What is the primary topic covered in {fallback_filename}?",
            question_type="short_answer",
            options=None,
            correct_answer="Refer to the document summary.",
            explanation="Generated based on uploaded document.",
            source=Citation(
                filename=fallback_filename,
                page=1,
                section="Overview",
                text_excerpt=chunks[0].get("text", "")[:150],
            ),
        ))

    return QuizResponse(questions=parsed_questions[:num_questions])


def grade_quiz(quiz: QuizResponse, submission: QuizSubmission) -> QuizResult:
    """Evaluate submitted quiz answers, compute statistics, and identify weak topics.

    Args:
        quiz: QuizResponse object with the target questions and correct answers.
        submission: QuizSubmission mapping question indices to user answers.

    Returns:
        QuizResult containing scores, weak topics, and per-question evaluations.
    """
    total = len(quiz.questions)
    if total == 0:
        return QuizResult(score=0, total=0, percentage=0.0, weak_topics=[], details=[])

    score = 0
    weak_topics: List[str] = []
    details: List[Dict[str, Any]] = []

    for i, q in enumerate(quiz.questions):
        user_ans = submission.answers.get(i)
        if user_ans is None:
            # Check string index fallback
            user_ans = submission.answers.get(str(i), "")  # type: ignore

        user_ans_clean = str(user_ans).strip().lower()
        corr_ans_clean = str(q.correct_answer).strip().lower()

        # Check correctness based on question type
        is_correct = False
        if q.question_type == "mcq":
            # Direct option key match (e.g. 'a' == 'a') or text match
            if user_ans_clean == corr_ans_clean:
                is_correct = True
            elif q.options and corr_ans_clean.upper() in q.options:
                opt_val = q.options[corr_ans_clean.upper()].strip().lower()
                is_correct = (user_ans_clean == opt_val)
        elif q.question_type == "true_false":
            is_correct = (user_ans_clean == corr_ans_clean)
        else:  # short_answer
            # Substring or high-overlap match
            is_correct = (corr_ans_clean in user_ans_clean or user_ans_clean in corr_ans_clean) and len(user_ans_clean) > 0

        if is_correct:
            score += 1
        else:
            topic = q.source.section or q.source.filename
            if topic and topic not in weak_topics:
                weak_topics.append(topic)

        details.append({
            "question_index": i,
            "question": q.question,
            "user_answer": str(user_ans or "No Answer"),
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "explanation": q.explanation,
            "topic": q.source.section or "General",
        })

    percentage = round((score / total) * 100.0, 2)

    # Persist session in DocumentStore for overall study progress
    try:
        doc_store = get_document_store()
        doc_store.record_quiz_session({
            "score": score,
            "total": total,
            "percentage": percentage,
            "weak_topics": weak_topics,
            "timestamp": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass

    return QuizResult(
        score=score,
        total=total,
        percentage=percentage,
        weak_topics=weak_topics,
        details=details,
    )

