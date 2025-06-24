from database import SessionLocal
import models
import json

def check_complaints_with_images():
    print("🔍 Checking complaints with images...")
    
    db = SessionLocal()
    
    # Get all complaints
    all_complaints = db.query(models.Complaint).all()
    print(f"📊 Total complaints: {len(all_complaints)}")
    
    # Check which ones have images
    complaints_with_images = []
    for complaint in all_complaints:
        if complaint.images and complaint.images != '[]' and complaint.images != '':
            try:
                images_list = json.loads(complaint.images) if isinstance(complaint.images, str) else complaint.images
                if images_list and len(images_list) > 0:
                    complaints_with_images.append((complaint, images_list))
            except:
                pass
    
    print(f"📸 Complaints with images: {len(complaints_with_images)}")
    
    for complaint, images in complaints_with_images:
        print(f"\n📋 Complaint: {complaint.title}")
        print(f"   ID: {complaint.id}")
        print(f"   Employee ID: {complaint.employee_id}")
        print(f"   Images: {images}")
        
    db.close()
    
    return len(complaints_with_images)

if __name__ == "__main__":
    count = check_complaints_with_images()
    if count == 0:
        print("\n⚠️  No complaints with images found in database!")
        print("💡 This means images are being uploaded but not saved to complaints correctly.") 