"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import json
from pathlib import Path
from pymongo import MongoClient

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(current_dir, "static")), name="static")

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['mergington_school']
activities_collection = db['activities']

# Initialize database with data from JSON file
@app.on_event("startup")
async def init_db():
    if activities_collection.count_documents({}) == 0:
        try:
            with open(os.path.join(current_dir, 'initial_data.json'), 'r') as f:
                initial_data = json.load(f)
                if initial_data:
                    activities_collection.insert_many(initial_data)
                    print(f"Successfully loaded {len(initial_data)} activities into database")
        except Exception as e:
            print(f"Error loading initial data: {e}")

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

@app.get("/activities")
def get_activities():
    activities = {}
    for doc in activities_collection.find():
        name = doc.pop('_id')  # Remove _id and use it as the key
        activities[name] = doc
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    # Validate activity exists
    activity = activities_collection.find_one({"_id": activity_name})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Already signed up for this activity")
    
    # Validate email format
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email format")
    # Validate email domain
    if not email.endswith("@mergington.edu"):
        raise HTTPException(status_code=400, detail="Email must be from mergington.edu")
    # Validate email is not empty
    if not email:
        raise HTTPException(status_code=400, detail="Email cannot be empty")
    # Validate email is not too long
    if len(email) > 50:
        raise HTTPException(status_code=400, detail="Email is too long")
    # Validate email is not too short
    if len(email) < 5:
        raise HTTPException(status_code=400, detail="Email is too short")

    # Add student
    result = activities_collection.update_one(
        {"_id": activity_name},
        {"$push": {"participants": email}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to add participant")
    
    return {"message": f"Signed up {email} for {activity_name}"}


@app.post("/activities/{activity_name}/remove")
def remove_participant(activity_name: str, email: str):
    """Remove a participant from an activity"""
    # Validate activity exists
    activity = activities_collection.find_one({"_id": activity_name})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Validate participant is in the activity
    if email not in activity["participants"]:
        raise HTTPException(status_code=400, detail="Participant not found in this activity")

    # Remove participant
    result = activities_collection.update_one(
        {"_id": activity_name},
        {"$pull": {"participants": email}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to remove participant")
        
    return {"message": f"Removed {email} from {activity_name}"}
