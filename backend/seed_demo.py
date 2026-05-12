"""
Seed Demo Data — Create sample students and pre-loaded NCERT content.
Run: python seed_demo.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))


SAMPLE_NCERT_CONTENT = [
    {
        "id": "math_ch1_0",
        "content": "Real Numbers: The Fundamental Theorem of Arithmetic states that every composite number can be expressed as a product of primes, and this factorisation is unique, apart from the order in which the prime factors occur. For example, 2 × 3 × 5 × 7 = 210.",
        "metadata": {"subject": "math", "chapter": "Real Numbers", "page": 1, "source": "ncert_math_ch1"},
    },
    {
        "id": "math_ch2_0",
        "content": "Polynomials: A polynomial p(x) of degree n has at most n zeros. A quadratic polynomial ax² + bx + c, a ≠ 0, can have at most 2 zeros. The sum of zeros = -b/a and the product of zeros = c/a.",
        "metadata": {"subject": "math", "chapter": "Polynomials", "page": 1, "source": "ncert_math_ch2"},
    },
    {
        "id": "math_ch3_0",
        "content": "Pair of Linear Equations in Two Variables: Two linear equations in the same two variables are called a pair of linear equations in two variables. The most general form is a₁x + b₁y + c₁ = 0, a₂x + b₂y + c₂ = 0. A pair of linear equations can be solved by Substitution Method, Elimination Method, or Cross-Multiplication Method.",
        "metadata": {"subject": "math", "chapter": "Linear Equations", "page": 1, "source": "ncert_math_ch3"},
    },
    {
        "id": "math_ch4_0",
        "content": "Quadratic Equations: A quadratic equation in the variable x is of the form ax² + bx + c = 0, where a, b, c are real numbers and a ≠ 0. The roots of ax² + bx + c = 0 are given by the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a. The discriminant D = b² - 4ac determines the nature of roots: if D > 0, two distinct real roots; if D = 0, two equal real roots; if D < 0, no real roots.",
        "metadata": {"subject": "math", "chapter": "Quadratic Equations", "page": 1, "source": "ncert_math_ch4"},
    },
    {
        "id": "math_ch5_0",
        "content": "Arithmetic Progressions: An arithmetic progression (AP) is a list of numbers where each term is obtained by adding a fixed number d (common difference) to the preceding term. The nth term: aₙ = a + (n-1)d. Sum of first n terms: Sₙ = n/2 [2a + (n-1)d] or Sₙ = n/2 (a + l), where l is the last term.",
        "metadata": {"subject": "math", "chapter": "Arithmetic Progressions", "page": 1, "source": "ncert_math_ch5"},
    },
    {
        "id": "math_ch8_0",
        "content": "Introduction to Trigonometry: In a right triangle ABC where angle B = 90°: sin A = opposite/hypotenuse, cos A = adjacent/hypotenuse, tan A = opposite/adjacent. Standard values: sin 30° = 1/2, cos 30° = √3/2, tan 45° = 1, sin 60° = √3/2, cos 60° = 1/2.",
        "metadata": {"subject": "math", "chapter": "Trigonometry", "page": 1, "source": "ncert_math_ch8"},
    },
    {
        "id": "science_ch1_0",
        "content": "Chemical Reactions and Equations: A chemical reaction involves the transformation of reactants into products. Types of chemical reactions: Combination reaction, Decomposition reaction, Displacement reaction, Double displacement reaction, Oxidation-Reduction (Redox) reaction. A balanced chemical equation has equal number of atoms of each element on both sides.",
        "metadata": {"subject": "science", "chapter": "Chemical Reactions", "page": 1, "source": "ncert_science_ch1"},
    },
    {
        "id": "science_ch2_0",
        "content": "Acids, Bases and Salts: Acids are substances that produce H⁺ ions in solution. Bases produce OH⁻ ions. The pH scale measures acidity/basicity: pH < 7 is acidic, pH = 7 is neutral, pH > 7 is basic. Common indicators: Litmus (red in acid, blue in base), Phenolphthalein (colorless in acid, pink in base).",
        "metadata": {"subject": "science", "chapter": "Acids Bases Salts", "page": 1, "source": "ncert_science_ch2"},
    },
    {
        "id": "science_ch6_0",
        "content": "Life Processes: Nutrition, respiration, transportation, and excretion are essential life processes. Photosynthesis occurs in the chloroplasts of green plants: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. This process requires sunlight and chlorophyll. In humans, digestion begins in the mouth with salivary amylase and continues through the stomach (HCl + pepsin) and small intestine.",
        "metadata": {"subject": "science", "chapter": "Life Processes", "page": 1, "source": "ncert_science_ch6"},
    },
    {
        "id": "science_ch12_0",
        "content": "Electricity: Electric current is the flow of electric charge. Ohm's Law: V = IR, where V is potential difference (volts), I is current (amperes), R is resistance (ohms). Resistors in series: R = R₁ + R₂ + R₃. Resistors in parallel: 1/R = 1/R₁ + 1/R₂ + 1/R₃. Power: P = VI = I²R = V²/R.",
        "metadata": {"subject": "science", "chapter": "Electricity", "page": 1, "source": "ncert_science_ch12"},
    },
    {
        "id": "science_ch10_0",
        "content": "Light – Reflection and Refraction: Laws of reflection: (i) angle of incidence = angle of reflection, (ii) incident ray, reflected ray, and normal lie in the same plane. Mirror formula: 1/v + 1/u = 1/f. Snell's Law of refraction: n₁ sin i = n₂ sin r. Lens formula: 1/v - 1/u = 1/f. Power of lens P = 1/f (in dioptres).",
        "metadata": {"subject": "science", "chapter": "Light", "page": 1, "source": "ncert_science_ch10"},
    },
    {
        "id": "science_ch9_0",
        "content": "Heredity and Evolution: Mendel's Laws of Inheritance — Law of Dominance, Law of Segregation, and Law of Independent Assortment. Genes are units of heredity located on chromosomes. In humans, sex is determined by sex chromosomes: XX (female) and XY (male). Evolution is the gradual change in inherited characteristics over generations.",
        "metadata": {"subject": "science", "chapter": "Heredity and Evolution", "page": 1, "source": "ncert_science_ch9"},
    },
]


async def seed():
    from app.models.database import init_db, async_session_factory
    from app.models.student import Student
    from app.services.rag import get_rag_service

    # Initialize DB
    await init_db()
    print("✅ Database initialized")

    # Create demo students
    async with async_session_factory() as session:
        from sqlalchemy import select
        result = await session.execute(select(Student))
        existing = result.scalars().all()

        if not existing:
            students = [
                Student(name="Aarav", preferred_language="hin_Deva"),
                Student(name="Priya", preferred_language="auto"),
                Student(name="Karthik", preferred_language="tam_Taml"),
                Student(name="Sneha", preferred_language="eng_Latn"),
                Student(name="Rahul", preferred_language="ben_Beng"),
            ]
            session.add_all(students)
            await session.commit()
            print(f"✅ Created {len(students)} demo students")
        else:
            print(f"ℹ️  {len(existing)} students already exist, skipping")

    # Seed RAG with sample NCERT content
    rag = get_rag_service()
    if rag.chunk_count == 0:
        rag.add_chunks(SAMPLE_NCERT_CONTENT)
        print(f"✅ Seeded {len(SAMPLE_NCERT_CONTENT)} NCERT chunks into ChromaDB")
    else:
        print(f"ℹ️  ChromaDB already has {rag.chunk_count} chunks, skipping")

    print("\n🎉 Demo data ready! Start the server with: uvicorn app.main:app --reload")


if __name__ == "__main__":
    asyncio.run(seed())
