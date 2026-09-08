"""In-memory store and realistic seed data for local demo mode."""
from copy import deepcopy
from threading import RLock

T = "2026-09-01T10:00:00+00:00"

def user(id, name, username, headline, skills, roles, availability="open", interests=None):
    return {"id": id, "email": f"{username}@nexora.local", "display_name": name, "username": username,
            "headline": headline, "bio": f"Student builder interested in shipping useful products with thoughtful teams.",
            "skills": skills, "roles": roles, "interests": interests or ["Hackathons", "Open Source"],
            "github_url": f"https://github.com/{username}", "linkedin_url": None,
            "availability": availability, "created_at": T, "updated_at": T}

SEED_DATA = {
 "users": [
  user("user-alice", "Maya Iyer", "maya", "Full-stack builder crafting accessible AI products",
       ["React", "Next.js", "TypeScript", "Python", "FastAPI", "Tailwind CSS", "PostgreSQL"],
       ["Frontend Engineer", "Full-Stack Engineer"], interests=["AI Agents", "Developer Tools", "EdTech", "Hackathons"]),
  user("user-bob", "Arjun Mehta", "arjun", "Backend and cloud engineer who likes reliable systems",
       ["Go", "Docker", "PostgreSQL", "Kubernetes", "FastAPI", "Python"], ["Backend Engineer", "DevOps / Infra"], "looking_for_project"),
  user("user-cora", "Zoya Khan", "zoya", "Product designer focused on inclusive mobile experiences",
       ["Figma", "User Research", "Prototyping", "Design Systems", "Tailwind CSS"], ["UI/UX Designer", "Product Manager"], "looking_for_hackathon"),
  user("user-diego", "Dev Patel", "devpatel", "ML engineer exploring useful, explainable AI",
       ["Python", "PyTorch", "FastAPI", "NLP", "PostgreSQL"], ["AI / ML Engineer", "Backend Engineer"]),
  user("user-erin", "Ananya Rao", "ananyarao", "Mobile developer building delightful cross-platform apps",
       ["React Native", "TypeScript", "Flutter", "Firebase", "Figma"], ["Mobile Developer", "Frontend Engineer"], "looking_for_project"),
  user("user-finn", "Kabir Shah", "kabirshah", "Product strategist connecting user needs to shippable scopes",
       ["Product Strategy", "User Research", "Analytics", "Figma", "SQL"], ["Product Manager", "UI/UX Designer"], "busy"),
 ],
 "projects": [
  {"id":"project-campus","owner_id":"user-alice","title":"CampusLoop","description":"A verified peer-to-peer exchange for students to lend equipment, share notes, and coordinate campus pickups.","category":"side_project","status":"recruiting","visibility":"public","created_at":T},
  {"id":"project-health","owner_id":"user-diego","title":"PulseCheck AI","description":"A privacy-aware wellness companion that helps students spot burnout patterns and find campus support early.","category":"hackathon","status":"recruiting","visibility":"public","created_at":T},
  {"id":"project-climate","owner_id":"user-cora","title":"GreenRoute","description":"A mobile trip planner that compares cost, time, and estimated emissions for everyday commutes.","category":"startup","status":"recruiting","visibility":"public","created_at":T},
  {"id":"project-devtools","owner_id":"user-bob","title":"Shipyard","description":"An open-source release dashboard with clear previews, checks, and rollback guidance.","category":"side_project","status":"active","visibility":"public","created_at":T},
 ],
 "project_roles": [
  {"id":"role-campus-backend","project_id":"project-campus","role_name":"Backend Engineer","description":"Build listing, messaging, and trust APIs.","required_skills":["FastAPI","Python","PostgreSQL"],"slots":1,"filled_slots":0,"status":"open","created_at":T},
  {"id":"role-campus-design","project_id":"project-campus","role_name":"UI/UX Designer","description":"Refine marketplace flows and the design system.","required_skills":["Figma","User Research","Design Systems"],"slots":1,"filled_slots":0,"status":"open","created_at":T},
  {"id":"role-health-frontend","project_id":"project-health","role_name":"Frontend Engineer","description":"Create the accessible wellness dashboard.","required_skills":["React","Next.js","TypeScript","Tailwind CSS"],"slots":2,"filled_slots":1,"status":"open","created_at":T},
  {"id":"role-health-design","project_id":"project-health","role_name":"UI/UX Designer","description":"Design supportive check-in journeys.","required_skills":["Figma","User Research","Prototyping"],"slots":1,"filled_slots":0,"status":"open","created_at":T},
  {"id":"role-climate-mobile","project_id":"project-climate","role_name":"Mobile Developer","description":"Own the cross-platform commute experience.","required_skills":["React Native","TypeScript","Figma"],"slots":1,"filled_slots":0,"status":"open","created_at":T},
  {"id":"role-climate-fullstack","project_id":"project-climate","role_name":"Full-Stack Engineer","description":"Build route comparison and saved trips.","required_skills":["React","TypeScript","Python","PostgreSQL"],"slots":1,"filled_slots":0,"status":"open","created_at":T},
  {"id":"role-shipyard-devops","project_id":"project-devtools","role_name":"DevOps Engineer","description":"Develop deployment integrations.","required_skills":["Docker","Kubernetes","Go"],"slots":1,"filled_slots":1,"status":"filled","created_at":T},
 ],
 "project_members": [
  {"id":"m1","project_id":"project-campus","user_id":"user-alice","role_id":None,"member_role":"Owner","joined_at":T},
  {"id":"m2","project_id":"project-campus","user_id":"user-erin","role_id":None,"member_role":"Member","joined_at":T},
  {"id":"m3","project_id":"project-health","user_id":"user-diego","role_id":None,"member_role":"Owner","joined_at":T},
  {"id":"m4","project_id":"project-health","user_id":"user-alice","role_id":"role-health-frontend","member_role":"Member","joined_at":T},
  {"id":"m5","project_id":"project-climate","user_id":"user-cora","role_id":None,"member_role":"Owner","joined_at":T},
  {"id":"m6","project_id":"project-devtools","user_id":"user-bob","role_id":None,"member_role":"Owner","joined_at":T},
  {"id":"m7","project_id":"project-devtools","user_id":"user-finn","role_id":"role-shipyard-devops","member_role":"Member","joined_at":T},
 ],
 "project_membership_history": [
  {"id":"pmh-1","project_id":"project-campus","user_id":"user-alice","role_id":None,"role_name":"Project Owner","joined_at":T,"left_at":None,"status":"active"},
  {"id":"pmh-2","project_id":"project-campus","user_id":"user-erin","role_id":None,"role_name":"Squad Member","joined_at":T,"left_at":None,"status":"active"},
  {"id":"pmh-3","project_id":"project-health","user_id":"user-diego","role_id":None,"role_name":"Project Owner","joined_at":T,"left_at":None,"status":"active"},
  {"id":"pmh-4","project_id":"project-health","user_id":"user-alice","role_id":"role-health-frontend","role_name":"Frontend Engineer","joined_at":T,"left_at":None,"status":"active"},
  {"id":"pmh-5","project_id":"project-climate","user_id":"user-cora","role_id":None,"role_name":"Project Owner","joined_at":T,"left_at":None,"status":"active"},
  {"id":"pmh-6","project_id":"project-devtools","user_id":"user-bob","role_id":None,"role_name":"Project Owner","joined_at":T,"left_at":None,"status":"active"},
  {"id":"pmh-7","project_id":"project-devtools","user_id":"user-finn","role_id":"role-shipyard-devops","role_name":"DevOps Engineer","joined_at":T,"left_at":None,"status":"active"},
 ],
 "project_applications": [
  {"id":"app1","project_id":"project-climate","role_id":"role-climate-fullstack","applicant_id":"user-alice","message":"I can build the comparison UI and connect it to a lightweight Python service.","status":"pending","created_at":T},
  {"id":"app2","project_id":"project-campus","role_id":"role-campus-backend","applicant_id":"user-bob","message":"The trust and messaging APIs fit my backend experience.","status":"pending","created_at":T},
  {"id":"app3","project_id":"project-climate","role_id":"role-climate-mobile","applicant_id":"user-erin","message":"I would love to lead the React Native client.","status":"accepted","created_at":T},
  {"id":"app4","project_id":"project-health","role_id":"role-health-design","applicant_id":"user-finn","message":"I can help map user journeys and run quick usability tests.","status":"rejected","created_at":T},
  {"id":"app5","project_id":"project-campus","role_id":"role-campus-design","applicant_id":"user-cora","message":"I started an initial UI kit before my schedule shifted.","status":"withdrawn","created_at":T},
 ],
 "teammate_requests": [
  {"id":"req1","sender_id":"user-cora","receiver_id":"user-alice","project_id":"project-climate","role_id":"role-climate-fullstack","message":"Your full-stack background looks ideal for GreenRoute. Want to build with us?","status":"pending","created_at":T},
  {"id":"req2","sender_id":"user-alice","receiver_id":"user-diego","project_id":"project-campus","role_id":None,"message":"Would you advise us on the trust scoring service?","status":"pending","created_at":T},
  {"id":"req3","sender_id":"user-bob","receiver_id":"user-alice","project_id":"project-devtools","role_id":None,"message":"Thanks for helping test our release preview flow.","status":"accepted","created_at":T},
  {"id":"req4","sender_id":"user-diego","receiver_id":"user-bob","project_id":"project-health","role_id":None,"message":"Would you like to help scale the data pipelines?","status":"declined","created_at":T},
  {"id":"req5","sender_id":"user-alice","receiver_id":"user-finn","project_id":"project-campus","role_id":"role-campus-design","message":"Inviting you to design the study and exchange dashboard.","status":"cancelled","created_at":T},
 ],
 "milestones": [
  {"id":"ms-campus-mvp","project_id":"project-campus","title":"MVP Prototype","description":"Core exchange and listing functionality for initial student testing","due_date":"2026-09-25","status":"active","created_by":"user-alice","created_at":T,"updated_at":T},
  {"id":"ms-campus-beta","project_id":"project-campus","title":"Campus Beta Launch","description":"Campus-wide rollout with verified student ambassadors","due_date":"2026-10-15","status":"planned","created_by":"user-alice","created_at":T,"updated_at":T},
  {"id":"ms-health-demo","project_id":"project-health","title":"Hackathon Pitch Demo","description":"End-to-end check-in flow with explainable insights","due_date":"2026-09-15","status":"active","created_by":"user-diego","created_at":T,"updated_at":T},
  {"id":"ms-dev-v1","project_id":"project-devtools","title":"v1.0 Release","description":"Production-ready preview and rollback manager","due_date":"2026-09-30","status":"active","created_by":"user-bob","created_at":T,"updated_at":T},
 ],
 "tasks": [
  {"id":"task-1","project_id":"project-campus","title":"Design peer exchange browsing UI","description":"Create accessible cards for equipment listings","status":"done","priority":"high","assignee_id":"user-erin","created_by":"user-alice","completed_by":"user-erin","completed_at":"2026-09-05T14:30:00+00:00","milestone_id":"ms-campus-mvp","due_date":"2026-09-10","created_at":T,"updated_at":T},
  {"id":"task-2","project_id":"project-campus","title":"Build listing creation and photo modal","description":"Interactive form to publish new item listings","status":"in_progress","priority":"high","assignee_id":"user-erin","created_by":"user-alice","completed_by":None,"completed_at":None,"milestone_id":"ms-campus-mvp","due_date":"2026-09-18","created_at":T,"updated_at":T},
  {"id":"task-3","project_id":"project-campus","title":"Implement reservation backend APIs","description":"FastAPI endpoints with student verification","status":"todo","priority":"high","assignee_id":"user-alice","created_by":"user-alice","completed_by":None,"completed_at":None,"milestone_id":"ms-campus-mvp","due_date":"2026-09-22","created_at":T,"updated_at":T},
  {"id":"task-4","project_id":"project-campus","title":"Setup pickup location coordination","description":"Designate safe meeting hubs on campus","status":"todo","priority":"medium","assignee_id":None,"created_by":"user-alice","completed_by":None,"completed_at":None,"milestone_id":"ms-campus-beta","due_date":"2026-10-01","created_at":T,"updated_at":T},
  {"id":"task-5","project_id":"project-health","title":"Build questionnaire check-in screen","description":"Daily student stress and sleep monitor form","status":"done","priority":"high","assignee_id":"user-alice","created_by":"user-diego","completed_by":"user-alice","completed_at":"2026-09-05T10:00:00+00:00","milestone_id":"ms-health-demo","due_date":"2026-09-12","created_at":T,"updated_at":T},
  {"id":"task-6","project_id":"project-health","title":"Train sentiment analysis baseline","description":"Evaluate local lightweight NLP pipeline","status":"in_progress","priority":"high","assignee_id":"user-diego","created_by":"user-diego","completed_by":None,"completed_at":None,"milestone_id":"ms-health-demo","due_date":"2026-09-14","created_at":T,"updated_at":T},
  {"id":"task-7","project_id":"project-devtools","title":"Implement release rollback operator","description":"Automated safe deployment rollbacks","status":"done","priority":"high","assignee_id":"user-finn","created_by":"user-bob","completed_by":"user-finn","completed_at":"2026-09-05T12:00:00+00:00","milestone_id":"ms-dev-v1","due_date":"2026-09-20","created_at":T,"updated_at":T},
  {"id":"task-8","project_id":"project-devtools","title":"Release preview UI dashboard","description":"Real-time summary of pipeline build states","status":"in_progress","priority":"medium","assignee_id":"user-bob","created_by":"user-bob","completed_by":None,"completed_at":None,"milestone_id":"ms-dev-v1","due_date":"2026-09-25","created_at":T,"updated_at":T},
 ],
 "project_activity": [
  {"id":"act-1","project_id":"project-campus","actor_id":"user-alice","action_type":"milestone_created","entity_type":"milestone","entity_id":"ms-campus-mvp","metadata":{"milestone_title":"MVP Prototype"},"created_at":"2026-09-01T10:10:00+00:00"},
  {"id":"act-2","project_id":"project-campus","actor_id":"user-alice","action_type":"task_created","entity_type":"task","entity_id":"task-1","metadata":{"task_title":"Design peer exchange browsing UI","status":"todo","priority":"high"},"created_at":"2026-09-01T10:15:00+00:00"},
  {"id":"act-3","project_id":"project-campus","actor_id":"user-alice","action_type":"task_assigned","entity_type":"task","entity_id":"task-1","metadata":{"task_title":"Design peer exchange browsing UI","assignee_id":"user-erin","assignee_name":"Ananya Rao"},"created_at":"2026-09-01T10:16:00+00:00"},
  {"id":"act-4","project_id":"project-campus","actor_id":"user-erin","action_type":"task_status_changed","entity_type":"task","entity_id":"task-1","metadata":{"task_title":"Design peer exchange browsing UI","old_status":"in_progress","new_status":"done"},"created_at":"2026-09-05T14:30:00+00:00"},
  {"id":"act-5","project_id":"project-campus","actor_id":"user-erin","action_type":"task_completed","entity_type":"task","entity_id":"task-1","metadata":{"task_title":"Design peer exchange browsing UI"},"created_at":"2026-09-05T14:30:00+00:00"},
  {"id":"act-6","project_id":"project-campus","actor_id":"user-alice","action_type":"task_created","entity_type":"task","entity_id":"task-2","metadata":{"task_title":"Build listing creation and photo modal","status":"todo","priority":"high"},"created_at":"2026-09-06T09:00:00+00:00"},
  {"id":"act-7","project_id":"project-campus","actor_id":"user-erin","action_type":"task_status_changed","entity_type":"task","entity_id":"task-2","metadata":{"task_title":"Build listing creation and photo modal","old_status":"todo","new_status":"in_progress"},"created_at":"2026-09-06T11:00:00+00:00"},
 ],
 "notifications": [
  {"id":"notif-1","user_id":"user-alice","actor_id":"user-erin","type":"task_completed","title":"Task Completed","message":"Ananya Rao completed task 'Design peer exchange browsing UI' in CampusLoop.","entity_type":"task","entity_id":"task-1","project_id":"project-campus","action_url":"/projects/project-campus/workspace","metadata":{"task_title":"Design peer exchange browsing UI"},"is_read":False,"created_at":"2026-09-05T14:30:00+00:00","read_at":None},
  {"id":"notif-2","user_id":"user-alice","actor_id":"user-cora","type":"team_invitation_received","title":"New Teammate Invitation","message":"Zoya Khan invited you to join GreenRoute as Full-Stack Engineer.","entity_type":"teammate_request","entity_id":"req1","project_id":"project-climate","action_url":"/requests","metadata":{},"is_read":False,"created_at":"2026-09-04T12:00:00+00:00","read_at":None},
  {"id":"notif-3","user_id":"user-alice","actor_id":"user-diego","type":"task_assigned","title":"Task Assigned","message":"You were assigned 'Build questionnaire check-in screen' in PulseCheck AI.","entity_type":"task","entity_id":"task-5","project_id":"project-health","action_url":"/projects/project-health/workspace","metadata":{"task_title":"Build questionnaire check-in screen"},"is_read":True,"created_at":"2026-09-02T10:00:00+00:00","read_at":"2026-09-02T11:00:00+00:00"},
 ],
 "notification_preferences": [
  {"id":"user-alice","user_id":"user-alice","team_updates":True,"task_updates":True,"milestone_updates":True,"project_updates":True,"created_at":T,"updated_at":T},
 ],
}

