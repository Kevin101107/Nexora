import sys
from app.core.supabase import get_supabase

def create_verified_user():
    supabase = get_supabase()
    email = "test@example.com"
    password = "Password123!"
    
    # Try to check if user already exists
    try:
        # We can use auth.admin to list users or manage users
        print("Checking if user already exists...")
        res = supabase.auth.admin.list_users()
        existing_user = None
        for u in res:
            if u.email == email:
                existing_user = u
                break
        
        if existing_user:
            print(f"User {email} already exists with ID: {existing_user.id}")
            # Ensure profile exists in public.users
            profile = supabase.table("users").select("*").eq("id", existing_user.id).execute()
            if not profile.data:
                print("Profile missing in public.users. Creating it...")
                supabase.table("users").insert({
                    "id": existing_user.id,
                    "email": email,
                    "display_name": "Test User",
                    "xp": 0,
                    "level": 1,
                    "streak": 0,
                    "badges": [],
                    "favourite_subjects": [],
                    "daily_goal_minutes": 60
                }).execute()
                print("Profile created.")
            return
            
        print("Creating user...")
        user = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"display_name": "Test User"}
        })
        print(f"User created successfully! ID: {user.user.id}")
        
        # Trigger should handle creating the public.users record, 
        # but let's verify or insert if missing.
        profile = supabase.table("users").select("*").eq("id", user.user.id).execute()
        if not profile.data:
            supabase.table("users").insert({
                "id": user.user.id,
                "email": email,
                "display_name": "Test User",
                "xp": 0,
                "level": 1,
                "streak": 0,
                "badges": [],
                "favourite_subjects": [],
                "daily_goal_minutes": 60
            }).execute()
            print("Public profile created manually.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_verified_user()
