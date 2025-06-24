from database import SessionLocal
import models

def list_employees():
    db = SessionLocal()
    employees = db.query(models.Employee).all()
    print('Available employees:')
    for emp in employees[:5]:
        print(f'  - {emp.name} ({emp.email})')
    db.close()

if __name__ == "__main__":
    list_employees() 