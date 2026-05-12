"""
Students Router — CRUD for student profiles.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.student import Student
from app.routers.auth import require_teacher

logger = logging.getLogger("indic-chat.students")
router = APIRouter(prefix="/students")


class StudentCreate(BaseModel):
    name: str
    preferred_language: str = "auto"


class StudentUpdate(BaseModel):
    name: str | None = None
    preferred_language: str | None = None


class StudentOut(BaseModel):
    id: int
    name: str
    preferred_language: str
    current_difficulty: str
    consecutive_correct: int
    consecutive_incorrect: int

    class Config:
        from_attributes = True


@router.get("")
async def list_students(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).order_by(Student.created_at.desc()))
    students = result.scalars().all()
    return [StudentOut.model_validate(s) for s in students]


@router.post("", status_code=201)
async def create_student(data: StudentCreate, db: AsyncSession = Depends(get_db)):
    student = Student(name=data.name, preferred_language=data.preferred_language)
    db.add(student)
    await db.flush()
    await db.refresh(student)
    return StudentOut.model_validate(student)


@router.get("/{student_id}")
async def get_student(student_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentOut.model_validate(student)


@router.patch("/{student_id}", dependencies=[Depends(require_teacher)])
async def update_student(student_id: int, data: StudentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if data.name is not None:
        student.name = data.name
    if data.preferred_language is not None:
        student.preferred_language = data.preferred_language

    return StudentOut.model_validate(student)


@router.delete("/{student_id}", status_code=204, dependencies=[Depends(require_teacher)])
async def delete_student(student_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await db.delete(student)
    await db.commit()
