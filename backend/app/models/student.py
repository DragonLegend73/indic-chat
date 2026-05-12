"""
ORM Models — Student, Interaction, QuizAttempt, TopicMastery.
Includes per-topic mastery tracking for improved adaptive learning.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, func
)
from sqlalchemy.orm import relationship
from app.models.database import Base
from datetime import datetime


class Student(Base):
    """Student profile with language preference and adaptive state."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    preferred_language = Column(String(20), default="auto")  # "auto" | "hin_Deva" | etc.
    current_difficulty = Column(String(20), default="beginner")  # beginner | intermediate | advanced
    consecutive_correct = Column(Integer, default=0)
    consecutive_incorrect = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    interactions = relationship("Interaction", back_populates="student", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="student", cascade="all, delete-orphan")
    topic_mastery = relationship("TopicMastery", back_populates="student", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Student(id={self.id}, name='{self.name}', lang='{self.preferred_language}', difficulty='{self.current_difficulty}')>"


class Interaction(Base):
    """Log of every chat interaction."""
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    query = Column(Text, nullable=False)
    query_english = Column(Text)  # Translated query (for English-pivot)
    response = Column(Text, nullable=False)
    response_english = Column(Text)  # Response before translation
    language_detected = Column(String(20))  # e.g., "hin_Deva"
    response_language = Column(String(20))  # Language sent back
    intent = Column(String(50))  # ask_question, request_quiz, etc.
    topic = Column(String(100))  # algebra, photosynthesis, etc.
    difficulty = Column(String(20))  # Difficulty at time of interaction
    rag_chunks_used = Column(Integer, default=0)  # Number of RAG chunks retrieved
    audio_path = Column(String(255))  # Path to TTS audio file
    timestamp = Column(DateTime, default=func.now())

    # Relationships
    student = relationship("Student", back_populates="interactions")

    def __repr__(self):
        return f"<Interaction(id={self.id}, student={self.student_id}, lang='{self.language_detected}')>"


class QuizAttempt(Base):
    """Individual quiz question attempt."""
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    topic = Column(String(100), nullable=False)
    subject = Column(String(50))  # math, science, english
    question = Column(Text, nullable=False)
    options = Column(JSON)  # For MCQ: ["option1", "option2", ...]
    student_answer = Column(Text)
    correct_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    difficulty = Column(String(20), nullable=False)
    language = Column(String(20))  # Language of the quiz
    timestamp = Column(DateTime, default=func.now())

    # Relationships
    student = relationship("Student", back_populates="quiz_attempts")

    def __repr__(self):
        return f"<QuizAttempt(id={self.id}, topic='{self.topic}', correct={self.is_correct})>"


class TopicMastery(Base):
    """
    Per-topic mastery tracking for better adaptive learning.
    Tracks attempts, accuracy, and mastery level per topic per student.
    """
    __tablename__ = "topic_mastery"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    topic = Column(String(100), nullable=False)
    subject = Column(String(50))  # math, science, english
    total_attempts = Column(Integer, default=0)
    correct_attempts = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)  # 0.0 - 1.0
    mastery_level = Column(String(20), default="novice")  # novice | learning | proficient | mastered
    last_attempted = Column(DateTime, default=func.now())

    # Relationships
    student = relationship("Student", back_populates="topic_mastery")

    def update_mastery(self):
        """Recalculate accuracy and mastery level after an attempt."""
        if self.total_attempts > 0:
            self.accuracy = self.correct_attempts / self.total_attempts
        
        # Mastery thresholds (requires minimum attempts)
        if self.total_attempts < 3:
            self.mastery_level = "novice"
        elif self.accuracy >= 0.85:
            self.mastery_level = "mastered"
        elif self.accuracy >= 0.65:
            self.mastery_level = "proficient"
        elif self.accuracy >= 0.4:
            self.mastery_level = "learning"
        else:
            self.mastery_level = "novice"

    def __repr__(self):
        return f"<TopicMastery(student={self.student_id}, topic='{self.topic}', accuracy={self.accuracy:.0%})>"
