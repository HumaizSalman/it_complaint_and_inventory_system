from database import SessionLocal
import models

def get_usama_id():
    db = SessionLocal()
    employee = db.query(models.Employee).filter(models.Employee.email == 'usama@gmail.com').first()
    if employee:
        print(f"Usama Employee ID: {employee.id}")
        return employee.id
    else:
        print("Usama not found")
        return None

if __name__ == "__main__":
    get_usama_id() 