class Result:
 def __init__(self, data=None, count=None): self.data=data or []; self.count=len(self.data) if count is None else count

class Query:
 def __init__(self, db, name): self.database=db; self.table_name=name; self.action="select"; self.payload=None; self.filters=[]; self.order_column=None; self.order_desc=False; self.with_count=False
 def select(self, columns="*", count=None): self.action="select"; self.with_count=count is not None; return self
 def insert(self, data): self.action="insert"; self.payload=data; return self
 def upsert(self, data): self.action="upsert"; self.payload=data; return self
 def update(self, data): self.action="update"; self.payload=data; return self
 def delete(self): self.action="delete"; return self
 def eq(self, column, value): self.filters.append(("eq",column,value)); return self
 def neq(self, column, value): self.filters.append(("neq",column,value)); return self
 def or_(self, expression): self.filters.append(("or",expression)); return self
 def order(self, column, desc=False): self.order_column=column; self.order_desc=desc; return self
 def _matches(self,row):
  for kind,column,*values in self.filters:
   if kind=="eq" and row.get(column)!=values[0]: return False
   if kind=="neq" and row.get(column)==values[0]: return False
   if kind=="or":
    choices=[x.split(".eq.",1) for x in column.split(",")]
    if not any(len(x)==2 and str(row.get(x[0]))==x[1] for x in choices): return False
  return True
 def execute(self):
  with self.database.lock:
   table=self.database.tables.setdefault(self.table_name,[]); items=self.payload if isinstance(self.payload,list) else [self.payload]
   if self.action=="insert": table.extend(deepcopy(items)); return Result(deepcopy(items))
   if self.action=="upsert":
    for item in items:
     old=next((r for r in table if r.get("id")==item.get("id")),None); old.update(item) if old is not None else table.append(deepcopy(item))
    return Result(deepcopy(items))
   indices=[i for i,r in enumerate(table) if self._matches(r)]
   if self.action=="update":
    for i in indices: table[i].update(self.payload)
   elif self.action=="delete":
    deleted=[deepcopy(table[i]) for i in indices]
    for i in reversed(indices): del table[i]
    return Result(deleted)
   rows=[deepcopy(table[i]) for i in indices]
   if self.order_column: rows.sort(key=lambda r:r.get(self.order_column) or "",reverse=self.order_desc)
   return Result(rows,len(rows) if self.with_count else None)

class LocalDatabase:
 def __init__(self): self.tables=deepcopy(SEED_DATA); self.lock=RLock()
 def table(self,name): return Query(self,name)

_database=LocalDatabase()
def get_database(): return _database
